import { estimateAmount, estimateFromSubscription, getLocalDateKey, parseMetadata } from '@rentalshop/utils';
import { type RevenueQuery } from './admin-revenue';

/**
 * #1505: ESTIMATE of old plan revenue for the admin block "Doanh thu gói dịch vụ", read from the subscription activity log.
 * Before hotfix #1486 a manual extension or a manual plan change left no (COMPLETED) Payment, so `buildRevenueReport` shows 0 for them.
 *
 * Revenue arises at the moment of payment (an extension, a plan change), on that Vietnam civil day; it is never spread over the
 * period. Pure functions, no database, nothing written. The estimate is shown apart and never added to "received".
 */

/** Hotfix #1486 went live 2026-11-07 14:37 (Vietnam). A PENDING plan payment made from then on is a shop transfer still waiting. */
export const PENDING_COUNTS_BEFORE = new Date('2026-11-07T07:37:00.000Z');
/** A Payment of the same subscription this close to an activity is the one that activity already wrote. */
export const SAME_EVENT_WINDOW_MS = 5 * 60 * 1000;
/** Backfill script (#1486) writes `backfill-1486-act-<activityId>`: that payment replaces its activity. */
const BACKFILL_TRANSACTION_PREFIX = 'backfill-1486-act-';

export const EXTENSION_ACTIVITY_TYPES = ['subscription_extended', 'MANUAL_EXTENSION'] as const;
export const PLAN_CHANGE_ACTIVITY_TYPES = ['subscription_plan_changed', 'plan_changed'] as const;
export const ESTIMATE_ACTIVITY_TYPES = [...EXTENSION_ACTIVITY_TYPES, ...PLAN_CHANGE_ACTIVITY_TYPES];
/** Payment types of plan money, and the methods a staff member enters by hand (they were stored PENDING before #1486). */
export const PENDING_PLAN_TYPES = ['SUBSCRIPTION_PAYMENT', 'PLAN_EXTENSION', 'PLAN_CHANGE'];
export const PENDING_PLAN_METHODS = ['TRANSFER', 'MANUAL', 'CASH'];
/** A free grant by design. */
const FREE_METHODS = ['ADMIN_EXTENSION', 'COMPENSATION'];

export type EstimateKind = 'EXTENSION' | 'PLAN_CHANGE' | 'PENDING_PAYMENT';

export interface EstimateActivityRow {
  id: number;
  subscriptionId: number;
  type: string;
  metadata: string | null;
  createdAt: Date;
}

export interface EstimateSubscriptionRow {
  id: number;
  merchantId: number;
  merchantName?: string | null;
  currency: string | null;
  /** price of one cycle of `period` months */
  amount?: number | null;
  period?: number | null;
  /** Plan price per month today; used only when the subscription has no price */
  planBasePrice?: number | null;
}

