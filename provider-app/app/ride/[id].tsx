import { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, Linking, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRideStore } from '../../stores/rideStore';

const BRAND = '#0d1d35';
const ACCENT = '#60a5fa';
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';

export default function RideDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { activeBookings, startRide, completeRide } = useRideStore();
    const [loading, setLoading] = useState(false);

    const booking = activeBookings.find((b) => b.id === id);

    if (!booking) {
        return (
            <View style={styles.container}>
                <Text style={styles.empty}>Ride not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleStart = async () => {
        setLoading(true);
        try {
            await startRide(booking.id);
            Alert.alert('Ride Started', 'Navigate to the destination.');
        } catch {
            Alert.alert('Error', 'Could not start ride');
        }
        setLoading(false);
    };

    const handleComplete = async () => {
        Alert.alert('Complete Ride', 'Confirm ride completion?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Complete',
                onPress: async () => {
                    setLoading(true);
                    try {
                        await completeRide(booking.id);
                        router.back();
                    } catch {
                        Alert.alert('Error', 'Could not complete ride');
                    }
                    setLoading(false);
                },
            },
        ]);
    };

    const callRider = () => {
        if (booking.user?.phone) {
            Linking.openURL(`tel:${booking.user.phone}`);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.stateBadge, {
                    color: booking.state === 'IN_PROGRESS' ? GREEN : ACCENT,
                }]}>
                    {booking.state.replace('_', ' ')}
                </Text>
            </View>

            {/* Route info */}
            <View style={styles.card}>
                <Text style={styles.label}>PICKUP</Text>
                <Text style={styles.location}>{booking.pickup}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>DROPOFF</Text>
                <Text style={styles.location}>{booking.dropoff}</Text>
            </View>

            {/* Fare + rider */}
            <View style={styles.row}>
                <View style={styles.infoBox}>
                    <Text style={styles.label}>FARE</Text>
                    <Text style={styles.fare}>
                        ₹{((booking.fareEstimate || 0) / 100).toFixed(0)}
                    </Text>
                </View>
                <View style={styles.infoBox}>
                    <Text style={styles.label}>MODE</Text>
                    <Text style={styles.mode}>{booking.transportMode}</Text>
                </View>
            </View>

            {/* Rider contact */}
            {booking.user && (
                <TouchableOpacity style={styles.contactCard} onPress={callRider}>
                    <View>
                        <Text style={styles.riderName}>
                            {booking.user.name || 'Rider'}
                        </Text>
                        <Text style={styles.riderPhone}>{booking.user.phone}</Text>
                    </View>
                    <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                {loading ? (
                    <ActivityIndicator size="large" color={ACCENT} />
                ) : booking.state === 'CONFIRMED' ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: ORANGE }]}
                        onPress={handleStart}
                    >
                        <Text style={styles.actionText}>Start Ride</Text>
                    </TouchableOpacity>
                ) : booking.state === 'IN_PROGRESS' ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: GREEN }]}
                        onPress={handleComplete}
                    >
                        <Text style={styles.actionText}>Complete Ride</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, backgroundColor: BRAND,
    },
    backBtn: { color: ACCENT, fontSize: 16, fontWeight: '600' },
    stateBadge: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },

    card: {
        margin: 16, padding: 20, backgroundColor: '#1e293b', borderRadius: 12,
    },
    label: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    location: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },

    row: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
    infoBox: {
        flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    },
    fare: { color: GREEN, fontSize: 24, fontWeight: '800' },
    mode: { color: ACCENT, fontSize: 16, fontWeight: '700' },

    contactCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        margin: 16, padding: 16, backgroundColor: '#1e293b', borderRadius: 12,
    },
    riderName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    riderPhone: { color: '#64748b', fontSize: 13, marginTop: 2 },
    callIcon: { fontSize: 28 },

    actions: { padding: 16, marginTop: 'auto' },
    actionBtn: { padding: 18, borderRadius: 14, alignItems: 'center' },
    actionText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    empty: { color: '#64748b', textAlign: 'center', marginTop: 100, fontSize: 16 },
    link: { color: ACCENT, textAlign: 'center', marginTop: 12 },
});
