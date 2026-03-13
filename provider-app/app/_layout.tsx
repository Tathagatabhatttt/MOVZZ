import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
    const { isAuthenticated, loadToken } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        loadToken();
    }, []);

    useEffect(() => {
        const inAuthGroup = segments[0] === '(tabs)';

        if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/home');
        } else if (!isAuthenticated && inAuthGroup) {
            router.replace('/login');
        }
    }, [isAuthenticated, segments]);

    return (
        <>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="ride/[id]" options={{ presentation: 'modal' }} />
            </Stack>
        </>
    );
}
