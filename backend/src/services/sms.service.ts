import redis from '../config/redis';

interface SMSService {
  sendOTP(phone: string, otp: string): Promise<void>;
}

class MockSMSService implements SMSService {
  async sendOTP(phone: string, otp: string): Promise<void> {
    console.log('╔════════════════════════════════════╗');
    console.log('║         MOCK SMS SENT              ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ To: ${phone.padEnd(28)} ║`);
    console.log(`║ OTP: ${otp.padEnd(27)} ║`);
    console.log('╚════════════════════════════════════╝');

    await redis.set(`otp:${phone}`, otp, 300);
  }
}

const smsService = new MockSMSService();

export default smsService;