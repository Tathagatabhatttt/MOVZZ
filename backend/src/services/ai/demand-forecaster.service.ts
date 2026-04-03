/**
 * ═══════════════════════════════════════════════════════════
 *  MOVZZY DEMAND FORECASTER — AI Week 3
 * ═══════════════════════════════════════════════════════════
 *  Historical pattern matching to predict rides per zone/hour.
 *  No ML model — pure 4-week rolling average with multipliers.
 *
 *  Demand levels → price multipliers (hard cap in fare.service):
 *    LOW / NORMAL  → ×1.0
 *    HIGH          → ×1.08
 *    VERY_HIGH     → ×1.15
 * ═══════════════════════════════════════════════════════════
 */

import prisma from '../../config/database';
import { getOrCompute, invalidate, CacheKeys, TTL } from './cache.service';

// ─── Types ───────────────────────────────────────────────

export type DemandLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';

export interface DemandForecastResult {
  zone: string;
  forecastHour: Date;
  predictedRides: number;
  confidenceLow: number;
  confidenceHigh: number;
  demandLevel: DemandLevel;
  demandMultiplier: number;
}

// ─── Constants ───────────────────────────────────────────

const DEMAND_MULTIPLIERS: Record<DemandLevel, number> = {
  LOW:       1.0,
  NORMAL:    1.0,
  HIGH:      1.08,
  VERY_HIGH: 1.15,
};

// Weeks of history to look back
const LOOKBACK_WEEKS = 4;

// ─── Core forecast ───────────────────────────────────────

/**
 * forecastDemand — Returns predicted ride count for a zone at a given hour.
 *
 * Flow:
 *  1. Check DemandForecast table for a stored forecast (populated by nightly worker)
 *  2. If none, compute from Booking history (last 4 weeks, same day-of-week ± 1h)
 *  3. Cache in Redis for 15 min to avoid repeated DB reads
 */
export async function forecastDemand(
  zone: string,
  targetHour: Date,
): Promise<DemandForecastResult> {
  const hour = targetHour.getHours();
  const cacheKey = CacheKeys.hourlyDemand(zone, hour);

  return getOrCompute<DemandForecastResult>(cacheKey, 15 * 60, async () => {
    // 1. Check stored forecast first (set by nightly worker)
    const stored = await prisma.demandForecast.findFirst({
      where: {
        zone,
        forecastHour: {
          gte: startOfHour(targetHour),
          lt:  endOfHour(targetHour),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (stored) {
      return buildResult(zone, targetHour, stored.predictedRides, stored.confidenceLow, stored.confidenceHigh);
    }

    // 2. Compute from booking history
    return computeFromHistory(zone, targetHour);
  });
}

/**
 * getDemandMultiplierForZone — Lightweight wrapper used by fare.service.ts.
 * Returns just the multiplier float; gracefully returns 1.0 on any error.
 */
export async function getDemandMultiplierForZone(
  zone: string,
  hour: number,
): Promise<number> {
  try {
    const targetHour = new Date();
    targetHour.setHours(hour, 0, 0, 0);
    const result = await forecastDemand(zone, targetHour);
    return result.demandMultiplier;
  } catch {
    return 1.0; // graceful degradation
  }
}

/**
 * invalidateDemandCache — Called by nightly worker after storing fresh forecasts.
 */
export async function invalidateDemandCache(zone: string, hour: number): Promise<void> {
  await invalidate(CacheKeys.hourlyDemand(zone, hour));
}

// ─── History-based computation ───────────────────────────

async function computeFromHistory(
  zone: string,
  targetHour: Date,
): Promise<DemandForecastResult> {
  const dayOfWeek = targetHour.getDay(); // 0 = Sun, 6 = Sat
  const hour = targetHour.getHours();
  const now = new Date();

  // Build date ranges for last 4 same-day-of-week occurrences
  const ridesPerDay: number[] = [];

  for (let w = 1; w <= LOOKBACK_WEEKS; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (w * 7));
    // Find the matching day-of-week in that week
    const diff = (dayOfWeek - weekStart.getDay() + 7) % 7;
    const targetDay = new Date(weekStart);
    targetDay.setDate(weekStart.getDate() + diff);
    targetDay.setHours(hour - 1, 0, 0, 0);

    const windowEnd = new Date(targetDay);
    windowEnd.setHours(hour + 1, 59, 59, 999);

    const count = await prisma.booking.count({
      where: {
        createdAt: { gte: targetDay, lte: windowEnd },
        // Filter by zone using contextSnapshot JSON field
        contextSnapshot: {
          path: ['zone'],
          equals: zone,
        },
        state: { in: ['COMPLETED', 'IN_PROGRESS', 'CONFIRMED'] },
      },
    });

    ridesPerDay.push(count);
  }

  // Average across sampled days
  const avgRides = ridesPerDay.length > 0
    ? ridesPerDay.reduce((s, n) => s + n, 0) / ridesPerDay.length
    : 0;

  // Confidence interval: ±20% of avg (simple static, no ML)
  const confidenceLow  = Math.max(0, avgRides * 0.8);
  const confidenceHigh = avgRides * 1.2;

  return buildResult(zone, targetHour, avgRides, confidenceLow, confidenceHigh);
}

// ─── Helpers ─────────────────────────────────────────────

function buildResult(
  zone: string,
  forecastHour: Date,
  predictedRides: number,
  confidenceLow: number,
  confidenceHigh: number,
): DemandForecastResult {
  const demandLevel = classifyDemand(predictedRides);
  return {
    zone,
    forecastHour,
    predictedRides,
    confidenceLow,
    confidenceHigh,
    demandLevel,
    demandMultiplier: DEMAND_MULTIPLIERS[demandLevel],
  };
}

function classifyDemand(rides: number): DemandLevel {
  if (rides > 15) return 'VERY_HIGH';
  if (rides > 7)  return 'HIGH';
  if (rides > 3)  return 'NORMAL';
  return 'LOW';
}

function startOfHour(d: Date): Date {
  const t = new Date(d);
  t.setMinutes(0, 0, 0);
  return t;
}

function endOfHour(d: Date): Date {
  const t = new Date(d);
  t.setMinutes(59, 59, 999);
  return t;
}
