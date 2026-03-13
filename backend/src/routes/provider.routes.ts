import { Router } from 'express';
import { authenticateProvider } from '../middleware/providerAuth.middleware';
import {
    providerSendOTP,
    providerVerifyOTP,
    getProfile,
    updateProfile,
    getActiveBookings,
    getBookingHistory,
    acceptBooking,
    startBooking,
    completeBooking,
    rejectBooking,
    getEarnings,
    updateLocation,
    updateStatus,
} from '../controllers/provider.controller';

const router = Router();

// ─── Auth (no middleware) ──────────────────────────────────
router.post('/auth/send-otp', providerSendOTP);
router.post('/auth/verify-otp', providerVerifyOTP);

// ─── All routes below require provider JWT ─────────────────
router.use(authenticateProvider);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Bookings
router.get('/bookings/active', getActiveBookings);
router.get('/bookings/history', getBookingHistory);
router.post('/bookings/:id/accept', acceptBooking);
router.post('/bookings/:id/start', startBooking);
router.post('/bookings/:id/complete', completeBooking);
router.post('/bookings/:id/reject', rejectBooking);

// Earnings
router.get('/earnings', getEarnings);

// Location & status
router.post('/location', updateLocation);
router.post('/status', updateStatus);

export default router;
