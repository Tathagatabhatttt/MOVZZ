import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface Provider {
    id: string;
    name: string;
    phone: string;
    type: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    reliability: number;
    rating: number;
    totalRides: number;
    isOnline: boolean;
}

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    otpSent: boolean;
    phone: string;
    provider: Provider | null;
    error: string | null;

    sendOTP: (phone: string) => Promise<void>;
    verifyOTP: (phone: string, otp: string) => Promise<void>;
    loadToken: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    isLoading: false,
    otpSent: false,
    phone: '',
    provider: null,
    error: null,

    sendOTP: async (phone: string) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/auth/send-otp', { phone });
            set({ otpSent: true, phone, isLoading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.error || 'Failed to send OTP', isLoading: false });
        }
    },

    verifyOTP: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/verify-otp', { phone, otp });
            const { token, provider } = data.data;

            await SecureStore.setItemAsync('provider_token', token);
            await SecureStore.setItemAsync('provider_id', provider.id);

            connectSocket(token, provider.id);

            set({ isAuthenticated: true, provider, isLoading: false, otpSent: false });
        } catch (err: any) {
            set({ error: err.response?.data?.error || 'Invalid OTP', isLoading: false });
        }
    },

    loadToken: async () => {
        const token = await SecureStore.getItemAsync('provider_token');
        const providerId = await SecureStore.getItemAsync('provider_id');
        if (!token || !providerId) return;

        try {
            const { data } = await api.get('/profile');
            connectSocket(token, providerId);
            set({ isAuthenticated: true, provider: data.data });
        } catch {
            await SecureStore.deleteItemAsync('provider_token');
            await SecureStore.deleteItemAsync('provider_id');
        }
    },

    logout: async () => {
        disconnectSocket();
        await SecureStore.deleteItemAsync('provider_token');
        await SecureStore.deleteItemAsync('provider_id');
        set({ isAuthenticated: false, provider: null, otpSent: false, phone: '' });
    },
}));
