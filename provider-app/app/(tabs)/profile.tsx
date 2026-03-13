import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

const BRAND = '#0d1d35';
const ACCENT = '#60a5fa';
const GREEN = '#22c55e';

export default function ProfileScreen() {
    const { provider, logout } = useAuthStore();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(provider?.name || '');
    const [vehicleModel, setVehicleModel] = useState(provider?.vehicleModel || '');
    const [vehiclePlate, setVehiclePlate] = useState(provider?.vehiclePlate || '');

    const handleSave = async () => {
        try {
            await api.put('/profile', { name, vehicleModel, vehiclePlate });
            setEditing(false);
            Alert.alert('Saved', 'Profile updated');
        } catch {
            Alert.alert('Error', 'Could not update profile');
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    if (!provider) return null;

    return (
        <ScrollView style={styles.container}>
            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{(provider.reliability * 100).toFixed(0)}%</Text>
                    <Text style={styles.statLabel}>Reliability</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{provider.rating.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{provider.totalRides}</Text>
                    <Text style={styles.statLabel}>Total Rides</Text>
                </View>
            </View>

            {/* Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Details</Text>

                <Text style={styles.label}>Name</Text>
                {editing ? (
                    <TextInput style={styles.input} value={name} onChangeText={setName} />
                ) : (
                    <Text style={styles.value}>{provider.name}</Text>
                )}

                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{provider.phone}</Text>

                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>{provider.type.replace('_', ' ')}</Text>

                <Text style={styles.label}>Vehicle Model</Text>
                {editing ? (
                    <TextInput style={styles.input} value={vehicleModel} onChangeText={setVehicleModel} />
                ) : (
                    <Text style={styles.value}>{provider.vehicleModel || '—'}</Text>
                )}

                <Text style={styles.label}>Vehicle Plate</Text>
                {editing ? (
                    <TextInput style={styles.input} value={vehiclePlate} onChangeText={setVehiclePlate} />
                ) : (
                    <Text style={styles.value}>{provider.vehiclePlate || '—'}</Text>
                )}

                {editing ? (
                    <View style={styles.editActions}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditing(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },

    statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
    statBox: {
        flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center',
    },
    statValue: { color: GREEN, fontSize: 24, fontWeight: '800' },
    statLabel: { color: '#64748b', fontSize: 11, marginTop: 4, fontWeight: '600' },

    section: {
        margin: 16, padding: 20, backgroundColor: '#1e293b', borderRadius: 12,
    },
    sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16 },
    label: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 12 },
    value: { color: '#fff', fontSize: 15, marginTop: 4 },

    input: {
        backgroundColor: '#0f172a', borderRadius: 8, padding: 12,
        color: '#fff', fontSize: 15, marginTop: 6,
    },

    editBtn: {
        marginTop: 20, padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: ACCENT, alignItems: 'center',
    },
    editBtnText: { color: ACCENT, fontWeight: '700' },

    editActions: { marginTop: 20, gap: 12 },
    saveBtn: { backgroundColor: ACCENT, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    cancelText: { color: '#64748b', textAlign: 'center' },

    logoutBtn: {
        margin: 16, padding: 16, borderRadius: 12,
        backgroundColor: '#1e293b', alignItems: 'center',
        borderWidth: 1, borderColor: '#ef4444',
    },
    logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});
