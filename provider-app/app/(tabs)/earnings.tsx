import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

const GREEN = '#22c55e';
const ACCENT = '#60a5fa';

interface EarningsPeriod {
    rides: number;
    revenue: number;
    commission: number;
    net: number;
}

interface Payout {
    id: string;
    totalRides: number;
    netPayout: number;
    status: string;
    createdAt: string;
}

interface EarningsData {
    today: EarningsPeriod;
    week: EarningsPeriod;
    month: EarningsPeriod;
    payouts: Payout[];
}

export default function EarningsScreen() {
    const [data, setData] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const res = await api.get('/earnings');
            setData(res.data.data);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={ACCENT} />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={styles.empty}>Could not load earnings</Text>
            </View>
        );
    }

    const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

    return (
        <View style={styles.container}>
            {/* Summary cards */}
            <View style={styles.cards}>
                {[
                    { label: 'Today', ...data.today },
                    { label: 'This Week', ...data.week },
                    { label: 'This Month', ...data.month },
                ].map((period) => (
                    <View key={period.label} style={styles.card}>
                        <Text style={styles.cardLabel}>{period.label}</Text>
                        <Text style={styles.cardAmount}>{rupees(period.net)}</Text>
                        <Text style={styles.cardRides}>{period.rides} rides</Text>
                    </View>
                ))}
            </View>

            {/* Commission info */}
            <View style={styles.commissionBar}>
                <Text style={styles.commissionText}>
                    Commission: {rupees(data.month.commission)} this month (10%)
                </Text>
                <Text style={styles.commissionText}>Payment: T+2 days</Text>
            </View>

            {/* Payout history */}
            <Text style={styles.sectionTitle}>Payout History</Text>
            {data.payouts.length === 0 ? (
                <Text style={styles.empty}>No payouts yet</Text>
            ) : (
                <FlatList
                    data={data.payouts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.payoutRow}>
                            <View>
                                <Text style={styles.payoutAmount}>{rupees(item.netPayout)}</Text>
                                <Text style={styles.payoutRides}>{item.totalRides} rides</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.payoutStatus, {
                                    color: item.status === 'COMPLETED' ? GREEN : '#f59e0b',
                                }]}>
                                    {item.status}
                                </Text>
                                <Text style={styles.payoutDate}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

    cards: { flexDirection: 'row', padding: 16, gap: 10 },
    card: {
        flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center',
    },
    cardLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    cardAmount: { color: GREEN, fontSize: 22, fontWeight: '800', marginTop: 6 },
    cardRides: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

    commissionBar: {
        marginHorizontal: 16, padding: 12, backgroundColor: '#1e293b',
        borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between',
    },
    commissionText: { color: '#64748b', fontSize: 12 },

    sectionTitle: {
        color: '#94a3b8', fontSize: 13, fontWeight: '600',
        padding: 16, paddingBottom: 8,
    },

    payoutRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginHorizontal: 16, marginBottom: 10, padding: 14,
        backgroundColor: '#1e293b', borderRadius: 10,
    },
    payoutAmount: { color: '#fff', fontSize: 16, fontWeight: '700' },
    payoutRides: { color: '#64748b', fontSize: 12, marginTop: 2 },
    payoutStatus: { fontSize: 12, fontWeight: '700' },
    payoutDate: { color: '#475569', fontSize: 11, marginTop: 2 },

    empty: { color: '#475569', textAlign: 'center', padding: 20 },
});
