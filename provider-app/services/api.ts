import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = __DEV__
    ? 'http://10.0.2.2:3000/api/v1/provider'  // Android emulator → localhost
    : 'https://api.movzz.in/api/v1/provider';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('provider_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        if (err.response?.status === 401) {
            await SecureStore.deleteItemAsync('provider_token');
        }
        return Promise.reject(err);
    }
);

export default api;
