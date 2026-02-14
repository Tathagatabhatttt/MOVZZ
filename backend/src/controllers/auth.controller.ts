import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
});

const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phone } = sendOTPSchema.parse(req.body);

    await this.authService.sendOTP(phone);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        expiresIn: 300, // 5 minutes
      },
    });
  });

  verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phone, code } = verifyOTPSchema.parse(req.body);

    const result = await this.authService.verifyOTP(phone, code);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    const result = await this.authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // In a real app, you'd invalidate the token here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await this.authService.getUserById(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  });
}
