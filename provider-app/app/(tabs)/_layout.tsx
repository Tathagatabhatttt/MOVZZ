import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const BRAND = '#0d1d35';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: BRAND },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
                tabBarStyle: { backgroundColor: BRAND, borderTopColor: '#1e293b' },
                tabBarActiveTintColor: '#60a5fa',
                tabBarInactiveTintColor: '#64748b',
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tabs.Screen
                name="earnings"
                options={{
                    title: 'Earnings',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
                }}
            />
        </Tabs>
    );
}
