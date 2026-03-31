/**
 * ═══════════════════════════════════════════════════════════
 *  RAPIDO SERVICE
 * ═══════════════════════════════════════════════════════════
 *
 *  Integrates Rapido bike-taxi quotes and bookings into MOVZZ.
 *
 *  When RAPIDO_TOKEN is set, makes live API calls to Rapido.
 *  When not set (or on API failure), returns realistic simulated
 *  data so the demo works smoothly without credentials.
 *
 *  ENV VARS (optional — demo works without them):
 *    RAPIDO_TOKEN      Bearer JWT from a Rapido account
 *    RAPIDO_USER_ID    Rapido customer _id
 *    RAPIDO_DEVICE_ID  Device ID used when authenticating
 * ═══════════════════════════════════════════════════════════
 */

const RAPIDO_HOST        = 'auth.rapido.bike';
const RAPIDO_TOKEN       = process.env.RAPIDO_TOKEN       || '';
const RAPIDO_USER_ID     = process.env.RAPIDO_USER_ID     || '';
const RAPIDO_DEVICE_ID   = process.env.RAPIDO_DEVICE_ID   || '385749201836472';
// Rapido's internal bike service type ID (consistent across regions)
const RAPIDO_SERVICE_TYPE = process.env.RAPIDO_SERVICE_TYPE || '57370b61a6855d70057417d1';

export function isRapidoEnabled(): boolean {
    return !!RAPIDO_TOKEN;
}

// ─── Request Headers ─────────────────────────────────────
// Mimics the Rapido Android app (OkHttp 3.6.0)

function buildHeaders(lat: number, lng: number): Record<string, string> {
    const now = new Date();
    const datetime = now.toISOString().replace('T', ' ').slice(0, 19);
    return {
        'deviceid':        RAPIDO_DEVICE_ID,
        'latitude':        String(lat),
        'longitude':       String(lng),
        'appid':           '2',
        'currentdatetime': datetime,
        'internet':        '0',
        'appversion':      '73',
        'Authorization':   `Bearer ${RAPIDO_TOKEN}`,
        'Content-Type':    'application/json; charset=UTF-8',
        'Host':            RAPIDO_HOST,
        'Connection':      'Keep-Alive',
        'Accept-Encoding': 'gzip',
        'User-Agent':      'okhttp/3.6.0',
        'Cache-Control':   'no-cache',
    };
}

// ─── Types ────────────────────────────────────────────────

export interface RapidoQuote {
    requestId:    string;
    serviceId:    string;
    fareRupees:   number;
    etaMin:       number;
}

export interface RapidoBookingResult {
    orderId:      string;
    driverName:   string;
    driverPhone:  string;
    driverRating: number;
    bikeNumber:   string;
    bikeModel:    string;
}

// ─── Fare Estimate ────────────────────────────────────────
// Returns a Rapido fare quote for given pickup/dropoff coords.
// Falls back to simulation on any failure.

