import { io, Socket } from 'socket.io-client';

const SOCKET_URL = __DEV__
    ? 'http://10.0.2.2:3000'
    : 'https://api.movzz.in';

let socket: Socket | null = null;

export function connectSocket(token: string, providerId: string): Socket {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        socket!.emit('join:provider', providerId);
    });

    return socket;
}

export function getSocket(): Socket | null {
    return socket;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
