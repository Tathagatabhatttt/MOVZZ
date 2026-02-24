/**
 * ═══════════════════════════════════════════════════════════
 *  RIDE SEARCH CONTROLLER
 *  Aggregates rides from multiple providers (NY + others)
 *  and returns scored, sorted results to the frontend.
 * ═══════════════════════════════════════════════════════════
 */

import { Request, Response } from 'express';
import { z } from 'zod';

// ─── Validation ─────────────────────────────────────────

const rideSearchSchema = z.object({
    pickupLat: z.number().min(-90).max(90),
    pickupLng: z.number().min(-180).max(180),
    dropoffLat: z.number().min(-90).max(90),
    dropoffLng: z.number().min(-180).max(180),
    mode: z.enum(['cab', 'bike', 'auto', 'metro']).optional().default('cab'),
});

const selectEstimateSchema = z.object({
    estimateId: z.string().min(1),
    provider: z.string().min(1),
});

// ─── Hardcoded providers (demo) ─────────────────────────

interface SimulatedRide {
    provider: string;
    type: string;
    price: number;
    eta: number;
    score: number;
    logo: string;
    reliability: number;
    surge: boolean;
    source: 'simulated';
}

function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateSimulatedRides(
    pickupLat: number, pickupLng: number,
    dropoffLat: number, dropoffLng: number,
    mode: string,
): SimulatedRide[] {
    const dist = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const distVariance = () => 0.9 + Math.random() * 0.2;

    const rides: SimulatedRide[] = [];

    if (mode === 'cab') {
        const basePrice = Math.round(80 + dist * 18);
        rides.push(
            { provider: 'Uber', type: 'UberGo', price: Math.round(basePrice * 1.12 * distVariance()), eta: Math.round(3 + Math.random() * 5), score: 94, logo: 'uber', reliability: 96, surge: Math.random() > 0.8, source: 'simulated' },
            { provider: 'Ola', type: 'Ola Mini', price: Math.round(basePrice * 1.0 * distVariance()), eta: Math.round(4 + Math.random() * 6), score: 91, logo: 'ola', reliability: 89, surge: false, source: 'simulated' },
            { provider: 'Rapido', type: 'Rapido Cab', price: Math.round(basePrice * 0.92 * distVariance()), eta: Math.round(5 + Math.random() * 7), score: 87, logo: 'rapido', reliability: 85, surge: false, source: 'simulated' },
            { provider: 'Uber', type: 'UberXL', price: Math.round(basePrice * 1.7 * distVariance()), eta: Math.round(5 + Math.random() * 6), score: 82, logo: 'uber', reliability: 94, surge: Math.random() > 0.7, source: 'simulated' },
            { provider: 'Ola', type: 'Ola Prime', price: Math.round(basePrice * 1.55 * distVariance()), eta: Math.round(4 + Math.random() * 5), score: 88, logo: 'ola', reliability: 92, surge: false, source: 'simulated' },
        );
    } else if (mode === 'bike') {
        const basePrice = Math.round(20 + dist * 7);
        rides.push(
            { provider: 'Rapido', type: 'Rapido Bike', price: Math.round(basePrice * 0.9 * distVariance()), eta: Math.round(2 + Math.random() * 4), score: 92, logo: 'rapido', reliability: 88, surge: false, source: 'simulated' },
            { provider: 'Uber', type: 'Uber Moto', price: Math.round(basePrice * 1.05 * distVariance()), eta: Math.round(3 + Math.random() * 5), score: 89, logo: 'uber', reliability: 91, surge: false, source: 'simulated' },
            { provider: 'Ola', type: 'Ola Bike', price: Math.round(basePrice * 0.85 * distVariance()), eta: Math.round(4 + Math.random() * 6), score: 85, logo: 'ola', reliability: 82, surge: false, source: 'simulated' },
        );
    } else if (mode === 'auto') {
        const basePrice = Math.round(25 + dist * 14);
        rides.push(
            { provider: 'Ola', type: 'Ola Auto', price: Math.round(basePrice * 1.05 * distVariance()), eta: Math.round(3 + Math.random() * 5), score: 93, logo: 'ola', reliability: 90, surge: false, source: 'simulated' },
            { provider: 'Rapido', type: 'Rapido Auto', price: Math.round(basePrice * 0.95 * distVariance()), eta: Math.round(3 + Math.random() * 4), score: 91, logo: 'rapido', reliability: 87, surge: false, source: 'simulated' },
            { provider: 'Uber', type: 'Uber Auto', price: Math.round(basePrice * 1.1 * distVariance()), eta: Math.round(4 + Math.random() * 5), score: 88, logo: 'uber', reliability: 93, surge: false, source: 'simulated' },
        );
    }

    return rides;
}

