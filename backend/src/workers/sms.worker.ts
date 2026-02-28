/**
 * ═══════════════════════════════════════════════════════════
 *  SMS DISPATCH WORKER
 * ═══════════════════════════════════════════════════════════
 *  Processes sms-dispatch jobs enqueued by auth.controller.ts.
 *  The OTP is already stored in Redis before the job is queued,
 *  so the HTTP response returns immediately — no waiting for
 *  SMS delivery.
 *
 *  Job data: { phone: string, otp: string }
 *
 *  Current: mock (console log) — same as before
 *  To go live: replace the console.log block with Twilio:
 *
 *    import twilio from 'twilio';
 *    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 *    await client.messages.create({
 *      body: `Your MOVZZ OTP is ${otp}. Valid for 5 minutes.`,
 *      from: process.env.TWILIO_PHONE_NUMBER,
 *      to: phone,
 *    });
 *
 *  BullMQ retries automatically (3 attempts, exponential backoff
 *  2s → 4s → 8s) if the job throws — configured in queues.ts.
 * ═══════════════════════════════════════════════════════════
 */

import { Worker } from 'bullmq';
import { connection } from '../config/queues';

new Worker('sms-dispatch', async (job) => {
    const { phone, otp } = job.data as { phone: string; otp: string };

    // ── Mock (development) ───────────────────────────────
    // Remove this block and uncomment the Twilio section above
    // when switching to real SMS delivery.
    console.log('╔════════════════════════════════════╗');
    console.log(`║ [SMS Worker] OTP dispatched        ║`);
    console.log(`║ To:  ${phone.padEnd(28)} ║`);
    console.log(`║ OTP: ${otp.padEnd(28)} ║`);
    console.log('╚════════════════════════════════════╝');

}, { connection, concurrency: 5 });

console.log('[Worker] sms-dispatch worker started');
