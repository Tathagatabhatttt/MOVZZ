/**
 * Mock Provider Controller
 * Simulates external cab company APIs for pre-production testing.
 * When real cab companies integrate, just update Provider.apiEndpoint URL — no code changes.
 */

import { Request, Response } from 'express';

// ─── Provider Configurations ──────────────────────────────

const PROVIDER_CONFIGS: Record<string, {
    name: string;
    availabilityRate: number;  // 0–1
    basePriceRupees: number;
    avgEtaMin: number;
    avgEtaMax: number;
    responseDelayMs: number;
}> = {
    fastcabs: {
        name: 'FastCabs Chennai',
        availabilityRate: 0.80,
        basePriceRupees: 450,
        avgEtaMin: 6,
        avgEtaMax: 10,
        responseDelayMs: 1000,
    },
    reliablerides: {
        name: 'ReliableRides',
        availabilityRate: 0.75,
        basePriceRupees: 480,
        avgEtaMin: 8,
        avgEtaMax: 13,
        responseDelayMs: 800,
    },
    quickride: {
        name: 'QuickRide Express',
        availabilityRate: 0.60,
        basePriceRupees: 420,
        avgEtaMin: 10,
        avgEtaMax: 15,
        responseDelayMs: 1500,
    },
    premiumcars: {
        name: 'Premium Cars Chennai',
        availabilityRate: 0.85,
        basePriceRupees: 550,
        avgEtaMin: 4,
        avgEtaMax: 8,
        responseDelayMs: 700,
    },
};

// ─── Tamil Driver Names ──────────────────────────────────

const DRIVER_NAMES = [
    'Karthik Kumar', 'Ramesh Babu', 'Suresh Murugan', 'Vijay Selvam', 'Arun Chandran',
    'Senthil Rajan', 'Manikandan Pillai', 'Pradeep Nair', 'Dinesh Arumugam', 'Balamurugan Raja',
    'Anbarasan Krishnan', 'Govindaraj Patel', 'Muthu Kannan', 'Sathish Velu', 'Praveen Sundaram',
    'Harish Natarajan', 'Deepak Venkat', 'Rajkumar Iyer', 'Sivakumar Periyar', 'Ganesh Swamy',
    'Tamil Selvan', 'Muthuraman Durai', 'Arumugam Siva', 'Lakshman Pandian', 'Palaniappan R',
    'Elangovan Kumar', 'Chelladurai Raj', 'Boopalan Thangam', 'Vignesh Subramanian', 'Nithish Kumar',
];

// ─── Chennai TN Plate Vehicles ───────────────────────────

const VEHICLES: Array<{ model: string; platePrefix: string }> = [
    { model: 'Maruti Suzuki Swift Dzire', platePrefix: 'TN01' },
    { model: 'Honda City', platePrefix: 'TN02' },
    { model: 'Hyundai Grand i10', platePrefix: 'TN03' },
    { model: 'Toyota Etios', platePrefix: 'TN04' },
    { model: 'Maruti Suzuki Ciaz', platePrefix: 'TN09' },
    { model: 'Hyundai Xcent', platePrefix: 'TN10' },
    { model: 'Tata Tigor', platePrefix: 'TN17' },
    { model: 'Renault Kwid', platePrefix: 'TN19' },
    { model: 'Maruti Ertiga', platePrefix: 'TN20' },
    { model: 'Volkswagen Vento', platePrefix: 'TN22' },
    { model: 'Toyota Innova', platePrefix: 'TN04' },
    { model: 'Kia Seltos', platePrefix: 'TN01' },
    { model: 'Hyundai Creta', platePrefix: 'TN07' },
    { model: 'Maruti Baleno', platePrefix: 'TN11' },
    { model: 'Honda Amaze', platePrefix: 'TN18' },
];

// ─── Helpers ─────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
    return `+91${randInt(7000000000, 9999999999)}`;
}

function randomVehicle() {
    const v = VEHICLES[randInt(0, VEHICLES.length - 1)];
    const letters = 'ABCDEFGHJKLMNPRSTUVWXY';
    const alpha = letters[randInt(0, letters.length - 1)] + letters[randInt(0, letters.length - 1)];
    const num = String(randInt(1000, 9999));
    return `${v.model} (${v.platePrefix}${alpha}${num})`;
}

