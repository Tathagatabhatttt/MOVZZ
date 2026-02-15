import { AuthService } from '../../../src/services/auth.service';
import { prisma } from '../../../src/config/database';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  describe('sendOTP', () => {
    it('should generate a 6-digit OTP', async () => {
      const phone = '+919876543210';
      
      await authService.sendOTP(phone);

      const otp = await prisma.oTPCode.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
      });

      expect(otp).toBeDefined();
      expect(otp?.code).toHaveLength(6);
      expect(otp?.code).toMatch(/^\d{6}$/);
    });

    it('should create user if not exists', async () => {
      const phone = '+919999999999';
      
      await authService.sendOTP(phone);

      const user = await prisma.user.findUnique({
        where: { phone },
      });

      expect(user).toBeDefined();
      expect(user?.phone).toBe(phone);
    });

    it('should delete old OTP codes', async () => {
      const phone = '+919876543210';
      
      // Send first OTP
      await authService.sendOTP(phone);
      const firstOTP = await prisma.oTPCode.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
      });

      // Send second OTP
      await authService.sendOTP(phone);
      
      // First OTP should be deleted
      const oldOTP = await prisma.oTPCode.findUnique({
        where: { id: firstOTP!.id },
      });

      expect(oldOTP).toBeNull();
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP', async () => {
      const phone = '+919876543210';
      
      await authService.sendOTP(phone);
      
      const otp = await prisma.oTPCode.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
      });

      const result = await authService.verifyOTP(phone, otp!.code);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.phone).toBe(phone);
    });

    it('should reject invalid OTP', async () => {
      const phone = '+919876543210';
      
      await expect(
        authService.verifyOTP(phone, '000000')
      ).rejects.toThrow('Invalid or expired OTP');
    });

    it('should reject expired OTP', async () => {
      const phone = '+919876543210';
      
      await authService.sendOTP(phone);
      
      const otp = await prisma.oTPCode.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
      });

      // Manually expire the OTP
      await prisma.oTPCode.update({
        where: { id: otp!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(
        authService.verifyOTP(phone, otp!.code)
      ).rejects.toThrow('Invalid or expired OTP');
    });

    it('should mark user as verified after OTP verification', async () => {
      const phone = '+919111111111';
      
      await authService.sendOTP(phone);
      
      const otp = await prisma.oTPCode.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
      });

      await authService.verifyOTP(phone, otp!.code);

      const user = await prisma.user.findUnique({
        where: { phone },
      });

      expect(user?.isVerified).toBe(true);
      expect(user?.lastLoginAt).toBeDefined();
    });
  });
});
