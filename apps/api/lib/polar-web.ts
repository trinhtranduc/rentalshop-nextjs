/**
 * #1631 What the web plan page may buy through Polar: the shop's row, the plans sold in the apps, and one offer per
 * configured Polar product (price read from Polar, cached), each with the checkout decision of lib/polar-billing.ts.
 * Shared by GET /api/polar/offers and POST /api/polar/checkout so the page and the checkout never disagree.
 */
import { db } from '@rentalshop/database';
import { inAppPlans, normaliseChannel, type InAppPlan, type PlanTier } from './plan-renewal';
import { fixedPrice, getPolarProduct, polarConfig, productMonths, type PolarConfig, type PolarInterval } from './polar';
import { polarCheckoutDecision, type CheckoutDecision } from './polar-billing';

export interface PolarOffer {
  planId: number;
  tier: PlanTier;
  interval: PolarInterval;
  months: 6 | 12;
  amount: number;
  currency: string;
  productId: string;
  decision: CheckoutDecision;
}

export interface PolarWebContext {
  config: PolarConfig;
  offers: PolarOffer[];
  /** The stored Polar subscription the portal manages (channel POLAR) */
  manage: boolean;
  channel: string;
  autoRenew: boolean;
}

export async function loadPolarWebContext(merchantId: number, now: Date = new Date()): Promise<PolarWebContext> {
  const config = polarConfig();
  const row = await db.prisma.subscription.findUnique({ where: { merchantId }, include: { plan: true } });
  const channel = normaliseChannel(row?.billingChannel);
  const base = {
    config,
    manage: channel === 'POLAR' && !!row?.storeOriginalTransactionId,
    channel,
    autoRenew: row?.autoRenew === true,
  };
  if (!config.enabled) return { ...base, offers: [] };

  const planRows = await db.prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, isActive: true, deletedAt: true },
  });
  const plans: InAppPlan[] = inAppPlans(planRows);

  const found: Omit<PolarOffer, 'decision'>[] = [];
  for (const ref of config.products) {
    const plan = plans.find((p) => p.tier === ref.tier);
    if (!plan) continue;
    try {
      const product = await getPolarProduct(config, ref.productId);
      if (product.is_archived) continue;
      if (productMonths(product) !== ref.months) {
        console.error(`[Polar] Product ${ref.productId} (${ref.key}) does not renew every ${ref.months} months`);
        continue;
      }
      const price = fixedPrice(product);
      if (!price) {
        console.error(`[Polar] Product ${ref.productId} (${ref.key}) has no fixed price`);
        continue;
      }
      found.push({ planId: plan.id, tier: ref.tier, interval: ref.interval, months: ref.months, amount: price.amount, currency: price.currency, productId: ref.productId });
    } catch (error) {
      console.error(`[Polar] Could not read product ${ref.productId} (${ref.key}):`, (error as Error)?.message);
    }
  }

  const offerPlanIds = Array.from(new Set(found.map((o) => o.planId)));
  const rowInput = row
    ? {
        planId: row.planId,
        planName: row.plan?.name ?? null,
        dbStatus: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        billingChannel: row.billingChannel,
        autoRenew: row.autoRenew,
      }
    : null;
  const offers = found.map((o) => ({ ...o, decision: polarCheckoutDecision(rowInput, plans, o.planId, offerPlanIds, now) }));
  return { ...base, offers };
}

/** The buyer's IP for Polar's currency and tax (first `x-forwarded-for` entry); null when it is not an IP */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const first = (headers.get('x-forwarded-for') || headers.get('x-real-ip') || '').split(',')[0].trim();
  return /^[0-9a-fA-F:.]+$/.test(first) && first.length <= 45 ? first : null;
}
