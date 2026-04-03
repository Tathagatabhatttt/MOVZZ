/**
 * ═══════════════════════════════════════════════════════════
 *  MOVZZY User Personalization Service — AI Week 4 (AI-20)
 * ═══════════════════════════════════════════════════════════
 *
 *  Learns user preferences from ride history.
 *  Used by quotes.controller.ts to boost preferred providers +3 pts.
 */

import prisma from '../../config/database';

export interface UserPreferences {
    preferredMode: string | null;           // most frequent COMPLETED transport mode
    preferredProviderIds: string[];         // providers used ≥2 times successfully
    surgeAvoidant: boolean;                 // true if user never booked at HIGH/VERY_HIGH demand
    totalRides: number;                     // total completed rides for context
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
        const recentBookings = await prisma.booking.findMany({
            where: { userId, state: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                transportMode: true,
                providerId: true,
                contextSnapshot: true,
            },
        });

        if (recentBookings.length === 0) {
            return { preferredMode: null, preferredProviderIds: [], surgeAvoidant: false, totalRides: 0 };
        }

        // Most frequent transport mode
        const modeCounts: Record<string, number> = {};
        for (const b of recentBookings) {
            if (b.transportMode) {
                modeCounts[b.transportMode] = (modeCounts[b.transportMode] || 0) + 1;
            }
        }
        const preferredMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        // Providers used ≥2 times
        const providerCounts: Record<string, number> = {};
        for (const b of recentBookings) {
            if (b.providerId) {
                providerCounts[b.providerId] = (providerCounts[b.providerId] || 0) + 1;
            }
        }
        const preferredProviderIds = Object.entries(providerCounts)
            .filter(([, count]) => count >= 2)
            .map(([id]) => id);

        // Surge avoidant: user has never booked during HIGH/VERY_HIGH demand
        let surgeAvoidant = recentBookings.length >= 5; // only meaningful with enough data
        for (const b of recentBookings) {
            const snap = b.contextSnapshot as any;
            const demandLevel = snap?.demandLevel ?? snap?.demand_level;
            if (demandLevel === 'HIGH' || demandLevel === 'VERY_HIGH') {
                surgeAvoidant = false;
                break;
            }
        }

        return {
            preferredMode,
            preferredProviderIds,
            surgeAvoidant,
            totalRides: recentBookings.length,
        };
    } catch {
        // Graceful fallback — personalization is non-blocking
        return { preferredMode: null, preferredProviderIds: [], surgeAvoidant: false, totalRides: 0 };
    }
}
