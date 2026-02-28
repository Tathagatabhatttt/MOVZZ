/**
 * ═══════════════════════════════════════════════════════════
 *  BOOKING TIMEOUT WORKER
 * ═══════════════════════════════════════════════════════════
 *  Fires 5 minutes after a booking is created (DELAY set in
 *  booking.service.ts when the job is enqueued).
 *
 *  If the booking is still in SEARCHING when the job fires,
 *  it means no provider was ever assigned. Auto-transition
 *  to FAILED so the UI updates in real-time via Socket.IO.
 *
 *  Idempotent: if the booking already moved on (CONFIRMED,
 *  CANCELLED, etc.) the job is a no-op.
 * ═══════════════════════════════════════════════════════════
 */

import { Worker } from 'bullmq';
import { connection } from '../config/queues';
import prisma from '../config/database';
import { transitionState } from '../services/booking.service';
import { issueCompensation } from '../services/recovery.service';

new Worker('booking-timeout', async (job) => {
    const { bookingId } = job.data as { bookingId: string };

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking || booking.state !== 'SEARCHING') {
        // Already resolved — nothing to do
        return;
    }

    console.log(`[Timeout] Booking ${bookingId} timed out in SEARCHING — auto-cancelling`);

    await transitionState(bookingId, 'FAILED', { reason: 'timeout_no_provider' });

    // Issue ₹100 compensation credit for the inconvenience
    await issueCompensation(booking.userId, booking.userPhone, bookingId);

    console.log(`[Timeout] Booking ${bookingId} → FAILED + compensation issued`);
}, { connection });

console.log('[Worker] booking-timeout worker started');
