import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';

const BRAND = '#0d1d35';
const ACCENT = '#60a5fa';

export default function LoginScreen() {
    const { otpSent, phone, isLoading, error, sendOTP, verifyOTP } = useAuthStore();
    const [input, setInput] = useState('');
    const [otp, setOtp] = useState('');

    const handleSendOTP = () => {
        if (input.length >= 10) sendOTP(input);
    };

    const handleVerify = () => {
        if (otp.length === 6) verifyOTP(phone, otp);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                <Text style={styles.brand}>
                    MOV<Text style={{ color: ACCENT }}>ZZ</Text>
                </Text>
                <Text style={styles.subtitle}>Driver Partner</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {!otpSent ? (
                    <>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="9876543210"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={input}
                            onChangeText={setInput}
                            maxLength={13}
                        />
                        <TouchableOpacity
                            style={[styles.btn, input.length < 10 && styles.btnDisabled]}
                            onPress={handleSendOTP}
                            disabled={isLoading || input.length < 10}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Send OTP</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>OTP sent to {phone}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="123456"
                            placeholderTextColor="#64748b"
                            keyboardType="number-pad"
                            value={otp}
                            onChangeText={setOtp}
                            maxLength={6}
                        />
                        <TouchableOpacity
                            style={[styles.btn, otp.length < 6 && styles.btnDisabled]}
                            onPress={handleVerify}
                            disabled={isLoading || otp.length < 6}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Verify OTP</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BRAND },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
    brand: { fontSize: 42, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: 2 },
    subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 48, marginTop: 4 },
    label: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
    input: {
        backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
        fontSize: 18, color: '#fff', marginBottom: 16, letterSpacing: 2,
    },
    btn: { backgroundColor: ACCENT, borderRadius: 12, padding: 16, alignItems: 'center' },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    error: { color: '#f87171', textAlign: 'center', marginBottom: 16, fontSize: 13 },
});
