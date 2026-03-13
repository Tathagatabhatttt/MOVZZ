import { create } from 'zustand';
import api from '../services/api';
import { getSocket } from '../services/socket';

interface Booking {
    id: string;
    pickup: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoff: string;
    dropoffLat?: number;
    dropoffLng?: number;
    state: string;
    transportMode: string;
    fareEstimate: number;
    fareActual?: number;
    createdAt: string;
    confirmedAt?: string;
    startedAt?: string;
    user?: { name: string; phone: string };
}

interface RideState {
    activeBookings: Booking[];
    incomingRide: Booking | null;
    isOnline: boolean;
    isLoading: boolean;

    fetchActive: () => Promise<void>;
    acceptRide: (id: string) => Promise<void>;
    startRide: (id: string) => Promise<void>;
    completeRide: (id: string) => Promise<void>;
    rejectRide: (id: string) => Promise<void>;
    toggleOnline: (online: boolean) => Promise<void>;
    listenForRides: () => void;
    stopListening: () => void;
    clearIncoming: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
    activeBookings: [],
    incomingRide: null,
    isOnline: false,
    isLoading: false,

    fetchActive: async () => {
        set({ isLoading: true });
        try {
            const { data } = await api.get('/bookings/active');
            set({ activeBookings: data.data, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    acceptRide: async (id: string) => {
        await api.post(`/bookings/${id}/accept`);
        set({ incomingRide: null });
        get().fetchActive();
    },

    startRide: async (id: string) => {
        await api.post(`/bookings/${id}/start`);
        get().fetchActive();
    },

    completeRide: async (id: string) => {
        await api.post(`/bookings/${id}/complete`);
        get().fetchActive();
    },

    rejectRide: async (id: string) => {
        await api.post(`/bookings/${id}/reject`);
        set({ incomingRide: null });
        get().fetchActive();
    },

    toggleOnline: async (online: boolean) => {
        await api.post('/status', { online });
        set({ isOnline: online });
    },

    listenForRides: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on('ride:new_assignment', (data: Booking) => {
            set({ incomingRide: data });
            get().fetchActive();
        });

        socket.on('ride:cancelled', (data: { id: string }) => {
            set((state) => ({
                activeBookings: state.activeBookings.filter((b) => b.id !== data.id),
                incomingRide: state.incomingRide?.id === data.id ? null : state.incomingRide,
            }));
        });
    },

    stopListening: () => {
        const socket = getSocket();
        if (!socket) return;
        socket.off('ride:new_assignment');
        socket.off('ride:cancelled');
    },

    clearIncoming: () => set({ incomingRide: null }),
}));
