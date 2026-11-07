/**
 * #1486: pure rules for the back-fill of Payments for manual plan extensions made before a manual extension left a Payment.
 * No database here, so the rules are unit tested (tests/manual-extension-backfill.test.ts).
 *
 * Sources (SubscriptionActivity):
 * - `subscription_extended` (POST /api/subscriptions/[id]/extend): metadata has `method`, `amount` (the price of the dialog,
 *   a typed one or the calculated one), `newEndDate`.
 * - `MANUAL_EXTENSION` (POST /api/admin/subscriptions/[id]/extend): metadata has months / dates only, no amount. The price
 *   is then estimated, first from the shop's current Subscription (its `amount` is the price of one cycle of `period`
 *   months: amount x extension days / cycle days), else the way the Extend dialog calculates it from the plan price.
 *   It is today's price, not the one of that day: an estimate, never "ready", the owner confirms it.
 */
import { calculateExtensionTotal } from '../../packages/utils/src/core/subscription-billing-calculations';
import { addMonthsInTimeZone, civilDaysBetween } from '../../packages/utils/src/core/billing-dates';

export const BACKFILL_ISSUE = 1486;
export const TRANSACTION_PREFIX = `backfill-${BACKFILL_ISSUE}-act-`;
/** A Payment of the same subscription this close to the activity is the one the extension already wrote. */
export const SAME_EVENT_WINDOW_MS = 5 * 60 * 1000;

export const ACTIVITY_PANEL = 'subscription_extended';
export const ACTIVITY_ADMIN = 'MANUAL_EXTENSION';
export const ACTIVITY_TYPES = [ACTIVITY_PANEL, ACTIVITY_ADMIN];
/** Methods that are a free grant by design: never back-filled. */
export const FREE_METHODS = ['ADMIN_EXTENSION', 'COMPENSATION'];

export interface ActivityRow {
  id: number;
  subscriptionId: number;
  type: string;
  metadata: string | null;
  createdAt: Date;
}

export interface SubscriptionRow {
  id: number;
  merchantId: number;
  currency: string | null;
  merchantName?: string | null;
  /** Current Subscription: `amount` is the price of one cycle of `period` months (an annual plan: the whole year) */
  amount?: number | null;
  period?: number | null;
  /** Plan price per month today (Plan.basePrice); used only to estimate an amount the activity did not store */
  planBasePrice?: number | null;
}

