import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/send-otp', authRateLimiter, authController.sendOTP);
router.post('/verify-otp', authRateLimiter, authController.verifyOTP);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
