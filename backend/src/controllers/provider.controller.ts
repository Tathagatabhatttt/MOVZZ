/**
 * ═══════════════════════════════════════════════════════════
 *  PROVIDER API CONTROLLER
 * ═══════════════════════════════════════════════════════════
 *  Auth, profile, bookings, earnings, location, status
 *  for the React Native provider/driver app.
 * ═══════════════════════════════════════════════════════════
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';
import { generateToken } from '../services/jwt.service';
import { generateOTP } from '../utils/otp';
import { normalizePhone } from '../utils/phone';
import { smsQueue } from '../config/queues';
import { getIo } from '../config/socket';
import { transitionState } from '../services/booking.service';
import { attemptRecovery } from '../services/recovery.service';

// ─── AUTH ──────────────────────────────────────────────────

export async function providerSendOTP(req: Request, res: Response): Promise<void> {
    try {
        const { phone: input } = req.body;
        if (!input || typeof input !== 'string') {
            res.status(400).json({ success: false, error: 'Phone number is required' });
            return;
        }

        const phone = normalizePhone(input);

        // Only allow OTP for registered providers
        const provider = await prisma.provider.findUnique({ where: { phone } });
        if (!provider) {
            res.status(404).json({ success: false, error: 'No provider account found for this number' });
            return;
        }

        const otp = generateOTP();
        await redis.set(`otp:provider:${phone}`, otp, 300);
        await smsQueue.add(`otp-provider-${phone}`, { phone, otp });

        console.log(`[Provider Auth] OTP queued for ${phone}`);

        res.json({
            success: true,
            data: {
                message: 'OTP sent',
                otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
            },
        });
    } catch (error: any) {
        console.error('[Provider Auth] Error:', error.message);
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function providerVerifyOTP(req: Request, res: Response): Promise<void> {
    try {
        const { phone: input, otp } = req.body;
        if (!input || !otp) {
            res.status(400).json({ success: false, error: 'Phone and OTP required' });
            return;
        }

        const phone = normalizePhone(input);
        const stored = await redis.get(`otp:provider:${phone}`);

        if (!stored || stored !== otp) {
            res.status(401).json({ success: false, error: 'Invalid or expired OTP' });
            return;
        }

        await redis.del(`otp:provider:${phone}`);

        const provider = await prisma.provider.findUnique({ where: { phone } });
        if (!provider) {
            res.status(404).json({ success: false, error: 'Provider not found' });
            return;
        }

        const token = generateToken({
            userId: provider.id,
            phone: provider.phone,
            providerId: provider.id,
            role: 'provider',
        });

        await prisma.provider.update({
            where: { id: provider.id },
            data: { lastActiveAt: new Date() },
        });

        res.json({
            success: true,
            data: {
                token,
                provider: {
                    id: provider.id,
                    name: provider.name,
                    phone: provider.phone,
                    type: provider.type,
                    vehicleModel: provider.vehicleModel,
                    vehiclePlate: provider.vehiclePlate,
                    reliability: provider.reliability,
                    rating: provider.rating,
                    totalRides: provider.totalRides,
                    isOnline: provider.isOnline,
                },
            },
        });
    } catch (error: any) {
        console.error('[Provider Auth] Error:', error.message);
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

// ─── PROFILE ───────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<void> {
    try {
        const provider = await prisma.provider.findUnique({
            where: { id: req.provider!.providerId },
            select: {
                id: true, name: true, phone: true, type: true,
                vehicleModel: true, vehiclePlate: true,
                commissionRate: true, paymentTerms: true,
                reliability: true, rating: true,
                totalRides: true, successfulRides: true,
                isOnline: true, active: true,
                currentActiveRides: true, maxCapacity: true,
                createdAt: true,
            },
        });

        if (!provider) {
            res.status(404).json({ success: false, error: 'Provider not found' });
            return;
        }

        res.json({ success: true, data: provider });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
    try {
        const { name, vehicleModel, vehiclePlate } = req.body;
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (vehicleModel) data.vehicleModel = vehicleModel;
        if (vehiclePlate) data.vehiclePlate = vehiclePlate;

        if (Object.keys(data).length === 0) {
            res.status(400).json({ success: false, error: 'No fields to update' });
            return;
        }

        const provider = await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data,
        });

        res.json({ success: true, data: { id: provider.id, name: provider.name, vehicleModel: provider.vehicleModel, vehiclePlate: provider.vehiclePlate } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

// ─── BOOKINGS ──────────────────────────────────────────────

export async function getActiveBookings(req: Request, res: Response): Promise<void> {
    try {
        const bookings = await prisma.booking.findMany({
            where: {
                providerId: req.provider!.providerId,
                state: { in: ['CONFIRMED', 'IN_PROGRESS'] },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, pickup: true, pickupLat: true, pickupLng: true,
                dropoff: true, dropoffLat: true, dropoffLng: true,
                state: true, transportMode: true,
                fareEstimate: true, fareActual: true,
                createdAt: true, confirmedAt: true, startedAt: true,
                user: { select: { name: true, phone: true } },
            },
        });

        res.json({ success: true, data: bookings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function getBookingHistory(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    providerId: req.provider!.providerId,
                    state: { in: ['COMPLETED', 'CANCELLED', 'FAILED'] },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true, pickup: true, dropoff: true,
                    state: true, transportMode: true,
                    fareEstimate: true, fareActual: true,
                    createdAt: true, completedAt: true,
                },
            }),
            prisma.booking.count({
                where: {
                    providerId: req.provider!.providerId,
                    state: { in: ['COMPLETED', 'CANCELLED', 'FAILED'] },
                },
            }),
        ]);

        res.json({ success: true, data: { bookings, total, page, limit } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function acceptBooking(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking || booking.providerId !== req.provider!.providerId) {
            res.status(404).json({ success: false, error: 'Booking not found' });
            return;
        }
        if (booking.state !== 'CONFIRMED') {
            res.status(400).json({ success: false, error: `Cannot accept booking in ${booking.state} state` });
            return;
        }

        // Booking is already CONFIRMED with this provider — acceptance is implicit
        // Just update lastActiveAt
        await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data: { lastActiveAt: new Date() },
        });

        res.json({ success: true, data: { message: 'Booking accepted' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function startBooking(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking || booking.providerId !== req.provider!.providerId) {
            res.status(404).json({ success: false, error: 'Booking not found' });
            return;
        }
        if (booking.state !== 'CONFIRMED') {
            res.status(400).json({ success: false, error: `Cannot start from ${booking.state} state` });
            return;
        }

        await transitionState(id, 'IN_PROGRESS', { startedBy: 'provider' });

        res.json({ success: true, data: { message: 'Ride started' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function completeBooking(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking || booking.providerId !== req.provider!.providerId) {
            res.status(404).json({ success: false, error: 'Booking not found' });
            return;
        }
        if (booking.state !== 'IN_PROGRESS') {
            res.status(400).json({ success: false, error: `Cannot complete from ${booking.state} state` });
            return;
        }

        await transitionState(id, 'COMPLETED', { completedBy: 'provider' });

        // Update provider stats
        await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data: {
                totalRides: { increment: 1 },
                successfulRides: { increment: 1 },
                currentActiveRides: { decrement: 1 },
                lastActiveAt: new Date(),
            },
        });

        res.json({ success: true, data: { message: 'Ride completed' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

export async function rejectBooking(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking || booking.providerId !== req.provider!.providerId) {
            res.status(404).json({ success: false, error: 'Booking not found' });
            return;
        }
        if (booking.state !== 'CONFIRMED') {
            res.status(400).json({ success: false, error: `Cannot reject from ${booking.state} state` });
            return;
        }

        // Mark attempt as failed, trigger recovery
        await transitionState(id, 'SEARCHING', { rejectedBy: req.provider!.providerId });

        await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data: { currentActiveRides: { decrement: 1 } },
        });

        // Trigger recovery to find a new provider
        await attemptRecovery(id);

        res.json({ success: true, data: { message: 'Booking rejected, finding new provider' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

// ─── EARNINGS ──────────────────────────────────────────────

export async function getEarnings(req: Request, res: Response): Promise<void> {
    try {
        const providerId = req.provider!.providerId;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Earnings from completed bookings
        const [todayEarnings, weekEarnings, monthEarnings, payouts] = await Promise.all([
            prisma.booking.aggregate({
                where: { providerId, state: 'COMPLETED', completedAt: { gte: todayStart } },
                _sum: { fareActual: true, commissionAmount: true },
                _count: true,
            }),
            prisma.booking.aggregate({
                where: { providerId, state: 'COMPLETED', completedAt: { gte: weekStart } },
                _sum: { fareActual: true, commissionAmount: true },
                _count: true,
            }),
            prisma.booking.aggregate({
                where: { providerId, state: 'COMPLETED', completedAt: { gte: monthStart } },
                _sum: { fareActual: true, commissionAmount: true },
                _count: true,
            }),
            prisma.payout.findMany({
                where: { providerId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);

        res.json({
            success: true,
            data: {
                today: {
                    rides: todayEarnings._count,
                    revenue: todayEarnings._sum.fareActual || 0,
                    commission: todayEarnings._sum.commissionAmount || 0,
                    net: (todayEarnings._sum.fareActual || 0) - (todayEarnings._sum.commissionAmount || 0),
                },
                week: {
                    rides: weekEarnings._count,
                    revenue: weekEarnings._sum.fareActual || 0,
                    commission: weekEarnings._sum.commissionAmount || 0,
                    net: (weekEarnings._sum.fareActual || 0) - (weekEarnings._sum.commissionAmount || 0),
                },
                month: {
                    rides: monthEarnings._count,
                    revenue: monthEarnings._sum.fareActual || 0,
                    commission: monthEarnings._sum.commissionAmount || 0,
                    net: (monthEarnings._sum.fareActual || 0) - (monthEarnings._sum.commissionAmount || 0),
                },
                payouts,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

// ─── LOCATION ──────────────────────────────────────────────

export async function updateLocation(req: Request, res: Response): Promise<void> {
    try {
        const { lat, lng } = req.body;
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            res.status(400).json({ success: false, error: 'lat and lng required' });
            return;
        }

        await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data: { lastLat: lat, lastLng: lng, lastActiveAt: new Date() },
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}

// ─── ONLINE/OFFLINE STATUS ────────────────────────────────

export async function updateStatus(req: Request, res: Response): Promise<void> {
    try {
        const { online } = req.body;
        if (typeof online !== 'boolean') {
            res.status(400).json({ success: false, error: 'online (boolean) required' });
            return;
        }

        const provider = await prisma.provider.update({
            where: { id: req.provider!.providerId },
            data: { isOnline: online, lastActiveAt: new Date() },
        });

        res.json({ success: true, data: { isOnline: provider.isOnline } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
}