export interface ExistingPaymentRow {
  subscriptionId: number | null;
  transactionId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export type CandidateStatus = 'ready' | 'estimated' | 'needs-amount' | 'skip';

export interface Candidate {
  activityId: number;
  subscriptionId: number;
  merchantId: number | null;
  merchantName: string;
  at: Date;
  source: 'panel' | 'admin';
  method: string;
  amount: number | null;
  currency: string;
  status: CandidateStatus;
  reason: string;
}

export function parseMetadata(raw: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function transactionIdOf(activityId: number): string {
  return `${TRANSACTION_PREFIX}${activityId}`;
}

/** Interval the admin route writes for `months` (same mapping as the route) */
const intervalOfMonths = (months: number) => (months <= 1 ? 'monthly' : months <= 3 ? 'quarterly' : months <= 6 ? 'semi_annual' : 'annual');

/** Price of an extension from the plan price, as the dialog calculates it; null when the dates or the price are missing. */
export function estimateAmount(meta: Record<string, any>, planBasePrice: number | null | undefined): number | null {
  const previousEnd = meta.previousEnd ? new Date(meta.previousEnd) : null;
  const newEnd = meta.newEnd ? new Date(meta.newEnd) : null;
  const months = Number(meta.months);
  if (!previousEnd || !newEnd || Number.isNaN(previousEnd.getTime()) || Number.isNaN(newEnd.getTime())) return null;
  if (!planBasePrice || planBasePrice <= 0 || !Number.isFinite(months) || months <= 0) return null;
  const { totalDue } = calculateExtensionTotal({
    oldEndDate: previousEnd,
    newEndDate: newEnd,
    plan: { basePrice: planBasePrice },
    selectedInterval: intervalOfMonths(months),
  });
  return Number.isFinite(totalDue) && totalDue > 0 ? Math.round(totalDue) : null;
}

/** Price of an extension from the shop's current Subscription: its cycle price x extension days / cycle days. */
export function estimateFromSubscription(meta: Record<string, any>, amount: number | null | undefined, period: number | null | undefined): number | null {
  const previousEnd = meta.previousEnd ? new Date(meta.previousEnd) : null;
  const newEnd = meta.newEnd ? new Date(meta.newEnd) : null;
  const cycleMonths = Number(period) > 0 ? Number(period) : 1;
  if (!previousEnd || !newEnd || Number.isNaN(previousEnd.getTime()) || Number.isNaN(newEnd.getTime())) return null;
  if (!amount || amount <= 0) return null;
  const days = civilDaysBetween(previousEnd, newEnd);
  const cycleDays = civilDaysBetween(previousEnd, addMonthsInTimeZone(previousEnd, cycleMonths));
  if (days <= 0 || cycleDays <= 0) return null;
  return Math.round((amount * days) / cycleDays);
}

const near = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) <= SAME_EVENT_WINDOW_MS;

export function planBackfill(input: {
  activities: ActivityRow[];
  subscriptions: SubscriptionRow[];
  payments: ExistingPaymentRow[];
}): Candidate[] {
  const subs = new Map(input.subscriptions.map((s) => [s.id, s]));
  const done = new Set(input.payments.map((p) => p.transactionId).filter((t): t is string => !!t));
  const bySub = new Map<number, ExistingPaymentRow[]>();
  for (const p of input.payments) {
    if (p.subscriptionId == null) continue;
    bySub.set(p.subscriptionId, [...(bySub.get(p.subscriptionId) ?? []), p]);
  }

  return input.activities
    .filter((a) => ACTIVITY_TYPES.includes(a.type))
    .map((a): Candidate => {
      const sub = subs.get(a.subscriptionId);
      const meta = parseMetadata(a.metadata);
      const source = a.type === ACTIVITY_PANEL ? 'panel' : 'admin';
      const method = String(meta.method || 'MANUAL_EXTENSION').toUpperCase();
      const rawAmount = Number(meta.amount);
      const amount = meta.amount === undefined || meta.amount === null || !Number.isFinite(rawAmount) ? null : rawAmount;
      const base = {
        activityId: a.id,
        subscriptionId: a.subscriptionId,
        merchantId: sub?.merchantId ?? null,
        merchantName: sub?.merchantName ?? '',
        at: a.createdAt,
        source,
        method,
        amount,
        currency: sub?.currency || 'VND',
      } as const;
      const skip = (reason: string): Candidate => ({ ...base, status: 'skip', reason });

      if (!sub) return skip('subscription not found');
      if (done.has(transactionIdOf(a.id))) return skip('already back-filled');
      if (bySub.get(a.subscriptionId)?.some((p) => near(p.processedAt ?? p.createdAt, a.createdAt))) {
        return skip('a payment of this extension already exists');
      }
      if (FREE_METHODS.includes(method)) return skip('free grant by design (Admin Extension / Compensation)');
      if (source === 'panel') {
        if (amount === null) return skip('no amount in the activity');
        if (amount <= 0) return skip('amount is 0');
        return { ...base, status: 'ready', reason: `method ${method}, price of the dialog: check it was money received` };
      }
      // admin route: the activity never stored the amount (an amount only in the Payment, which the route failed to write)
      if (amount !== null && amount > 0) return { ...base, status: 'ready', reason: 'admin route, amount in the activity' };
      const fromSubscription = estimateFromSubscription(meta, sub.amount, sub.period);
      const fromPlan = fromSubscription === null ? estimateAmount(meta, sub.planBasePrice) : null;
      const estimate = fromSubscription ?? fromPlan;
      if (estimate !== null) {
        const source = fromSubscription !== null
          ? `the current subscription (${sub.amount} per ${sub.period || 1} month cycle)`
          : `the plan price (${sub.planBasePrice}/month)`;
        return {
          ...base,
          amount: estimate,
          status: 'estimated',
          reason: `admin route stores no amount: estimated from ${source} for ${meta.months} month(s); set include=yes if it was paid, change the amount if it was not this price`,
        };
      }
      return { ...base, status: 'needs-amount', reason: 'admin route stores no amount and no estimate (no plan price or dates): fill it in, or leave it out if it was free' };
    });
}

/** CSV of the plan: one row per candidate that is not a plain skip, `include` = yes for the ready ones. */
export const CSV_HEADER = ['include', 'activityId', 'subscriptionId', 'merchantId', 'merchant', 'dateVN', 'method', 'amount', 'currency', 'status', 'reason'];

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const vnDate = (d: Date) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16);

