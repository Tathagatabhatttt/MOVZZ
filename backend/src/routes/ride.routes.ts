/**
 * ═══════════════════════════════════════════════════════════
 *  RIDE ROUTES — Search, select, and book rides
 * ═══════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
    searchRidesHandler,
    selectEstimateHandler,
} from '../controllers/ride.controller';

const router = Router();

// Ride search doesn't require auth (but uses it if available)
router.post('/search', optionalAuth, searchRidesHandler);

// Selecting an estimate and booking requires auth
router.post('/select', authenticateUser, selectEstimateHandler);

// ─── Optional Auth Middleware ───────────────────────────
// Attaches user if token present, but doesn't reject if missing
function optionalAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        const { verifyToken } = require('../services/jwt.service');
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        req.user = { userId: payload.userId, phone: payload.phone };
    } catch {
        // Invalid token, continue without user
    }

    next();
}

export default router;