function generateQuoteId(providerId: string) {
    return `QT${providerId.toUpperCase().slice(0, 4)}${Date.now()}`;
}

function generateBookingId(providerId: string) {
    return `BK${providerId.toUpperCase().slice(0, 4)}${Date.now()}`;
}

// ─── Endpoint: Check Availability ───────────────────────

export async function checkAvailability(req: Request, res: Response): Promise<void> {
    const { providerId } = req.params;
    const config = PROVIDER_CONFIGS[providerId];

    if (!config) {
        res.status(404).json({ error: `Unknown provider: ${providerId}` });
        return;
    }

    await delay(config.responseDelayMs);

    const isAvailable = Math.random() < config.availabilityRate;
    const eta = randInt(config.avgEtaMin, config.avgEtaMax);
    const priceVariance = 1 + (Math.random() - 0.5) * 0.15; // ±7.5%
    const price = Math.round(config.basePriceRupees * priceVariance);

    if (!isAvailable) {
        res.json({
            status: 'unavailable',
            provider_id: providerId,
            provider_name: config.name,
            reason: 'No drivers available in your area',
        });
        return;
    }

    const quoteValidUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    res.json({
        status: 'available',
        provider_id: providerId,
        provider_name: config.name,
        quote_id: generateQuoteId(providerId),
        quote_valid_until: quoteValidUntil,
        driver: {
            name: DRIVER_NAMES[randInt(0, DRIVER_NAMES.length - 1)],
            vehicle: randomVehicle(),
            rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
            phone: randomPhone(),
        },
        ride_details: {
            estimated_price: price,
            eta_minutes: eta,
        },
    });
}

// ─── Endpoint: Book Ride ─────────────────────────────────

export async function bookRide(req: Request, res: Response): Promise<void> {
    const { providerId } = req.params;
    const config = PROVIDER_CONFIGS[providerId];

    if (!config) {
        res.status(404).json({ error: `Unknown provider: ${providerId}` });
        return;
    }

    await delay(500);

    const isSuccessful = Math.random() < 0.96;

    if (!isSuccessful) {
        res.status(400).json({
            status: 'failed',
            provider_id: providerId,
            reason: 'Driver became unavailable at the last moment',
            refund_status: 'processed',
            refund_amount: 200,
        });
        return;
    }

    const driverName = DRIVER_NAMES[randInt(0, DRIVER_NAMES.length - 1)];
    const driverVehicle = randomVehicle();
    const driverPhone = randomPhone();
    const eta = randInt(config.avgEtaMin, config.avgEtaMax);

    res.json({
        status: 'confirmed',
        booking_id: generateBookingId(providerId),
        provider_id: providerId,
        provider_name: config.name,
        driver: {
            name: driverName,
            vehicle: driverVehicle,
            phone: driverPhone,
            rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
            current_location: {
                latitude: 13.0827 + (Math.random() - 0.5) * 0.02,
                longitude: 80.2707 + (Math.random() - 0.5) * 0.02,
            },
        },
        confirmation_message: `Ride confirmed! ${driverName} arriving in ${eta} minutes.`,
        eta_minutes: eta,
        // Flat fields for MOVZZY booking.service.ts to read
        driverName,
        driverVehicle,
        driverPhone,
        eta,
    });
}

// ─── Endpoint: Track Ride ────────────────────────────────

export async function trackRide(req: Request, res: Response): Promise<void> {
    const { providerId } = req.params;
    const config = PROVIDER_CONFIGS[providerId];

    if (!config) {
        res.status(404).json({ error: `Unknown provider: ${providerId}` });
        return;
    }

    // Simulate driver slowly approaching pickup
    res.json({
        provider_id: providerId,
        booking_id: req.query.booking_id || 'unknown',
        status: 'en_route',
        driver_location: {
            latitude: 13.0827 + (Math.random() - 0.5) * 0.01,
            longitude: 80.2707 + (Math.random() - 0.5) * 0.01,
        },
        eta_minutes: randInt(1, 8),
    });
}
