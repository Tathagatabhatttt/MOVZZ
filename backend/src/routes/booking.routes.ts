import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
    createBookingHandler,
    getBookingHandler,
    getUserBookingsHandler,
    cancelBookingHandler,
    getUserCreditsHandler,
} from '../controllers/booking.controller';
import {
    rateBookingHandler,
    sosAlertHandler,
    shareTripHandler,
    fareSplitHandler,
    downloadReceiptHandler,
    getChatHandler,
    sendChatHandler,
} from '../controllers/features.controller';

const router = Router();

// All booking routes require authentication
router.use(authenticateUser);

// ─── Core Booking Endpoints ──────────────────────────────

router.post('/', createBookingHandler);                    // Create booking
router.get('/', getUserBookingsHandler);                   // List user's bookings (trip history)
router.get('/credits', getUserCreditsHandler);             // Get user credits
router.get('/:id', getBookingHandler);                     // Get booking status
router.post('/:id/cancel', cancelBookingHandler);          // Cancel booking

// ─── Section 2 Feature Endpoints ────────────────────────

router.post('/:id/rate', rateBookingHandler);              // Rate completed trip
router.post('/:id/sos', sosAlertHandler);                  // SOS emergency alert
router.post('/:id/share', shareTripHandler);               // Generate live share link
router.post('/:id/split', fareSplitHandler);               // Create fare split
router.get('/:id/receipt', downloadReceiptHandler);        // Download receipt
router.get('/:id/chat', getChatHandler);                   // Get chat messages
router.post('/:id/chat', sendChatHandler);                 // Send chat message

export default router;
