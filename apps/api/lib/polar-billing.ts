/**
 * #1631 What a Polar event does to the shop's subscription row and payments: the same rules as the store webhook (#1459),
 * with Polar as one more auto-billed channel. Pure: the webhook route loads the row, calls these, and writes the result.
 *
 * - A new active Polar subscription (a web purchase) starts the POLAR channel; the days the shop had left continue after
 *   Polar's period (A13: currentPeriodEnd = Polar period end + storeBonusMs). The subscription id is kept in
 *   `storeOriginalTransactionId`, the product in `storeProductId`.
 * - Events of the stored subscription: renewal (dates move, the credit stays), plan switch in the portal (plan follows the
 *   product), cancel / uncancel (auto-renew; the end stays), past due (flagged, access stays), ended (back to MANUAL with
 *   the paid end; EXPIRED only once it has passed).
 * - Events of any other Polar subscription change nothing unless it is active (case 6).
 * - A full refund of the period in use goes back to the period start + credit (the end before the purchase), MANUAL.
 */
import {
  MANUAL_BILLING,
  creditMs,
  isStoreChannel,
  normaliseChannel,
  renewalOffer,
  type InAppPlan,
  type PlanTier,
} from './plan-renewal';
import { minorToMajor } from './polar';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PolarSubscriptionLike {
  id: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: string | null;
  ended_at?: string | null;
  past_due_at?: string | null;
  product_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  customer?: { external_id?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}

export interface PolarOrderLike {
  id: string;
  status?: string | null;
  paid?: boolean | null;
  total_amount?: number | null;
  refunded_amount?: number | null;
  currency?: string | null;
  invoice_number?: string | null;
  billing_reason?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  subscription_id?: string | null;
  product_id?: string | null;
  customer?: { external_id?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}

/** The subscription row fields these rules read */
export interface PolarRow {
  planId?: number | null;
  status?: string | null;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  billingChannel?: string | null;
  storeProductId?: string | null;
  storeOriginalTransactionId?: string | null;
  autoRenew?: boolean | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: Date | string | null;
  cancelReason?: string | null;
  storeBonusMs?: number | null;
  billingIssueAt?: Date | string | null;
}

export type SubscriptionPatch =
  | { kind: 'ignore'; reason: 'not_active' | 'other_subscription' | 'unknown_product' | 'paused' | 'no_dates' }
  | {
      kind: 'purchase' | 'renewal' | 'change' | 'cancel' | 'uncancel' | 'update' | 'billing_issue' | 'ended';
      data: Record<string, unknown>;
    };

const ACTIVE = new Set(['active', 'trialing']);
const NOT_STARTED = new Set(['incomplete', 'incomplete_expired', 'unpaid']);

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function intervalOf(months: number): 'semi_annual' | 'annual' {
  return months === 6 ? 'semi_annual' : 'annual';
}

function priceFields(sub: PolarSubscriptionLike): Record<string, unknown> {
  if (typeof sub.amount !== 'number' || !sub.currency) return {};
  return { amount: minorToMajor(sub.amount, sub.currency), currency: String(sub.currency).toUpperCase() };
}

export function polarSubscriptionPatch(
  row: PolarRow | null | undefined,
  sub: PolarSubscriptionLike,
  product: { tier: PlanTier; months: number } | null,
  planId: number | null,
  now: Date
): SubscriptionPatch {
  const status = String(sub.status ?? '').toLowerCase();
  const sameSub = !!row && row.billingChannel === 'POLAR' && !!sub.id && row.storeOriginalTransactionId === sub.id;
  const ended = status === 'canceled' || !!sub.ended_at;
  const active = ACTIVE.has(status) && !ended;
  const periodStart = toDate(sub.current_period_start);
  const polarEnd = toDate(sub.current_period_end);
  const rowEnd = toDate(row?.currentPeriodEnd ?? null);

  if (!sameSub) {
    if (!active) return { kind: 'ignore', reason: NOT_STARTED.has(status) ? 'not_active' : 'other_subscription' };
    if (!product || !planId) return { kind: 'ignore', reason: 'unknown_product' };
    if (!periodStart || !polarEnd) return { kind: 'ignore', reason: 'no_dates' };
    // A13: a new Polar subscription keeps the days the shop had left (trial, manual, another channel or Polar plan)
    const credit = rowEnd ? Math.max(0, rowEnd.getTime() - periodStart.getTime()) : 0;
    const cancel = !!sub.cancel_at_period_end;
    return {
      kind: 'purchase',
      data: {
        planId,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: new Date(polarEnd.getTime() + credit),
        cancelAtPeriodEnd: cancel,
        canceledAt: cancel ? toDate(sub.canceled_at) ?? now : null,
        cancelReason: cancel ? 'UNSUBSCRIBE' : null,
        ...priceFields(sub),
        interval: intervalOf(product.months),
        intervalCount: 1,
        billingChannel: 'POLAR',
        storeProductId: sub.product_id ?? null,
        storeOriginalTransactionId: sub.id,
        autoRenew: !cancel,
        billingIssueAt: null,
        storeBonusMs: credit > 0 ? credit : null,
      },
    };
  }

  // The stored subscription
  if (status === 'past_due') {
    return { kind: 'billing_issue', data: { billingIssueAt: toDate(sub.past_due_at) ?? now } };
  }
  if (ended) {
    // Cancelled to the end, or Polar gave up after failed charges: the shop keeps the days it paid for, as a manual plan
    const data: Record<string, unknown> = {
      ...MANUAL_BILLING,
      storeBonusMs: null,
      cancelAtPeriodEnd: true,
      canceledAt: toDate(row?.canceledAt) ?? toDate(sub.canceled_at) ?? toDate(sub.ended_at) ?? now,
      cancelReason: row?.cancelReason ?? 'ENDED',
    };
    if (!rowEnd || rowEnd.getTime() <= now.getTime()) data.status = 'EXPIRED';
    return { kind: 'ended', data };
  }
  if (status === 'paused') return { kind: 'ignore', reason: 'paused' };
  if (!active) return { kind: 'ignore', reason: 'not_active' };
  if (!periodStart || !polarEnd) return { kind: 'ignore', reason: 'no_dates' };

  const credit = creditMs(row);
  const newEnd = new Date(polarEnd.getTime() + credit);
  const cancel = !!sub.cancel_at_period_end;
  const productChanged = !!sub.product_id && !!row?.storeProductId && sub.product_id !== row.storeProductId;
  const data: Record<string, unknown> = {
    status: 'ACTIVE',
    currentPeriodStart: periodStart,
    currentPeriodEnd: newEnd,
    cancelAtPeriodEnd: cancel,
    autoRenew: !cancel,
    canceledAt: cancel ? toDate(sub.canceled_at) ?? toDate(row?.canceledAt) ?? now : null,
    cancelReason: cancel ? 'UNSUBSCRIBE' : null,
    billingIssueAt: null,
    storeProductId: sub.product_id ?? row?.storeProductId ?? null,
    storeBonusMs: credit > 0 ? credit : null,
    ...priceFields(sub),
    ...(product && planId ? { planId, interval: intervalOf(product.months) } : {}),
  };
  const wasCancelled = row?.cancelAtPeriodEnd === true || row?.autoRenew === false;
  let kind: 'renewal' | 'change' | 'cancel' | 'uncancel' | 'update';
  if (productChanged) kind = 'change';
  else if (rowEnd && newEnd.getTime() > rowEnd.getTime() + DAY_MS) kind = 'renewal';
  else if (cancel && !wasCancelled) kind = 'cancel';
  else if (!cancel && wasCancelled) kind = 'uncancel';
  else kind = 'update';
  return { kind, data };
}

export interface PolarPayment {
  amount: number;
  currency: string;
  transactionId: string;
  invoiceNumber: string | null;
  processedAt: Date;
  renewal: boolean;
  subscriptionId: string | null;
  productId: string | null;
}

/** `order.paid` → the payment row to write (the amount the customer paid, tax included); null for nothing paid */
export function polarOrderPayment(order: PolarOrderLike): PolarPayment | null {
  if (String(order.status ?? '').toLowerCase() !== 'paid') return null;
  const currency = String(order.currency ?? 'VND').toUpperCase();
  const amount = minorToMajor(Number(order.total_amount ?? 0), currency);
  if (!(amount > 0)) return null;
  return {
    amount,
    currency,
    transactionId: order.id,
    invoiceNumber: order.invoice_number ?? null,
    processedAt: toDate(order.created_at) ?? new Date(),
    renewal: order.billing_reason === 'subscription_cycle',
    subscriptionId: order.subscription_id ?? null,
    productId: order.product_id ?? null,
  };
}

export function isFullRefund(order: PolarOrderLike): boolean {
  const total = Number(order.total_amount ?? 0);
  return total > 0 && Number(order.refunded_amount ?? 0) >= total;
}

export type RefundPatch =
  | { kind: 'refund_other' }
  | { kind: 'refund_kept_days' | 'refund_ended'; data: Record<string, unknown> };

/**
 * A full refund: only the order of the period in use (the stored subscription, paid at or after the period start, within
 * a day) changes access. Back to the end the shop had before this period = its start + credit; still ahead → those days
 * stay (MANUAL), otherwise the plan ends now (EXPIRED, may buy again).
 */
export function polarRefundPatch(row: PolarRow | null | undefined, order: PolarOrderLike, refundedAt: Date): RefundPatch {
  if (!row || row.billingChannel !== 'POLAR' || !order.subscription_id || row.storeOriginalTransactionId !== order.subscription_id) {
    return { kind: 'refund_other' };
  }
  const periodStart = toDate(row.currentPeriodStart);
  const paidAt = toDate(order.created_at);
  if (!periodStart || !paidAt || paidAt.getTime() < periodStart.getTime() - DAY_MS) return { kind: 'refund_other' };
  const base = {
    ...MANUAL_BILLING,
    storeBonusMs: null,
    cancelAtPeriodEnd: true,
    canceledAt: refundedAt,
    cancelReason: 'REFUND',
  };
  const before = periodStart.getTime() + creditMs(row);
  if (before > refundedAt.getTime()) {
    return { kind: 'refund_kept_days', data: { ...base, currentPeriodEnd: new Date(before) } };
  }
  const rowEnd = toDate(row.currentPeriodEnd);
  const end = rowEnd && rowEnd.getTime() < refundedAt.getTime() ? rowEnd : refundedAt;
  return { kind: 'refund_ended', data: { ...base, status: 'EXPIRED', currentPeriodEnd: end } };
}

export type CheckoutDecision = 'ok' | 'SUBSCRIPTION_RENEWS_IN_STORE' | 'POLAR_MANAGE_IN_PORTAL' | 'PLAN_NOT_PURCHASABLE';

/**
 * May the shop open a Polar checkout for this plan? The same rule as the apps (`renewalOffer`, the web counting as the
 * POLAR store), plus: never a second subscription while one renews (a store or Lemon: refuse; Polar: the portal changes
 * the plan or cycle). Only plans with a Polar product are sold on the web.
 */
export function polarCheckoutDecision(
  row: {
    planId?: number | null;
    planName?: string | null;
    dbStatus?: string | null;
    currentPeriodEnd?: Date | string | null;
    billingChannel?: string | null;
    autoRenew?: boolean | null;
  } | null,
  plans: InAppPlan[],
  planId: number,
  offerPlanIds: number[],
  now: Date
): CheckoutDecision {
  const end = toDate(row?.currentPeriodEnd ?? null);
  const running = !!end && end.getTime() >= now.getTime();
  const channel = normaliseChannel(row?.billingChannel);
  if (row?.autoRenew === true && running) {
    if (channel === 'POLAR') return 'POLAR_MANAGE_IN_PORTAL';
    if (isStoreChannel(channel) || channel === 'LEMON') return 'SUBSCRIPTION_RENEWS_IN_STORE';
  }
  const webPlans = plans.filter((p) => offerPlanIds.includes(p.id));
  const offer = renewalOffer(
    {
      dbStatus: row?.dbStatus ?? null,
      currentPeriodEnd: row?.currentPeriodEnd ?? null,
      planId: row?.planId ?? null,
      planName: row?.planName ?? null,
      autoRenew: row?.autoRenew ?? false,
      billingChannel: row?.billingChannel ?? null,
      deviceStore: 'POLAR',
      now,
    },
    webPlans
  );
  return offer.purchasablePlanIds.includes(planId) ? 'ok' : 'PLAN_NOT_PURCHASABLE';
}
