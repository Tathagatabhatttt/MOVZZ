/**
 * ═══════════════════════════════════════════════════════════
 *  RECOVERY RETRY WORKER
 * ═══════════════════════════════════════════════════════════
 *  Processes recovery-retry jobs enqueued by booking.service.ts
 *  when no provider is found during initial assignment.
 *
 *  Delegates to the existing attemptRecovery() function which
 *  handles all retry logic internally (3 attempts, escalation
 *  to MANUAL_ESCALATION on exhaustion).
 *
 *  Running this in a worker (rather than inline in the request)
 *  means:
 *   - Jobs survive server restarts (persisted in Redis)
 *   - The 2-second delay allows any in-flight provider to respond
 *   - Failures are tracked and visible in the queue
 * ═══════════════════════════════════════════════════════════
 */

import { Worker } from 'bullmq';
import { connection } from '../config/queues';
import { attemptRecovery, issueCompensation } from '../services/recovery.service';
import prisma from '../config/database';

new Worker('recovery-retry', async (job) => {
    const { bookingId } = job.data as { bookingId: string };

    console.log(`[Recovery] Async recovery started for booking ${bookingId}`);

    const recovered = await attemptRecovery(bookingId);

    if (!recovered) {
        // Recovery exhausted — booking is now in MANUAL_ESCALATION.
        // Issue compensation credit to the user.
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
            await issueCompensation(booking.userId, booking.userPhone, bookingId);
        }
        console.log(`[Recovery] Booking ${bookingId} escalated + compensation issued`);
    } else {
        console.log(`[Recovery] Booking ${bookingId} recovered successfully`);
    }
}, { connection });

console.log('[Worker] recovery-retry worker started');
