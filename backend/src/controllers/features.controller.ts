import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import { getIo } from '../config/socket';

// ─── Rate a Booking ──────────────────────────────────────

export async function rateBookingHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;
        const { score, comment } = req.body;

        if (!score || score < 1 || score > 5) {
            return res.status(400).json({ success: false, error: 'score must be 1–5' });
        }

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
        });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
        if (booking.state !== 'COMPLETED') {
            return res.status(400).json({ success: false, error: 'Can only rate completed trips' });
        }

        const rating = await prisma.rating.upsert({
            where: { bookingId },
            create: { bookingId, userId, providerId: booking.providerId ?? undefined, score, comment },
            update: { score, comment },
        });

        // Update provider's average rating
        if (booking.providerId) {
            const ratings = await prisma.rating.findMany({
                where: { providerId: booking.providerId },
                select: { score: true },
            });
            const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
            await prisma.provider.update({
                where: { id: booking.providerId },
                data: { rating: Math.round(avg * 10) / 10 },
            });
        }

        res.json({ success: true, data: rating });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Validate Promo Code ──────────────────────────────────

export async function validatePromoHandler(req: Request, res: Response) {
    try {
        const { code, farePaise } = req.body;
        if (!code) return res.status(400).json({ success: false, error: 'code required' });

        const promo = await prisma.promoCode.findFirst({
            where: { code: code.toUpperCase(), active: true, expiresAt: { gt: new Date() } },
        });
        if (!promo) return res.status(404).json({ success: false, error: 'Invalid or expired promo code' });
        if (promo.usageCount >= promo.maxUsage) {
            return res.status(400).json({ success: false, error: 'Promo code usage limit reached' });
        }
        if (farePaise && farePaise < promo.minFarePaise) {
            return res.status(400).json({
                success: false,
                error: `Minimum fare ₹${Math.round(promo.minFarePaise / 100)} required`,
            });
        }

        let discountPaise = promo.discountPaise;
        if (promo.discountPercent && farePaise) {
            const pctDiscount = Math.round(farePaise * promo.discountPercent);
            discountPaise = promo.maxDiscountPaise
                ? Math.min(pctDiscount, promo.maxDiscountPaise)
                : pctDiscount;
        }

        res.json({
            success: true,
            data: {
                code: promo.code,
                discountPaise,
                discountRupees: Math.round(discountPaise / 100),
                description: promo.discountPercent
                    ? `${Math.round(promo.discountPercent * 100)}% off (up to ₹${Math.round((promo.maxDiscountPaise || discountPaise) / 100)})`
                    : `₹${Math.round(discountPaise / 100)} off`,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── SOS Alert ───────────────────────────────────────────

export async function sosAlertHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
            include: { user: { select: { name: true, phone: true } }, provider: { select: { name: true, phone: true } } },
        });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        // Log the SOS event
        await prisma.bookingLog.create({
            data: {
                bookingId,
                event: 'SOS_ALERT',
                message: `SOS triggered by ${booking.user.phone}`,
                metadata: { userId, timestamp: new Date().toISOString() },
            },
        });

        // Mark booking as SOS sent
        await prisma.booking.update({
            where: { id: bookingId },
            data: { sharedWithSos: true },
        });

        // Notify admin room via Socket.IO
        const io = getIo();
        if (io) {
            io.to('admin').emit('sos:alert', {
                bookingId,
                userPhone: booking.user.phone,
                userName: booking.user.name,
                providerName: booking.provider?.name,
                state: booking.state,
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                timestamp: new Date().toISOString(),
            });
        }

        res.json({ success: true, message: 'SOS alert sent to operations team' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Generate Share Token ─────────────────────────────────

export async function shareTripHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;

        const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        // Reuse existing valid token or create new one
        const existing = await prisma.shareToken.findFirst({
            where: { bookingId, expiresAt: { gt: new Date() } },
        });
        if (existing) {
            const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${existing.token}`;
            return res.json({ success: true, data: { token: existing.token, shareUrl } });
        }

        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

        await prisma.shareToken.create({ data: { bookingId, token, expiresAt } });

        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${token}`;
        res.json({ success: true, data: { token, shareUrl } });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Get Shared Trip (Public) ─────────────────────────────

export async function getSharedTripHandler(req: Request, res: Response) {
    try {
        const { token } = req.params;
        const shareToken = await prisma.shareToken.findUnique({
            where: { token },
            include: {
                booking: {
                    select: {
                        id: true,
                        pickup: true,
                        dropoff: true,
                        state: true,
                        transportMode: true,
                        pickupLat: true,
                        pickupLng: true,
                        dropoffLat: true,
                        dropoffLng: true,
                        createdAt: true,
                        provider: { select: { name: true, vehicleModel: true, vehiclePlate: true, rating: true } },
                    },
                },
            },
        });

        if (!shareToken) return res.status(404).json({ success: false, error: 'Share link not found or expired' });
        if (shareToken.expiresAt < new Date()) {
            return res.status(410).json({ success: false, error: 'Share link has expired' });
        }

        res.json({ success: true, data: shareToken.booking });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Create Fare Split ────────────────────────────────────

export async function fareSplitHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;
        const { participants = 2 } = req.body;

        const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        const count = Math.max(2, Math.min(8, parseInt(participants)));
        const perPersonPaise = Math.ceil(booking.fareEstimate / count);
        const shareLink = crypto.randomBytes(8).toString('hex');

        const split = await prisma.fareSplit.upsert({
            where: { bookingId },
            create: { bookingId, totalPaise: booking.fareEstimate, perPersonPaise, participants: count, shareLink },
            update: { participants: count, perPersonPaise },
        });

        const splitUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/split/${split.shareLink}`;
        res.json({
            success: true,
            data: {
                ...split,
                totalRupees: Math.round(split.totalPaise / 100),
                perPersonRupees: Math.round(split.perPersonPaise / 100),
                splitUrl,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Download Receipt ─────────────────────────────────────

export async function downloadReceiptHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
            include: {
                user: { select: { name: true, phone: true } },
                provider: { select: { name: true, vehicleModel: true, vehiclePlate: true } },
                rating: { select: { score: true } },
            },
        });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        // Return structured receipt data (frontend renders it as HTML/PDF)
        const receipt = {
            bookingId: booking.id,
            date: booking.completedAt || booking.createdAt,
            pickup: booking.pickup,
            dropoff: booking.dropoff,
            transportMode: booking.transportMode,
            state: booking.state,
            fareEstimateRupees: Math.round(booking.fareEstimate / 100),
            fareActualRupees: booking.fareActual ? Math.round(booking.fareActual / 100) : null,
            promoCode: booking.promoCode,
            promoDiscountRupees: booking.promoDiscount ? Math.round(booking.promoDiscount / 100) : null,
            rider: { name: booking.user.name || 'Rider', phone: booking.user.phone },
            provider: booking.provider
                ? { name: booking.provider.name, vehicle: booking.provider.vehicleModel, plate: booking.provider.vehiclePlate }
                : null,
            rating: booking.rating?.score ?? null,
            paymentMethod: booking.razorpayPaymentId ? 'Online' : 'Cash',
            paidAt: booking.paidAt,
        };

        res.json({ success: true, data: receipt });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Get Chat Messages ────────────────────────────────────

export async function getChatHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;

        const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        const messages = await prisma.chatMessage.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ success: true, data: messages });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Send Chat Message ────────────────────────────────────

export async function sendChatHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id: bookingId } = req.params;
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ success: false, error: 'message required' });

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
            include: { user: { select: { phone: true } } },
        });
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        const chat = await prisma.chatMessage.create({
            data: { bookingId, sender: 'user', senderPhone: booking.user.phone, message: message.trim() },
        });

        // Emit to provider via socket
        const io = getIo();
        if (io && booking.providerId) {
            io.to(`provider:${booking.providerId}`).emit('chat:message', { bookingId, ...chat });
        }

        res.json({ success: true, data: chat });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}
