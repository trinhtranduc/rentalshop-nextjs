/**
 * #1459 Plan renewal in the apps: which store product sells which plan, and when a shop may renew or upgrade.
 * The ONE place for the "≤ 7 days left" rule; the apps only follow `canRenew` / `canUpgrade` / `purchasablePlanIds`.
 *
 * Pure and import-light (relative imports, like installments.ts) so rule tests and route tests stay fast.
 */
import { civilDaysBetween } from '../../../packages/utils/src/core/billing-dates';

export type PlanTier = 'basic' | 'professional';
export type BillingChannel = 'APP_STORE' | 'PLAY_STORE' | 'LEMON' | 'MANUAL';

/** Renewing the same plan opens this many Vietnam days before the period ends (0 = the last day). */
export const RENEW_WINDOW_DAYS = 7;

const TIER_RANK: Record<PlanTier, number> = { basic: 1, professional: 2 };

export interface StoreProduct {
  tier: PlanTier;
  months: 6 | 12;
}

/**
 * App Store product ids = Google Play subscription ids. Basic keeps the ids the apps already ship;
 * Professional is new in #1459 (the owner creates them in App Store Connect, Google Play and RevenueCat).
 */
export const STORE_PRODUCTS: Record<string, StoreProduct> = {
  anyrent_merchant_semi_annual: { tier: 'basic', months: 6 },
  anyrent_merchant_annual: { tier: 'basic', months: 12 },
  anyrent_professional_semi_annual: { tier: 'professional', months: 6 },
  anyrent_professional_annual: { tier: 'professional', months: 12 },
};

/** `anyrent_merchant_annual` or Google Play's `anyrent_merchant_annual:annual` → its tier and months; unknown → null. */
export function storeProduct(productId: string | null | undefined): (StoreProduct & { id: string }) | null {
  if (!productId) return null;
  const id = String(productId).split(':')[0].trim();
  const product = STORE_PRODUCTS[id];
  return product ? { ...product, id } : null;
}

/** "Basic" → basic, "Professional" / "Pro" → professional; Trial, Enterprise and others have no store products. */
export function planTierFromName(name: string | null | undefined): PlanTier | null {
  const n = String(name ?? '').trim().toLowerCase();
  if (n === 'basic' || n.startsWith('basic ')) return 'basic';
  if (n === 'professional' || n === 'pro' || n.startsWith('professional ') || n.startsWith('pro ')) return 'professional';
  return null;
}

export function tierRank(tier: PlanTier | null | undefined): number {
  return tier ? TIER_RANK[tier] : 0;
}

/** Store product ids of a plan, for `GET /api/plans` (`storeProductIds`); null for plans not sold in the apps. */
export function storeProductIdsForPlanName(name: string | null | undefined): { semiAnnual: string; annual: string } | null {
  const tier = planTierFromName(name);
  if (!tier) return null;
  const ids = Object.entries(STORE_PRODUCTS).filter(([, p]) => p.tier === tier);
  const semiAnnual = ids.find(([, p]) => p.months === 6)?.[0];
  const annual = ids.find(([, p]) => p.months === 12)?.[0];
  return semiAnnual && annual ? { semiAnnual, annual } : null;
}

/** RevenueCat `store` → our channel. Stores we do not sell on count as MANUAL. */
export function channelFromStore(store: string | null | undefined): BillingChannel {
  const s = String(store ?? '').toUpperCase();
  if (s === 'APP_STORE' || s === 'MAC_APP_STORE') return 'APP_STORE';
  if (s === 'PLAY_STORE') return 'PLAY_STORE';
  return 'MANUAL';
}

/** The store the calling app buys from: iOS (X-Device-Type: ios) → APP_STORE, Android → PLAY_STORE, others none */
export function deviceStoreFromHeaders(headers: { get(name: string): string | null } | null | undefined): 'APP_STORE' | 'PLAY_STORE' | null {
  const device = (headers?.get?.('x-device-type') || '').toLowerCase();
  if (device === 'ios') return 'APP_STORE';
  if (device === 'android') return 'PLAY_STORE';
  return null;
}

/**
 * A3 REVENUECAT_SANDBOX_MERCHANT_IDS: comma-separated merchant ids, e.g. `2` or `2,5`. The id is the number in
 * `merchant_<id>`, which is Merchant.id (the ID column of the admin Merchants list). Spaces are trimmed; anything that is
 * not a whole positive number is ignored.
 */
