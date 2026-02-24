/**
 * ═══════════════════════════════════════════════════════════
 *  MOVZZ API Service Layer
 *  Connects the React frontend to the Express backend
 *  Includes Namma Yatri integration + ride search
 * ═══════════════════════════════════════════════════════════
 */

const API_BASE = '/api/v1';

// ─── Token Management ───────────────────────────────────

function getToken() {
    return localStorage.getItem('movzz_token');
}

function setToken(token) {
    localStorage.setItem('movzz_token', token);
}

function getUser() {
    try {
        const raw = localStorage.getItem('movzz_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('movzz_user', JSON.stringify(user));
}

export function isLoggedIn() {
    return !!getToken();
}

export function logout() {
    localStorage.removeItem('movzz_token');
    localStorage.removeItem('movzz_user');
}

export function getCurrentUser() {
    return getUser();
}

// ─── Authenticated Fetch Helper ─────────────────────────

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

async function apiRequest(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                ...authHeaders(),
                ...options.headers,
            },
        });
        const data = await res.json();

        // Auto-logout on 401
        if (res.status === 401) {
            logout();
        }

        return { ok: res.ok, status: res.status, ...data };
    } catch (error) {
        console.error(`API Error [${path}]:`, error);
        return { ok: false, success: false, error: 'Network error. Is the backend running?' };
    }
}

// ─── Health Check ───────────────────────────────────────

export async function checkHealth() {
    try {
        const res = await fetch('/health');
        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch {
        return { ok: false, status: 'unreachable', error: 'Backend is not running' };
    }
}

// ─── Auth ───────────────────────────────────────────────

export async function sendOTP(phone) {
    return apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
    });
}

export async function verifyOTP(phone, otp) {
    const data = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
    });

    // Store token and user on successful login
    if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
    }

    return data;
}

// ─── Ride Search (Namma Yatri + Aggregated) ─────────────

export async function searchRides({
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    mode = 'cab',
}) {
    return apiRequest('/rides/search', {
        method: 'POST',
        body: JSON.stringify({
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            mode,
        }),
    });
}

// ─── Quotes (New — scored + tagged ride options) ────────

export async function getQuotes({
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    transportMode = 'cab',
}) {
    return apiRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            transportMode,
        }),
    });
}

export async function selectRideEstimate(estimateId, provider) {
    return apiRequest('/rides/select', {
        method: 'POST',
        body: JSON.stringify({ estimateId, provider }),
    });
}

// ─── Bookings ───────────────────────────────────────────

export async function createBooking({
    pickup,
    dropoff,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    fareEstimate,
    tripType = 'HIGH_RELIABILITY',
}) {
    return apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
            pickup,
            dropoff,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            fareEstimate,
            tripType,
        }),
    });
}

export async function getBookingStatus(bookingId) {
    return apiRequest(`/bookings/${bookingId}`);
}

export async function getUserBookings(page = 1, limit = 10) {
    return apiRequest(`/bookings?page=${page}&limit=${limit}`);
}

export async function cancelBooking(bookingId) {
    return apiRequest(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
    });
}

export async function getUserCredits() {
    return apiRequest('/bookings/credits');
}

// ─── Admin ──────────────────────────────────────────────

export async function getAdminDashboard() {
    return apiRequest('/admin/dashboard');
}

export async function getAdminProviders() {
    return apiRequest('/admin/providers');
}

// ─── Booking Status Polling ─────────────────────────────
// Polls booking status every `interval` ms, calls `onUpdate` with each update
// Returns a stop function

export function pollBookingStatus(bookingId, onUpdate, interval = 3000) {
    let active = true;

    const poll = async () => {
        if (!active) return;

        const data = await getBookingStatus(bookingId);
        if (data.success) {
            onUpdate(data.data);

            // Stop polling on terminal states
            const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'MANUAL_ESCALATION'];
            if (terminalStates.includes(data.data?.state)) {
                active = false;
                return;
            }
        }

        if (active) {
            setTimeout(poll, interval);
        }
    };

    poll();

    // Return stop function
    return () => {
        active = false;
    };
}
