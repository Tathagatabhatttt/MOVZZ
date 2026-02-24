import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { getQuotesHandler } from '../controllers/quotes.controller';

const router = Router();

// Require authentication to get quotes
router.use(authenticateUser);

router.post('/', getQuotesHandler);

export default router;