export function parseSandboxMerchantIds(raw: string | null | undefined): number[] {
  return String(raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map((part) => parseInt(part, 10))
    .filter((id) => id > 0);
}

export function normaliseChannel(raw: string | null | undefined): BillingChannel {
  return raw === 'APP_STORE' || raw === 'PLAY_STORE' || raw === 'LEMON' ? raw : 'MANUAL';
}

/**
 * A10: a renewal recorded by the admin, a manual payment or a SePay transfer when no store plan runs: the shop is not on a
 * store subscription any more (the store fields would make the apps and the refund handling act on a subscription that no
 * longer pays). With a store plan running, `manualExtensionBilling` adds the time to the credit instead (A13).
 */
export const MANUAL_BILLING = { billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, billingIssueAt: null } as const;

// ─── A13 renewal credit (owner, 2026-11-03) ─────────────────────────────────
// "A renewal always starts from the old expiry, never from today; the shop must not lose remaining days" (trial included).
// The store bills on its own dates; the shop keeps a constant credit on top: currentPeriodEnd = store expiration +
// storeBonusMs. Phase 2 (Lemon Squeezy) uses the same model.

/** The fields of a subscription row the credit rules read */
export interface CreditRow {
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  billingChannel?: string | null;
  storeProductId?: string | null;
  autoRenew?: boolean | null;
  storeBonusMs?: number | null;
  billingIssueAt?: Date | string | null;
}

export function isStoreChannel(channel: string | null | undefined): channel is 'APP_STORE' | 'PLAY_STORE' {
  return channel === 'APP_STORE' || channel === 'PLAY_STORE';
}

/** The stored credit in ms (null or negative = none) */
export function creditMs(row: Pick<CreditRow, 'storeBonusMs'> | null | undefined): number {
  const value = Number(row?.storeBonusMs ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function endMs(row: CreditRow | null | undefined): number | null {
  if (!row?.currentPeriodEnd) return null;
  const ms = new Date(row.currentPeriodEnd).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The credit a store purchase or renewal carries (A13 designs 1 and 3):
 * - nothing left at the purchase (expired, a resubscribe after the end): 0;
 * - the same store subscription going on (a renewal; an upgrade or new product in the same store, which prorates its own
 *   days): the credit it had, capped at what is left (a renewal charged late used some of it);
 * - a new store subscription (first purchase, after a manual / trial / Lemon period, on the other store): the days left.
 */
export function storeCreditForPurchase(existing: CreditRow | null | undefined, channel: string, purchasedAt: Date): number {
  const end = endMs(existing);
  if (!existing || end === null) return 0;
  const left = Math.max(0, end - purchasedAt.getTime());
  if (left === 0) return 0;
  const sameStore = isStoreChannel(existing.billingChannel) && existing.billingChannel === channel && !!existing.storeProductId;
  return sameStore ? Math.min(creditMs(existing), left) : left;
}

/** A store plan (App Store / Google Play) still in its period: auto-renewing, or auto-renew off but not ended */
export function isRunningStoreSubscription(row: CreditRow | null | undefined, now: Date = new Date()): boolean {
  const end = endMs(row);
  return (
    !!row && isStoreChannel(row.billingChannel) && !!row.storeProductId && String(row.status ?? '').toUpperCase() !== 'EXPIRED' &&
    end !== null && end > now.getTime()
  );
}

/**
 * What an extension by the admin, a manual payment or a SePay transfer writes (A13 design 5, corrects A10):
 * - a store plan still running: the extra time joins the credit; channel, auto-renew, product, start, price and the cancel
 *   fields stay as the store set them, so the next store date keeps the extension;
 * - otherwise (A10): the shop is manual, with no store fields and no credit.
 */
export function manualExtensionBilling(
  row: CreditRow,
  newEnd: Date,
  now: Date = new Date()
):
  | { keepsStore: true; data: { currentPeriodEnd: Date; storeBonusMs: number } }
  | { keepsStore: false; data: typeof MANUAL_BILLING & { currentPeriodEnd: Date; storeBonusMs: null } } {
  if (isRunningStoreSubscription(row, now)) {
    const added = Math.max(0, newEnd.getTime() - (endMs(row) ?? newEnd.getTime()));
    return { keepsStore: true, data: { currentPeriodEnd: newEnd, storeBonusMs: creditMs(row) + added } };
  }
  return { keepsStore: false, data: { currentPeriodEnd: newEnd, ...MANUAL_BILLING, storeBonusMs: null } };
}

/**
 * The store's next charge (A13 design 7, `storeRenewsAt` in GET /api/subscriptions/status) = store expiration =
 * currentPeriodEnd − credit, while a store plan auto-renews; null otherwise (and during a billing issue, while the store
 * retries).
 */
export function storeRenewsAt(row: CreditRow | null | undefined, now: Date = new Date()): Date | null {
  if (!row || row.autoRenew !== true || row.billingIssueAt || !isRunningStoreSubscription(row, now)) return null;
  return new Date((endMs(row) as number) - creditMs(row));
}

export interface InAppPlan {
  id: number;
  tier: PlanTier;
}

/** Active plans with a tier, cheapest tier first. Inactive and deleted plans are never sold. */
export function inAppPlans(plans: Array<{ id: number; name: string; isActive?: boolean | null; deletedAt?: Date | string | null }>): InAppPlan[] {
  return plans
    .filter((p) => p.isActive !== false && !p.deletedAt)
    .map((p) => ({ id: p.id, tier: planTierFromName(p.name) }))
    .filter((p): p is InAppPlan => p.tier !== null)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.id - b.id);
}

export interface RenewalInput {
  /** Subscription.status as stored (TRIAL, ACTIVE, PAST_DUE, …) */
  dbStatus: string | null | undefined;
  currentPeriodEnd: Date | string | null | undefined;
  planId: number | null | undefined;
  planName: string | null | undefined;
  /** Stored auto-renew flag (store or Lemon) */
  autoRenew: boolean | null | undefined;
  /** How the plan is paid (Subscription.billingChannel) */
  billingChannel?: string | null;
  /** The store of the device asking (`deviceStoreFromHeaders`); null for the web and old apps */
  deviceStore?: 'APP_STORE' | 'PLAY_STORE' | null;
  now?: Date;
}

export interface RenewalOffer {
  expired: boolean;
  isTrial: boolean;
  /** Vietnam days from today to the end day; null once expired */
  daysRemaining: number | null;
  autoRenew: boolean;
  planTier: PlanTier | null;
  canRenew: boolean;
  canUpgrade: boolean;
  purchasablePlanIds: number[];
  renewWindowDays: number;
  /**
   * A6: a store plan on this device's store with auto-renew off: "buying" the same product would only turn auto-renew back
   * on (App Store) or fail as already owned (Google Play), so the app offers "Bật lại tự gia hạn" (manage link) instead
   */
  reenableAutoRenew: boolean;
}

/**
 * What the shop may buy now (#1459, owner 2026-11-02):
 * - expired or trial: any plan sold in the apps;
 * - auto-renewing (and not expired): only higher plans, and only on the store that renews it (A5); never the same plan;
 * - a store plan with auto-renew off on this device's store: re-enable it in the store, higher plans may be bought (A6);
 * - active with 0..7 Vietnam days left: the same plan and higher ones;
 * - active with more days left: only higher plans (upgrade any time).
 */
export function renewalOffer(input: RenewalInput, plans: InAppPlan[]): RenewalOffer {
  const now = input.now ?? new Date();
  const end = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null;
  const expired = !end || Number.isNaN(end.getTime()) || end < now;
  const daysRemaining = expired || !end ? null : Math.max(0, civilDaysBetween(now, end));
  const isTrial = String(input.dbStatus ?? '').toUpperCase() === 'TRIAL';
  const autoRenew = !expired && input.autoRenew === true;
  const planTier = planTierFromName(input.planName);
  const currentRank = tierRank(planTier);
  const current = plans.find((p) => p.id === input.planId) ?? (planTier ? plans.find((p) => p.tier === planTier) : undefined);
  // A plan not sold in the apps (Enterprise, a custom plan) is managed by the admin: no in-app offer while it runs
  const higher = planTier ? plans.filter((p) => tierRank(p.tier) > currentRank) : [];

  const channel = normaliseChannel(input.billingChannel);
  const onThisStore = !!input.deviceStore && channel === input.deviceStore;
  const reenableAutoRenew = !expired && !isTrial && !autoRenew && onThisStore;

  let purchasable: InAppPlan[];
  if (expired || isTrial) {
    purchasable = plans;
  } else if (autoRenew) {
    // A5: the upgrade any time, but only through the store that renews it (the store swaps the plan; never two subscriptions)
    purchasable = onThisStore ? higher : [];
  } else if (reenableAutoRenew) {
    // A6: the same plan is turned back on in the store; higher plans may still be bought
    purchasable = higher;
  } else if (daysRemaining !== null && daysRemaining <= RENEW_WINDOW_DAYS) {
    purchasable = current ? [current, ...higher] : higher;
  } else {
    purchasable = higher;
  }

  const ids = purchasable.map((p) => p.id);
  return {
    expired,
    isTrial,
    daysRemaining,
    autoRenew,
    planTier,
    canRenew: !!current && ids.includes(current.id),
    canUpgrade: purchasable.some((p) => tierRank(p.tier) > currentRank),
    purchasablePlanIds: ids,
    renewWindowDays: RENEW_WINDOW_DAYS,
    reenableAutoRenew,
  };
}
