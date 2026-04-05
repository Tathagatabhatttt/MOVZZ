import { Request, Response } from 'express';
import {
  activatePass,
  cancelPass,
  getActivePass,
  PASS_PLANS,
  PassPlan,
} from '../services/subscription.service';

// POST /api/v1/subscriptions/activate
export async function activatePassHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const { plan } = req.body;

  if (!plan || !PASS_PLANS[plan as PassPlan]) {
    return res.status(400).json({ success: false, error: 'Invalid plan. Choose LITE, PLUS, or PRO.' });
  }

  try {
    const subscription = await activatePass(userId, plan as PassPlan);
    const config = PASS_PLANS[plan as PassPlan];
    return res.json({
      success: true,
      data: {
        plan: subscription.plan,
        status: subscription.status,
        discountPct: subscription.discountPct,
        noSurge: subscription.noSurge,
        expiresAt: subscription.expiresAt,
        bonusCreditGranted: config.bonusCreditPaise > 0,
        bonusCreditRupees: config.bonusCreditPaise / 100,
        message: `MOVZZY ${plan} activated! ${config.description}.`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/subscriptions/me
export async function getPassHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  try {
    const sub = await getActivePass(userId);

    if (!sub) {
      return res.json({
        success: true,
        data: {
          active: false,
          plans: Object.entries(PASS_PLANS).map(([key, p]) => ({
            id: key,
            name: p.name,
            priceRupees: p.priceRupees,
            discountPct: p.discountPct,
            noSurge: p.noSurge,
            priority: p.priority,
            bonusCreditRupees: p.bonusCreditPaise / 100,
            description: p.description,
          })),
        },
      });
    }

    const config = PASS_PLANS[sub.plan as PassPlan];
    return res.json({
      success: true,
      data: {
        active: true,
        plan: sub.plan,
        name: config?.name ?? sub.plan,
        discountPct: sub.discountPct,
        discountPercent: Math.round(sub.discountPct * 100),
        noSurge: sub.noSurge,
        status: sub.status,
        startDate: sub.startDate,
        expiresAt: sub.expiresAt,
        autoRenew: sub.autoRenew,
        daysRemaining: Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / 86400000)),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/v1/subscriptions/cancel
export async function cancelPassHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  try {
    await cancelPass(userId);
    return res.json({ success: true, message: 'MOVZZY Pass cancelled. Benefits remain until expiry.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
