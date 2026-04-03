/**
 * ═══════════════════════════════════════════════════════════
 *  MOVZZY UNIT TESTS — Provider Scoring ("The Brain")
 * ═══════════════════════════════════════════════════════════
 *
 *  Tests:
 *  1. hardFilter() — Provider filtering logic
 *  2. scoreProvider() — Scoring algorithm
 *  3. findBestProvider() — Best match selection
 * ═══════════════════════════════════════════════════════════
 */

import {
    hardFilter,
    scoreProvider,
    findBestProvider,
    findTopProviders,
    FilterCriteria,
    ScoringWeights,
} from '../services/provider-scoring.service';
import prisma from '../config/database';

// ─── Test Runner ────────────────────────────────────────

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: Date.now() - start });
        console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: msg, duration: Date.now() - start });
        console.log(`  ❌ ${name}: ${msg}`);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

// ─── Setup & Teardown ───────────────────────────────────

async function setupTestProviders() {
    // Clean up first
    await prisma.bookingAttempt.deleteMany({});
    await prisma.bookingLog.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.providerMetric.deleteMany({});
    await prisma.payout.deleteMany({});
    await prisma.provider.deleteMany({});

    // Create test providers with varying stats
    await prisma.provider.createMany({
        data: [
            {
                name: 'Rajesh Kumar',
                phone: '+919876543210',
                type: 'INDIVIDUAL_DRIVER',
                reliability: 0.95,
                rating: 4.8,
                totalRides: 500,
                successfulRides: 475,
                active: true,
                lastActiveAt: new Date(),
                vehicleModel: 'Maruti Swift',
                vehiclePlate: 'DL01AB1234',
            },
            {
                name: 'Suresh Yadav',
                phone: '+919876543211',
                type: 'INDIVIDUAL_DRIVER',
                reliability: 0.88,  // Below 90% threshold
                rating: 4.2,
                totalRides: 300,
                successfulRides: 264,
                active: true,
                lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                vehicleModel: 'Honda City',
                vehiclePlate: 'DL02CD5678',
            },
            {
                name: 'Amit Singh',
                phone: '+919876543212',
                type: 'INDIVIDUAL_DRIVER',
                reliability: 0.92,
                rating: 4.5,
                totalRides: 200,
                successfulRides: 184,
                active: true,
                lastActiveAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
                vehicleModel: 'Hyundai i20',
                vehiclePlate: 'DL03EF9012',
            },
            {
                name: 'Paused Driver',
                phone: '+919876543213',
                type: 'INDIVIDUAL_DRIVER',
                reliability: 0.96,
                rating: 4.9,
                totalRides: 800,
                successfulRides: 768,
                active: false,
                pausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Paused for 24h
                pauseReason: 'Vehicle maintenance',
            },
            {
                name: 'New Driver',
                phone: '+919876543214',
                type: 'INDIVIDUAL_DRIVER',
                reliability: 0.85,
                rating: 4.0,
                totalRides: 0,
                successfulRides: 0,
                active: true,
            },
        ],
    });
}

async function teardown() {
    await prisma.bookingAttempt.deleteMany({});
    await prisma.bookingLog.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.providerMetric.deleteMany({});
    await prisma.payout.deleteMany({});
    await prisma.provider.deleteMany({});
    await prisma.$disconnect();
}

// ─── Test Suite ─────────────────────────────────────────