// ─── Search Rides Handler ───────────────────────────────

export async function searchRidesHandler(req: Request, res: Response): Promise<void> {
    try {
        const result = rideSearchSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid search parameters',
                details: result.error.issues,
            });
            return;
        }

        const { pickupLat, pickupLng, dropoffLat, dropoffLng, mode } = result.data;
        const userPhone = req.user?.phone || '';

        const simulatedRides = generateSimulatedRides(pickupLat, pickupLng, dropoffLat, dropoffLng, mode);

        // Merge results
        const allRides: any[] = [...simulatedRides];

        // Score and sort — MOVZZ reliability layer
        const scored = allRides.map(ride => ({
            ...ride,
            movzzScore: calculateMovzzScore(ride),
        })).sort((a, b) => b.movzzScore - a.movzzScore);

        // Tag the results
        const tagged = scored.map((ride, i) => {
            let tag = null;
            if (i === 0) tag = { label: 'Best Match', color: '#12B76A', bg: '#ECFDF3' };
            const cheapest = scored.reduce((p, c) => c.price < p.price ? c : p);
            if (ride === cheapest && !tag) tag = { label: 'Cheapest', color: '#2D7FF9', bg: '#EBF3FF' };
            return { ...ride, tag };
        });

        res.json({
            success: true,
            data: {
                rides: tagged,
                searchId: `sim_${Date.now()}`,
                distance: haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng),
                providers: {
                    uber: true,
                    ola: true,
                    rapido: true,
                },
            },
        });

    } catch (error) {
        console.error('Search rides error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search rides',
        });
    }
}

// ─── MOVZZ Scoring Algorithm ────────────────────────────

function calculateMovzzScore(ride: any): number {
    // Weighted composite score
    const weights = {
        reliability: 0.35,
        price: 0.25,
        eta: 0.20,
        baseScore: 0.20,
    };

    const reliabilityScore = (ride.reliability || 85) / 100 * 100;
    const priceScore = Math.max(0, 100 - (ride.price / 10)); // Lower = better
    const etaScore = Math.max(0, 100 - (ride.eta * 5));       // Lower = better
    const baseScore = ride.score || 85;

    const composite = Math.round(
        reliabilityScore * weights.reliability +
        priceScore * weights.price +
        etaScore * weights.eta +
        baseScore * weights.baseScore
    );

    return Math.min(99, Math.max(60, composite));
}

// ─── Select Estimate Handler ────────────────────────────

export async function selectEstimateHandler(req: Request, res: Response): Promise<void> {
    try {
        const result = selectEstimateSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid selection',
                details: result.error.issues,
            });
            return;
        }

        const { estimateId, provider } = result.data;

        if (provider === 'Namma Yatri' || provider === 'nammayatri') {
            res.status(400).json({ success: false, error: 'Namma Yatri integration is currently disabled' });
            return;
        }

        // For simulated providers, return a simulated booking
        res.json({
            success: true,
            data: {
                bookingId: `movzz_${Date.now()}`,
                provider: provider.toLowerCase().replace(' ', ''),
                status: 'CONFIRMED',
            },
        });

    } catch (error) {
        console.error('Select estimate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to select ride',
        });
    }
}

export async function nyBookingStatusHandler(req: Request, res: Response): Promise<void> {
    res.json({
        success: true,
        data: [],
    });
}
