import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const bookingController = new BookingController();

// All booking routes require authentication
router.use(authenticate);

router.post('/search', bookingController.searchRides);
router.post('/create', bookingController.createBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:bookingId', bookingController.getBookingById);
router.patch('/:bookingId/cancel', bookingController.cancelBooking);
router.get('/:bookingId/status', bookingController.getBookingStatus);

export default router;
