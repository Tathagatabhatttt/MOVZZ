import { Router } from 'express';
import { checkAvailability, bookRide, trackRide } from '../controllers/mock-provider.controller';

const router = Router();

// No auth — these simulate external provider endpoints
router.post('/:providerId/check-availability', checkAvailability);
router.post('/:providerId/book-ride', bookRide);
router.get('/:providerId/track-ride', trackRide);

export default router;
