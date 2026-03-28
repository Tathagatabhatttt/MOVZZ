import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { validatePromoHandler } from '../controllers/features.controller';

const router = Router();

router.post('/validate', authenticateUser, validatePromoHandler);

export default router;
