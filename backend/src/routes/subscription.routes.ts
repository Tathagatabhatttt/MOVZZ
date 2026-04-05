import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
  activatePassHandler,
  getPassHandler,
  cancelPassHandler,
} from '../controllers/subscription.controller';

const router = Router();

router.get('/me', authenticateUser, getPassHandler);
router.post('/activate', authenticateUser, activatePassHandler);
router.post('/cancel', authenticateUser, cancelPassHandler);

export default router;