export async function getRapidoFareEstimate(params: {
    pickupLat:      number;
    pickupLng:      number;
    pickupAddress:  string;
    dropoffLat:     number;
    dropoffLng:     number;
    dropoffAddress: string;
}): Promise<RapidoQuote> {
    if (!isRapidoEnabled()) {
        return simulateQuote(params);
    }

    try {
        const body = JSON.stringify({
            pickupLocation: {
                addressType: '',
                address:     params.pickupAddress,
                lat:         params.pickupLat,
                lng:         params.pickupLng,
                name:        '',
            },
            dropLocation: {
                addressType: '',
                address:     params.dropoffAddress,
                lat:         params.dropoffLat,
                lng:         params.dropoffLng,
                name:        params.dropoffAddress,
            },
            serviceType: RAPIDO_SERVICE_TYPE,
            customer:    RAPIDO_USER_ID,
            couponCode:  '',
            paymentType: 'cash',
        });

        const res = await fetch('https://auth.rapido.bike/om/api/orders/v2/rideAmount', {
            method:  'POST',
            headers: buildHeaders(params.pickupLat, params.pickupLng),
            body,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const quotes: any[] = data?.data?.quotes;
        if (!quotes?.length) throw new Error('No quotes returned');

        const first = quotes[0];
        return {
            requestId:  data.data.requestId,
            serviceId:  first.serviceId,
            fareRupees: Math.round(Number(first.amount)),
            etaMin:     Math.round(Number(data.data.timeInMts || 5)),
        };

    } catch (err: any) {
        console.warn('[Rapido] Fare estimate failed, using simulation:', err.message);
        return simulateQuote(params);
    }
}

// ─── Book Ride ────────────────────────────────────────────
// Books the ride selected from fare estimate.
// Falls back to simulation on any failure.

export async function bookRapidoRide(params: {
    requestId:      string;
    serviceId:      string;
    pickupLat:      number;
    pickupLng:      number;
    pickupAddress:  string;
    dropoffLat:     number;
    dropoffLng:     number;
    dropoffAddress: string;
}): Promise<RapidoBookingResult> {
    // Simulation IDs start with 'demo_' — never call real API for them
    if (!isRapidoEnabled() || params.requestId.startsWith('demo_')) {
        return simulateBooking();
    }

    try {
        const body = JSON.stringify({
            type:        'booking',
            userType:    'customer',
            serviceType: params.serviceId,
            deviceId:    RAPIDO_DEVICE_ID,
            paymentType: 'cash',
            couponCode:  '',
            dropLocation: {
                lat:     params.dropoffLat,
                lng:     params.dropoffLng,
                address: params.dropoffAddress,
            },
            pickupLocation: {
                lat:     params.pickupLat,
                lng:     params.pickupLng,
                address: params.pickupAddress,
            },
            currentLocation: {
                lat:     params.pickupLat,
                lng:     params.pickupLng,
                address: '',
            },
            userId:    RAPIDO_USER_ID,
            requestId: params.requestId,
        });

        const bookRes = await fetch('https://auth.rapido.bike/rapido/rapido/book', {
            method:  'POST',
            headers: buildHeaders(params.pickupLat, params.pickupLng),
            body,
        });

        if (!bookRes.ok) throw new Error(`HTTP ${bookRes.status}`);

        const bookData = await bookRes.json();
        if (bookData?.info?.status !== 'success') {
            throw new Error(`Rapido booking: ${bookData?.info?.message || 'failed'}`);
        }

        const orderId     = bookData.data._id;
        const callbackUrl = bookData.callback_url;

        // Fetch driver details via callback URL
        try {
            const detailRes = await fetch(
                `https://auth.rapido.bike/rapido/rapido${callbackUrl}`,
                { headers: buildHeaders(params.pickupLat, params.pickupLng) },
            );
            const detail = await detailRes.json();
            return {
                orderId,
                driverName:   detail.data?.riderObj?.name   || 'Rapido Rider',
                driverPhone:  detail.data?.riderObj?.mobile || '',
                driverRating: Number(detail.data?.riderObj?.avgRating) || 4.3,
                bikeNumber:   detail.data?.rider?.bikeNumber || 'TN-XX-XXXX',
                bikeModel:    detail.data?.rider?.bikeModel  || 'Honda Activa',
            };
        } catch {
            // Driver details fetch failed — return order ID with simulated driver
            return { orderId, ...simulateBooking() };
        }

    } catch (err: any) {
        console.warn('[Rapido] Booking failed, using simulation:', err.message);
        return simulateBooking();
    }
}

// ─── Cancel Ride ──────────────────────────────────────────

export async function cancelRapidoRide(params: {
    orderId:    string;
    pickupLat:  number;
    pickupLng:  number;
}): Promise<void> {
    // Simulated orders start with 'rapido_' — no real API to call
    if (!isRapidoEnabled() || params.orderId.startsWith('rapido_')) return;

    try {
        const body = JSON.stringify({
            type:        'cancelled',
            orderId:     params.orderId,
            cancelReason: 'Customer requested cancellation',
            locationDetails: { lat: params.pickupLat, lng: params.pickupLng },
            otherReason: '',
            userId:      RAPIDO_USER_ID,
        });

        await fetch('https://auth.rapido.bike/rapido/rapido/cancel', {
            method:  'POST',
            headers: buildHeaders(params.pickupLat, params.pickupLng),
            body,
        });

    } catch (err: any) {
        console.warn('[Rapido] Cancel failed (non-blocking):', err.message);
    }
}

// ─── Simulation Helpers ───────────────────────────────────
// Used when RAPIDO_TOKEN is not set — returns realistic Chennai
// driver data so the demo looks live even without credentials.

function simulateQuote(params: {
    pickupLat: number; pickupLng: number;
    dropoffLat: number; dropoffLng: number;
}): RapidoQuote {
    // Haversine × road factor to estimate distance
    const latDiff = (params.dropoffLat - params.pickupLat) * 111;
    const lngDiff = (params.dropoffLng - params.pickupLng) * 111 *
        Math.cos(params.pickupLat * Math.PI / 180);
    const distKm  = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 1.35;

    const fare = Math.max(30, Math.round(distKm * 7));
    const eta  = 3 + Math.floor(Math.random() * 4); // 3–6 min

    return {
        requestId:  `demo_${Date.now()}`,
        serviceId:  RAPIDO_SERVICE_TYPE,
        fareRupees: fare,
        etaMin:     eta,
    };
}

const DEMO_DRIVERS: RapidoBookingResult[] = [
    {
        orderId:      '',
        driverName:   'Rajan Kumar',
        driverPhone:  '98765XXXXX',
        driverRating: 4.6,
        bikeNumber:   'TN 22 AK 3456',
        bikeModel:    'Honda Activa 6G',
    },
    {
        orderId:      '',
        driverName:   'Suresh M',
        driverPhone:  '97654XXXXX',
        driverRating: 4.4,
        bikeNumber:   'TN 09 BK 7890',
        bikeModel:    'TVS Jupiter',
    },
    {
        orderId:      '',
        driverName:   'Mani Shankar',
        driverPhone:  '99887XXXXX',
        driverRating: 4.7,
        bikeNumber:   'TN 04 CB 1234',
        bikeModel:    'Suzuki Access 125',
    },
];

function simulateBooking(): RapidoBookingResult {
    const d = DEMO_DRIVERS[Math.floor(Math.random() * DEMO_DRIVERS.length)];
    return { ...d, orderId: `rapido_${Date.now()}` };
}
