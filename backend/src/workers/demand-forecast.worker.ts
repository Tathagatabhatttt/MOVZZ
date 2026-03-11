/**
 * ═══════════════════════════════════════════════════════════
 *  DEMAND FORECAST WORKER — AI Week 3
 * ═══════════════════════════════════════════════════════════
 *  Runs at 10 PM via BullMQ CRON. For each Chennai zone × 24h:
 *   1. Computes demand forecast from 4-week booking history
 *   2. Upserts result into DemandForecast table
 *   3. Invalidates Redis cache so next quote request recomputes
 *   4. Detects shortage zones and queues driver nudge SMS
 *
 *  Triggered by:  index.ts (schedules CRON on startup)
 * ═══════════════════════════════════════════════════════════
 */

import { Worker } from 'bullmq';
import { connection, smsQueue } from '../config/queues';
import prisma from '../config/database';
import { forecastDemand, invalidateDemandCache } from '../services/ai/demand-forecaster.service';

// All Chennai zones from context-builder.service.ts
const CHENNAI_ZONES = [
  'AIRPORT',
  'IT_CORRIDOR',
  'CENTRAL',
  'NORTH_CHENNAI',
  'SOUTH_CHENNAI',
  'SUBURBS',
  'UNKNOWN',
];

// Shortage threshold: if predictedRides × this factor > active providers, send nudge
const SHORTAGE_RATIO = 0.5; // more than 50% of providers needed = shortage

new Worker('demand-forecast', async () => {
  console.log('[DemandForecast] Starting nightly 24h forecast generation...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  let stored = 0;
  const shortageZones: Array<{ zone: string; hour: number; predictedRides: number }> = [];

  for (const zone of CHENNAI_ZONES) {
    for (let hour = 0; hour < 24; hour++) {
      const forecastHour = new Date(tomorrow);
      forecastHour.setHours(hour, 0, 0, 0);

      try {
        const result = await forecastDemand(zone, forecastHour);

        // Upsert into DemandForecast table
        await prisma.demandForecast.upsert({
          where: { zone_forecastHour: { zone, forecastHour } },
          create: {
            zone,
            forecastHour,
            predictedRides: result.predictedRides,
            confidenceLow:  result.confidenceLow,
            confidenceHigh: result.confidenceHigh,
          },
          update: {
            predictedRides: result.predictedRides,
            confidenceLow:  result.confidenceLow,
            confidenceHigh: result.confidenceHigh,
          },
        });

        // Invalidate Redis so next quote request reads fresh DB value
        await invalidateDemandCache(zone, hour);
        stored++;

        // Track shortage zones for driver nudge
        if (result.demandLevel === 'HIGH' || result.demandLevel === 'VERY_HIGH') {
          shortageZones.push({ zone, hour, predictedRides: result.predictedRides });
        }
      } catch (err) {
        console.error(`[DemandForecast] Failed for zone=${zone} hour=${hour}:`, err);
      }
    }
  }

  console.log(`[DemandForecast] Stored ${stored}/${CHENNAI_ZONES.length * 24} forecasts.`);

  // ─── Driver shortage nudge ──────────────────────────────
  // For peak shortage windows, queue SMS to active providers
  if (shortageZones.length > 0) {
    const activeProviderCount = await prisma.provider.count({ where: { active: true } });
    const perZoneCapacity = Math.max(1, Math.floor(activeProviderCount / CHENNAI_ZONES.length));

    // Consolidate consecutive shortage hours into windows
    const windows = consolidateWindows(shortageZones);

    for (const window of windows.slice(0, 5)) { // max 5 nudge messages per night
      const zoneLabel = formatZoneLabel(window.zone);
      const timeRange = `${padHour(window.startHour)}–${padHour(window.endHour)} AM/PM`;
      const message   = `MOVZZ: High demand expected in ${zoneLabel} tomorrow ${timeRange}. Come online for a ₹100 bonus per ride!`;

      // Check if shortage is significant (predicted > perZoneCapacity × SHORTAGE_RATIO)
      if (window.peakRides > perZoneCapacity * SHORTAGE_RATIO) {
        await smsQueue.add(`nudge-${window.zone}-${window.startHour}`, {
          to: 'BULK_ACTIVE_PROVIDERS', // sms.worker.ts handles broadcast
          message,
          type: 'driver_nudge',
          zone: window.zone,
        }).catch(() => {});
      }
    }

    console.log(`[DemandForecast] Queued driver nudges for ${Math.min(windows.length, 5)} shortage windows.`);
  }

}, { connection, concurrency: 1 });

console.log('[Worker] demand-forecast worker started');

// ─── Helpers ─────────────────────────────────────────────

interface ShortageWindow {
  zone: string;
  startHour: number;
  endHour: number;
  peakRides: number;
}

function consolidateWindows(
  zones: Array<{ zone: string; hour: number; predictedRides: number }>
): ShortageWindow[] {
  const byZone = new Map<string, Array<{ hour: number; rides: number }>>();
  for (const z of zones) {
    if (!byZone.has(z.zone)) byZone.set(z.zone, []);
    byZone.get(z.zone)!.push({ hour: z.hour, rides: z.predictedRides });
  }

  const windows: ShortageWindow[] = [];
  for (const [zone, hours] of byZone.entries()) {
    hours.sort((a, b) => a.hour - b.hour);
    let start = hours[0].hour;
    let end   = hours[0].hour;
    let peak  = hours[0].rides;
    for (let i = 1; i < hours.length; i++) {
      if (hours[i].hour <= end + 2) {
        end  = hours[i].hour;
        peak = Math.max(peak, hours[i].rides);
      } else {
        windows.push({ zone, startHour: start, endHour: end, peakRides: peak });
        start = hours[i].hour;
        end   = hours[i].hour;
        peak  = hours[i].rides;
      }
    }
    windows.push({ zone, startHour: start, endHour: end, peakRides: peak });
  }
  return windows;
}

function formatZoneLabel(zone: string): string {
  const labels: Record<string, string> = {
    AIRPORT:      'Chennai Airport',
    IT_CORRIDOR:  'OMR/IT Corridor',
    CENTRAL:      'Central Chennai',
    NORTH_CHENNAI:'North Chennai',
    SOUTH_CHENNAI:'South Chennai',
    SUBURBS:      'Chennai Suburbs',
    UNKNOWN:      'Chennai',
  };
  return labels[zone] ?? zone;
}

function padHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${ampm}`;
}