export function toCsv(candidates: Candidate[]): string {
  const rows = candidates
    .filter((c) => c.status !== 'skip')
    .map((c) =>
      [c.status === 'ready' ? 'yes' : '', c.activityId, c.subscriptionId, c.merchantId, c.merchantName, vnDate(c.at), c.method, c.amount ?? '', c.currency, c.status, c.reason]
        .map(csvCell)
        .join(',')
    );
  return [CSV_HEADER.join(','), ...rows].join('\n') + '\n';
}

export function parseCsv(text: string): Record<string, string>[] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) records.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((c) => c !== '')) records.push(row); }
  const [header, ...rest] = records;
  if (!header) return [];
  return rest.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

export interface ApprovedRow { activityId: number; amount: number }

/** The rows the owner kept (`include` yes / y / 1) with a positive amount; an edited amount wins. */
export function approvedRows(csvRows: Record<string, string>[]): { rows: ApprovedRow[]; problems: string[] } {
  const rows: ApprovedRow[] = [];
  const problems: string[] = [];
  const seen = new Set<number>();
  for (const r of csvRows) {
    if (!['yes', 'y', '1', 'true'].includes((r.include || '').toLowerCase())) continue;
    const activityId = Number(r.activityId);
    const amount = Number((r.amount || '').replace(/[,\s]/g, ''));
    if (!Number.isInteger(activityId) || activityId <= 0) { problems.push(`bad activityId "${r.activityId}"`); continue; }
    if (!Number.isFinite(amount) || amount <= 0) { problems.push(`activity ${activityId}: amount "${r.amount}" is not a positive number`); continue; }
    if (seen.has(activityId)) { problems.push(`activity ${activityId} appears twice`); continue; }
    seen.add(activityId);
    rows.push({ activityId, amount });
  }
  return { rows, problems };
}

// ---------------------------------------------------------------------------------------------------------------
// Pending plan payments (upgrade, add-on, renewal by transfer / manual / cash written as PENDING before #1486)
// ---------------------------------------------------------------------------------------------------------------

export const PENDING_TYPES = ['PLAN_CHANGE', 'SUBSCRIPTION_PAYMENT', 'PLAN_EXTENSION'];
export const PENDING_METHODS = ['TRANSFER', 'MANUAL', 'CASH'];
export const PENDING_CSV_HEADER = ['include', 'paymentId', 'merchantId', 'merchant', 'type', 'method', 'amount', 'currency', 'dateVN', 'processedBy', 'transactionId', 'description'];

export interface PendingPaymentRow {
  id: number;
  merchantId: number | null;
  merchantName?: string | null;
  type: string;
  method: string;
  amount: number;
  currency: string;
  processedAt: Date | null;
  createdAt: Date;
  processedBy: string | null;
  transactionId: string | null;
  description: string | null;
}

/** CSV of the pending plan payments; `include` is left empty: the owner marks the ones whose money was received. */
export function pendingToCsv(rows: PendingPaymentRow[]): string {
  const lines = rows.map((r) =>
    ['', r.id, r.merchantId, r.merchantName ?? '', r.type, r.method, r.amount, r.currency, vnDate(r.processedAt ?? r.createdAt), r.processedBy ?? '', r.transactionId ?? '', r.description ?? '']
      .map(csvCell)
      .join(',')
  );
  return [PENDING_CSV_HEADER.join(','), ...lines].join('\n') + '\n';
}

/** Payment ids the owner marked (`include` yes / y / 1 / true), without duplicates. */
export function approvedPaymentIds(csvRows: Record<string, string>[]): { ids: number[]; problems: string[] } {
  const ids: number[] = [];
  const problems: string[] = [];
  for (const r of csvRows) {
    if (!['yes', 'y', '1', 'true'].includes((r.include || '').toLowerCase())) continue;
    const id = Number(r.paymentId);
    if (!Number.isInteger(id) || id <= 0) { problems.push(`bad paymentId "${r.paymentId}"`); continue; }
    if (ids.includes(id)) { problems.push(`payment ${id} appears twice`); continue; }
    ids.push(id);
  }
  return { ids, problems };
}
