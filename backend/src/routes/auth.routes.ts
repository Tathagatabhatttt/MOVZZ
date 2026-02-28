import { Router } from 'express';
import { sendOTP, verifyOTP } from '../controllers/auth.controller';
import { googleRedirect, googleCallback } from '../controllers/oauth.controller';

const router = Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Google OAuth (no Passport — direct redirect flow)
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

export default router;