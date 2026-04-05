import { prisma } from '../config/prisma';

// ─── Plan definitions ──────────────────────────────────────

export const PASS_PLANS = {
  LITE: {
    name: 'MOVZZY LITE',
    pricePaise: 9900,        // ₹99/month
    priceRupees: 99,
    discountPct: 0.05,       // 5% off
    noSurge: true,
    priority: false,
    bonusCreditPaise: 0,
    description: '5% off every ride, no surge pricing',
  },
  PLUS: {
    name: 'MOVZZY PLUS',
    pricePaise: 24900,       // ₹249/month
    priceRupees: 249,
    discountPct: 0.10,       // 10% off
    noSurge: true,
    priority: true,
    bonusCreditPaise: 5000,  // ₹50 bonus credit
    description: '10% off every ride, no surge, ₹50 bonus credit',
  },
  PRO: {
    name: 'MOVZZY PRO',
    pricePaise: 49900,       // ₹499/month
    priceRupees: 499,
    discountPct: 0.15,       // 15% off
    noSurge: true,
    priority: true,
    bonusCreditPaise: 10000, // ₹100 bonus credit
    description: '15% off every ride, no surge, ₹100 bonus credit',
  },
} as const;

export type PassPlan = keyof typeof PASS_PLANS;

// ─── Activate a pass ──────────────────────────────────────

export async function activatePass(userId: string, plan: PassPlan) {
  const config = PASS_PLANS[plan];
  if (!config) throw new Error(`Unknown plan: ${plan}`);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: 'ACTIVE',
      discountPct: config.discountPct,
      noSurge: config.noSurge,
      startDate: new Date(),
      expiresAt,
      autoRenew: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      plan,
      status: 'ACTIVE',
      discountPct: config.discountPct,
      noSurge: config.noSurge,
      expiresAt,
      autoRenew: true,
      updatedAt: new Date(),
    },
  });

  // Grant bonus credits for PLUS / PRO
  if (config.bonusCreditPaise > 0) {
    const creditExpiry = new Date();
    creditExpiry.setDate(creditExpiry.getDate() + 30);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.userCredit.create({
      data: {
        userId,
        userPhone: user?.phone ?? '',
        amount: config.bonusCreditPaise,
        reason: `movzzy_pass_${plan.toLowerCase()}_bonus`,
        expiresAt: creditExpiry,
      },
    });
  }

  return subscription;
}

// ─── Get active pass for user ─────────────────────────────

export async function getActivePass(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) return null;
  if (sub.status !== 'ACTIVE') return null;
  if (sub.expiresAt < new Date()) {
    // Mark expired
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'EXPIRED' },
    });
    return null;
  }

  return sub;
}

// ─── Cancel pass ──────────────────────────────────────────

export async function cancelPass(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) throw new Error('No active pass found');

  return prisma.subscription.update({
    where: { userId },
    data: { status: 'CANCELLED', autoRenew: false },
  });
}

// ─── Apply pass discount to a fare ───────────────────────

export async function applyPassDiscount(
  userId: string,
  farePaise: number,
  hasSurge: boolean,
): Promise<{ discountPaise: number; surgeBlocked: boolean; plan: string | null }> {
  const sub = await getActivePass(userId);

  if (!sub) return { discountPaise: 0, surgeBlocked: false, plan: null };

  const discountPaise = Math.round(farePaise * sub.discountPct);
  const surgeBlocked = sub.noSurge && hasSurge;

  return { discountPaise, surgeBlocked, plan: sub.plan };
}
