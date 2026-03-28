import { Router } from 'express';
import { getSharedTripHandler } from '../controllers/features.controller';

const router = Router();

// Public route — no auth needed
router.get('/:token', getSharedTripHandler);

export default router;
