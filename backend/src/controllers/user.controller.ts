import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';

// ─── Get User Profile ────────────────────────────────────

export async function getProfileHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                name: true,
                email: true,
                referralCode: true,
                referredBy: true,
                createdAt: true,
                role: true,
                _count: { select: { bookings: true } },
            },
        });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Update User Profile ─────────────────────────────────

export async function updateProfileHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { name, email } = req.body;
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
            },
            select: { id: true, phone: true, name: true, email: true },
        });
        res.json({ success: true, data: user });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Get Favorite Locations ──────────────────────────────

export async function getFavoritesHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const favorites = await prisma.favoriteLocation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: favorites });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Add Favorite Location ────────────────────────────────

export async function addFavoriteHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { label, name, lat, lng } = req.body;
        if (!label || !name || lat == null || lng == null) {
            return res.status(400).json({ success: false, error: 'label, name, lat, lng required' });
        }
        // Upsert by label (one "Home", one "Work" per user)
        const existing = await prisma.favoriteLocation.findFirst({ where: { userId, label } });
        let favorite;
        if (existing) {
            favorite = await prisma.favoriteLocation.update({
                where: { id: existing.id },
                data: { name, lat, lng },
            });
        } else {
            favorite = await prisma.favoriteLocation.create({
                data: { userId, label, name, lat, lng },
            });
        }
        res.json({ success: true, data: favorite });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Remove Favorite Location ────────────────────────────

export async function removeFavoriteHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        const fav = await prisma.favoriteLocation.findFirst({ where: { id, userId } });
        if (!fav) return res.status(404).json({ success: false, error: 'Not found' });
        await prisma.favoriteLocation.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Get Wallet (Credits + Referral Stats) ───────────────

export async function getWalletHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true, referredBy: true },
        });

        // Active (unexpired, unused) credits
        const now = new Date();
        const credits = await prisma.userCredit.findMany({
            where: { userId, used: false, expiresAt: { gt: now } },
            orderBy: { expiresAt: 'asc' },
        });

        const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);

        // Count referrals (users who used this referralCode)
        const referralCount = await prisma.user.count({
            where: { referredBy: user?.referralCode },
        });

        res.json({
            success: true,
            data: {
                balancePaise: totalCredits,
                balanceRupees: Math.round(totalCredits / 100),
                referralCode: user?.referralCode,
                referralCount,
                credits,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}
