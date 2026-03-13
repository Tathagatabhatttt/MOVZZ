/**
 * ═══════════════════════════════════════════════════════════
 *  OTP DISPATCH WORKER
 * ═══════════════════════════════════════════════════════════
 *  Routes OTP delivery by input type:
 *    - Email address  → Resend (transactional email)
 *    - Phone number   → Meta WhatsApp Cloud API (free)
 *
 *  Job data: { phone: string, otp: string }
 *  ("phone" field holds either a phone number or email address)
 *
 *  BullMQ retries automatically (3 attempts, exponential backoff
 *  2s → 4s → 8s) if the job throws — configured in queues.ts.
 * ═══════════════════════════════════════════════════════════
 */

import { Worker } from 'bullmq';
import { connection } from '../config/queues';
import { sendOTPEmail } from '../services/email.service';

new Worker('sms-dispatch', async (job) => {
    const { phone, otp } = job.data as { phone: string; otp: string };

    // ── Email path ────────────────────────────────────────
    if (phone.includes('@')) {
        await sendOTPEmail(phone, otp);
        return;
    }

    // ── WhatsApp path ─────────────────────────────────────
    const token         = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.log('╔════════════════════════════════════╗');
        console.log(`║ [OTP DEV — no Meta creds]          ║`);
        console.log(`║ To:  ${phone.padEnd(28)} ║`);
        console.log(`║ OTP: ${otp.padEnd(28)} ║`);
        console.log('╚════════════════════════════════════╝');
        return;
    }

    const to = phone.startsWith('+') ? phone.slice(1) : phone;

    const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: `${otp} is your verification code.` },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.json() as unknown;
        throw new Error(`Meta WhatsApp API error: ${JSON.stringify(err)}`);
    }

    console.log(`[WhatsApp Worker] OTP sent to ${phone}`);

}, { connection, concurrency: 5 });

console.log('[Worker] OTP dispatch worker started');
