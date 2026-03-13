import { useEffect } from 'react';
import {
    View, Text, TouchableOpacity, FlatList,
    StyleSheet, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';

const BRAND = '#0d1d35';
const ACCENT = '#60a5fa';
const GREEN = '#22c55e';
const RED = '#ef4444';

export default function HomeScreen() {
    const router = useRouter();
    const { provider } = useAuthStore();
    const {
        activeBookings, incomingRide, isOnline,
        fetchActive, toggleOnline, listenForRides, stopListening,
        acceptRide, rejectRide,
    } = useRideStore();

    useEffect(() => {
        fetchActive();
        listenForRides();
        return () => stopListening();
    }, []);

    const handleToggle = async (value: boolean) => {
        try {
            await toggleOnline(value);
        } catch {
            Alert.alert('Error', 'Could not update status');
        }
    };

    return (
        <View style={styles.container}>
            {/* Online toggle */}
            <View style={styles.statusBar}>
                <View>
                    <Text style={styles.greeting}>Hey, {provider?.name || 'Driver'}</Text>
                    <Text style={[styles.statusText, { color: isOnline ? GREEN : RED }]}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>
                <Switch
                    value={isOnline}
                    onValueChange={handleToggle}
                    trackColor={{ false: '#334155', true: GREEN }}
                    thumbColor="#fff"
                />
            </View>

            {/* Incoming ride alert */}
            {incomingRide && (
                <View style={styles.incomingCard}>
                    <Text style={styles.incomingTitle}>New Ride Request!</Text>
                    <Text style={styles.incomingRoute}>
                        {incomingRide.pickup} → {incomingRide.dropoff}
                    </Text>
                    <Text style={styles.incomingFare}>
                        ₹{((incomingRide.fareEstimate || 0) / 100).toFixed(0)}
                    </Text>
                    <View style={styles.incomingActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: GREEN }]}
                            onPress={() => acceptRide(incomingRide.id)}
                        >
                            <Text style={styles.actionText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: RED }]}
                            onPress={() => rejectRide(incomingRide.id)}
                        >
                            <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Active rides */}
            <Text style={styles.sectionTitle}>
                Active Rides ({activeBookings.length})
            </Text>

            {activeBookings.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                        {isOnline
                            ? 'Waiting for ride requests...'
                            : 'Go online to receive rides'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={activeBookings}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.rideCard}
                            onPress={() => router.push(`/ride/${item.id}`)}
                        >
                            <View style={styles.rideHeader}>
                                <Text style={styles.rideMode}>{item.transportMode}</Text>
                                <Text style={[
                                    styles.rideState,
                                    { color: item.state === 'IN_PROGRESS' ? GREEN : ACCENT },
                                ]}>
                                    {item.state.replace('_', ' ')}
                                </Text>
                            </View>
                            <Text style={styles.rideRoute}>
                                {item.pickup} → {item.dropoff}
                            </Text>
                            <Text style={styles.rideFare}>
                                ₹{((item.fareEstimate || 0) / 100).toFixed(0)}
                            </Text>
                            {item.user && (
                                <Text style={styles.rideUser}>
                                    Rider: {item.user.name || item.user.phone}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    statusBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, backgroundColor: BRAND, borderBottomWidth: 1, borderBottomColor: '#1e293b',
    },
    greeting: { color: '#fff', fontSize: 18, fontWeight: '700' },
    statusText: { fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 1 },

    incomingCard: {
        margin: 16, padding: 20, backgroundColor: '#1e3a5f',
        borderRadius: 16, borderWidth: 2, borderColor: ACCENT,
    },
    incomingTitle: { color: ACCENT, fontSize: 16, fontWeight: '800', marginBottom: 8 },
    incomingRoute: { color: '#fff', fontSize: 15, marginBottom: 4 },
    incomingFare: { color: GREEN, fontSize: 22, fontWeight: '800', marginBottom: 12 },
    incomingActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', padding: 16, paddingBottom: 8 },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { color: '#475569', fontSize: 15 },

    rideCard: {
        marginHorizontal: 16, marginBottom: 12, padding: 16,
        backgroundColor: '#1e293b', borderRadius: 12,
    },
    rideHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    rideMode: { color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    rideState: { fontSize: 12, fontWeight: '700' },
    rideRoute: { color: '#fff', fontSize: 15, marginBottom: 4 },
    rideFare: { color: GREEN, fontSize: 18, fontWeight: '700' },
    rideUser: { color: '#64748b', fontSize: 12, marginTop: 6 },
});
