/**
 * /plans (#582): plan limits, features, price and billing-cycle estimate text.
 * Pure, no @rentalshop/* imports, so Jest loads it. Money reads like Cài đặt → Gói dịch vụ (`moneyText`).
 * The API sends `limits` and `features` as JSON strings (or already parsed); both are accepted.
 */
import { moneyText, type T } from '../settings/subscription-model';

export const PLAN_LIMIT_KEYS = ['outlets', 'users', 'products', 'customers', 'orders'] as const;
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

/** Billing cycles the checkout accepts (`lemonsqueezyApi.createSubscriptionCheckout` billingInterval). */
export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Months and discount per cycle: quý ×3, năm ×12 − 10%. Same estimate everywhere on the page. */
const CYCLE: Record<BillingCycle, { months: number; factor: number }> = {
  monthly: { months: 1, factor: 1 },
  quarterly: { months: 3, factor: 1 },
  yearly: { months: 12, factor: 0.9 },
};

export interface PlanLike {
  id?: number | null;
  basePrice?: number | null;
  currency?: string | null;
  limits?: unknown;
  features?: unknown;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Feature names; [] when missing or not a list. */
export function planFeatures(plan: PlanLike): string[] {
  const raw = parseJson(plan.features);
  return Array.isArray(raw) ? raw.filter((f): f is string => typeof f === 'string' && f.trim() !== '').map((f) => f.trim()) : [];
}

export interface PlanLimitRow {
  key: PlanLimitKey;
  /** null = unlimited (-1, null) */
  limit: number | null;
}

/** One row per known limit key present on the plan; -1 or null reads as unlimited. */
export function planLimits(plan: PlanLike): PlanLimitRow[] {
  const raw = parseJson(plan.limits);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const obj = raw as Record<string, unknown>;
  const rows: PlanLimitRow[] = [];
  for (const key of PLAN_LIMIT_KEYS) {
    if (!(key in obj)) continue;
    const v = obj[key];
    if (v === null) rows.push({ key, limit: null });
    else if (typeof v === 'number' && Number.isFinite(v)) rows.push({ key, limit: v < 0 ? null : v });
  }
  return rows;
}

/** "Không giới hạn" or the number in the UI locale. */
export function limitText(row: PlanLimitRow, t: T, n: (v: number) => string): string {
  return row.limit == null ? t('unlimited') : n(row.limit);
}

/** Price for one cycle: base × months × discount (no rounding beyond the currency format). */
export function cycleTotal(basePrice: number | null | undefined, cycle: BillingCycle): number {
  const base = typeof basePrice === 'number' && Number.isFinite(basePrice) ? basePrice : 0;
  const { months, factor } = CYCLE[cycle];
  return base * months * factor;
}

/** Discount percent shown next to a cycle (0 or 10). */
export function cycleDiscount(cycle: BillingCycle): number {
  return Math.round((1 - CYCLE[cycle].factor) * 100);
}

/** "79.000 ₫" / "$79,000.00"; 0 or missing → "Miễn phí". */
export function planPriceText(plan: PlanLike, t: T): string {
  const price = typeof plan.basePrice === 'number' && Number.isFinite(plan.basePrice) ? plan.basePrice : 0;
  return price > 0 ? moneyText(price, plan.currency) : t('free');
}

/** Estimate for a cycle in the plan currency; free plans read "Miễn phí". */
export function cycleTotalText(plan: PlanLike, cycle: BillingCycle, t: T): string {
  const total = cycleTotal(plan.basePrice, cycle);
  return total > 0 ? moneyText(total, plan.currency) : t('free');
}

export function isCurrentPlan(plan: PlanLike, currentPlanId: number | null | undefined): boolean {
  return currentPlanId != null && plan.id != null && plan.id === currentPlanId;
}