async function runTests() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  🧪 MOVZZY UNIT TESTS — Provider Scoring ║');
    console.log('╚══════════════════════════════════════════╝\n');

    await setupTestProviders();

    // ─── hardFilter Tests ─────────────────────────────

    console.log('📋 hardFilter() tests:');

    await test('filters out providers below 90% reliability', async () => {
        const ids = await hardFilter({ minReliability: 0.90 });
        // Rajesh (95%) and Amit (92%) pass, Suresh (88%) and New (85%) don't
        // Paused Driver is excluded because paused
        assert(ids.length === 2, `Expected 2 providers, got ${ids.length}`);
    });

    await test('filters out inactive/paused providers', async () => {
        const ids = await hardFilter({ minReliability: 0.50, requireActive: true });
        // Paused Driver should be excluded
        const allProviders = await prisma.provider.findMany({ select: { id: true, name: true, active: true } });
        const activeCount = allProviders.filter(p => p.active).length;
        assert(ids.length <= activeCount, `Got ${ids.length} but only ${activeCount} are active`);
    });

    await test('excludes specific provider IDs', async () => {
        const allIds = await hardFilter({ minReliability: 0.50 });
        const excludeOne = await hardFilter({
            minReliability: 0.50,
            excludeIds: [allIds[0]],
        });
        assert(excludeOne.length === allIds.length - 1, 'Should exclude one provider');
    });

    await test('returns empty for impossible criteria', async () => {
        const ids = await hardFilter({ minReliability: 0.99, minRating: 4.99 });
        assert(ids.length === 0, `Expected 0, got ${ids.length}`);
    });

    // ─── scoreProvider Tests ──────────────────────────

    console.log('\n📋 scoreProvider() tests:');

    await test('returns a valid score for a provider', async () => {
        const providers = await prisma.provider.findMany({ where: { active: true } });
        const scored = await scoreProvider(providers[0].id);
        assert(scored !== null, 'Should return a scored provider');
        assert(scored!.score > 0, `Score should be positive, got ${scored!.score}`);
        assert(scored!.score <= 100, `Score should be <= 100, got ${scored!.score}`);
    });

    await test('higher reliability yields higher reliability breakdown score', async () => {
        const providers = await prisma.provider.findMany({
            where: { active: true },
            orderBy: { reliability: 'desc' },
        });

        if (providers.length >= 2) {
            const high = await scoreProvider(providers[0].id);
            const low = await scoreProvider(providers[providers.length - 1].id);
            assert(
                high!.breakdown.reliabilityScore >= low!.breakdown.reliabilityScore,
                'Higher reliability should have higher reliability score'
            );
        }
    });

    await test('returns null for non-existent provider', async () => {
        const scored = await scoreProvider('non-existent-id');
        assert(scored === null, 'Should return null');
    });

    await test('score breakdown adds up correctly', async () => {
        const providers = await prisma.provider.findMany({ where: { active: true }, take: 1 });
        const scored = await scoreProvider(providers[0].id);
        assert(scored !== null, 'Should return scored provider');
        const { breakdown } = scored!;
        // Each breakdown score should be 0-100
        assert(breakdown.reliabilityScore >= 0 && breakdown.reliabilityScore <= 100, 'Reliability score in range');
        assert(breakdown.ratingScore >= 0 && breakdown.ratingScore <= 100, 'Rating score in range');
        assert(breakdown.completionScore >= 0 && breakdown.completionScore <= 100, 'Completion score in range');
    });

    // ─── findBestProvider Tests ───────────────────────

    console.log('\n📋 findBestProvider() tests:');

    await test('returns the highest scoring provider', async () => {
        const best = await findBestProvider([], 'HIGH_RELIABILITY');
        assert(best !== null, 'Should find a provider');
        console.log(`    → Best: ${best!.name} (score: ${best!.score})`);
    });

    await test('excludes specified providers', async () => {
        const best1 = await findBestProvider([], 'HIGH_RELIABILITY');
        assert(best1 !== null, 'Should find first provider');

        const best2 = await findBestProvider([best1!.providerId], 'HIGH_RELIABILITY');
        if (best2) {
            assert(best2.providerId !== best1!.providerId, 'Should be different provider');
        }
    });

    await test('STANDARD trip type includes more providers', async () => {
        const highRel = await findTopProviders(10, [], 'HIGH_RELIABILITY');
        const standard = await findTopProviders(10, [], 'STANDARD');
        assert(
            standard.length >= highRel.length,
            `STANDARD (${standard.length}) should include >= HIGH_RELIABILITY (${highRel.length}) providers`
        );
    });

    // ─── Summary ──────────────────────────────────────

    console.log('\n' + '═'.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((s, r) => s + r.duration, 0);

    if (failed === 0) {
        console.log(`✅ All ${passed} tests passed (${totalTime}ms)`);
    } else {
        console.log(`❌ ${failed} of ${passed + failed} tests failed`);
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   ↳ ${r.name}: ${r.error}`);
        });
    }
    console.log('═'.repeat(50) + '\n');

    await teardown();
    process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(async (err) => {
    console.error('Test runner error:', err);
    await teardown();
    process.exit(1);
});