export interface EstimatePaymentRow {
  id: number;
  subscriptionId: number | null;
  merchantId: number | null;
  merchantName?: string | null;
  type: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  transactionId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface EstimatedItem {
  at: string;
  dateKey: string;
  merchant: { id: number; name: string } | null;
  kind: EstimateKind;
  amount: number;
}

export interface EstimatedRevenue {
  /** VND estimate of the selected month or year */
  total: number;
  count: number;
  months: { month: string; total: number; count: number }[];
  /** the 10 newest of the selected period */
  items: EstimatedItem[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const isVnd = (currency: string | null | undefined) => (currency || 'VND').toUpperCase() === 'VND';
const near = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) <= SAME_EVENT_WINDOW_MS;

/** Whole VND amount, or null when it is not a positive number. */
const positive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Price of an admin-route extension, which stores months and dates but no amount. */
function estimateAdminExtension(meta: Record<string, unknown>, sub: EstimateSubscriptionRow): number | null {
  const months = Number(meta.months);
  const cycle = Number(sub.period) > 0 ? Number(sub.period) : 1;
  const cyclePrice = positive(sub.amount);
  if (cyclePrice !== null && Number.isFinite(months) && months > 0) return Math.round((cyclePrice / cycle) * months);
  return estimateFromSubscription(meta, sub.amount, sub.period) ?? estimateAmount(meta, sub.planBasePrice);
}

interface RawEvent {
  at: Date;
  merchant: { id: number; name: string } | null;
  kind: EstimateKind;
  amount: number;
}

/**
 * @param activities  extension and plan-change activities whose date is inside the report year (December before, for a January report)
 * @param payments    plan payments of any status around those dates (±1 day), used to avoid counting an event twice
 */
export function buildEstimatedRevenue(input: {
  query: RevenueQuery;
  activities: EstimateActivityRow[];
  subscriptions: EstimateSubscriptionRow[];
  payments: EstimatePaymentRow[];
}): EstimatedRevenue {
  const { query } = input;
  const subs = new Map(input.subscriptions.map((s) => [s.id, s]));
  const bySub = new Map<number, EstimatePaymentRow[]>();
  const transactionIds = new Set<string>();
  for (const p of input.payments) {
    if (p.transactionId) transactionIds.add(p.transactionId);
    if (p.subscriptionId == null) continue;
    bySub.set(p.subscriptionId, [...(bySub.get(p.subscriptionId) ?? []), p]);
  }

  const events: RawEvent[] = [];

  for (const a of input.activities) {
    const sub = subs.get(a.subscriptionId);
    if (!sub || !isVnd(sub.currency)) continue;
    if (transactionIds.has(`${BACKFILL_TRANSACTION_PREFIX}${a.id}`)) continue;
    if ((bySub.get(a.subscriptionId) ?? []).some((p) => near(p.processedAt ?? p.createdAt, a.createdAt))) continue;
    const meta = parseMetadata(a.metadata);
    const merchant = { id: sub.merchantId, name: sub.merchantName ?? '' };

    if (a.type === 'subscription_extended') {
      const method = String(meta.method || 'MANUAL_EXTENSION').toUpperCase();
      const amount = positive(meta.amount);
      if (FREE_METHODS.includes(method) || amount === null) continue;
      events.push({ at: a.createdAt, merchant, kind: 'EXTENSION', amount });
    } else if (a.type === 'MANUAL_EXTENSION') {
      const method = String(meta.method || 'MANUAL_EXTENSION').toUpperCase();
      if (FREE_METHODS.includes(method)) continue;
      const amount = positive(meta.amount) ?? estimateAdminExtension(meta, sub);
      if (amount === null) continue;
      events.push({ at: a.createdAt, merchant, kind: 'EXTENSION', amount });
    } else if ((PLAN_CHANGE_ACTIVITY_TYPES as readonly string[]).includes(a.type)) {
      const planChange = meta.planChange && typeof meta.planChange === 'object' ? meta.planChange : {};
      const amount = positive(planChange.amountDueRounded) ?? positive(planChange.amountDue);
      if (amount === null) continue;
      events.push({ at: a.createdAt, merchant, kind: 'PLAN_CHANGE', amount });
    }
  }

  // Plan payments entered by hand before the hotfix were stored PENDING: the money was probably received.
  for (const p of input.payments) {
    if (p.status !== 'PENDING' || !isVnd(p.currency)) continue;
    if (!PENDING_PLAN_TYPES.includes(p.type) || !PENDING_PLAN_METHODS.includes(p.method)) continue;
    if (p.createdAt.getTime() >= PENDING_COUNTS_BEFORE.getTime()) continue;
    const amount = positive(p.amount);
    if (amount === null) continue;
    events.push({
      at: p.processedAt ?? p.createdAt,
      merchant: p.merchantId != null ? { id: p.merchantId, name: p.merchantName ?? '' } : null,
      kind: 'PENDING_PAYMENT',
      amount,
    });
  }

  const dated = events.map((e) => ({ ...e, dateKey: getLocalDateKey(e.at) }));
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${query.year}-${pad2(i + 1)}`, total: 0, count: 0 }));
  for (const e of dated) {
    const m = months.find((x) => x.month === e.dateKey.slice(0, 7));
    if (!m) continue;
    m.total += e.amount;
    m.count += 1;
  }

  const inScope = (dateKey: string) => (query.scope === 'year' ? dateKey.startsWith(`${query.year}-`) : dateKey.startsWith(query.month));
  const scoped = dated.filter((e) => inScope(e.dateKey)).sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    total: scoped.reduce((sum, e) => sum + e.amount, 0),
    count: scoped.length,
    months,
    items: scoped.slice(0, 10).map((e) => ({ at: e.at.toISOString(), dateKey: e.dateKey, merchant: e.merchant, kind: e.kind, amount: e.amount })),
  };
}
