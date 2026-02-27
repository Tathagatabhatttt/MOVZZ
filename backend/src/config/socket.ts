import { Server } from 'socket.io';

// ─── Socket.IO Singleton ─────────────────────────────────
// Holds the io instance created in index.ts. Exported as a
// getter so booking.service.ts can import it without creating
// a circular dependency back to index.ts.

let io: Server | null = null;

export function setIo(instance: Server): void {
    io = instance;
}

export function getIo(): Server | null {
    return io;
}
