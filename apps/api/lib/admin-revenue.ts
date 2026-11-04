import { getLocalDateKey, getUtcRangeForDateKeys } from '@rentalshop/utils';

/**
 * #1482: aggregation behind the admin Dashboard block "Doanh thu gói dịch vụ" (`GET /api/admin/revenue/monthly`).
 *
 * - Money received counts by `processedAt` (null → `createdAt`) on the Vietnam civil day (`timezone-dates`).
 * - A refund is shown apart, dated by `refundedAt` (null → `updatedAt`). It never changes the month the money was
 *   received in: a REFUNDED payment still counts as received in its own month.
 * - The VND total adds VND payments only. Other currencies get their own line; no exchange rate is ever applied.
 * Pure functions (no database), so the unit tests stay fast.
 */

/** Payment types that are plan money. `PLAN_EXTENSION` / `PLAN_CHANGE` are left out on purpose (owner rule, see spec). */
export const REVENUE_PAYMENT_TYPES = ['SUBSCRIPTION_PAYMENT'] as const;
/** A refunded payment was received once. PENDING, FAILED and CANCELLED never count. */
export const RECEIVED_STATUSES = ['COMPLETED', 'REFUNDED'] as const;
export const FIRST_REVENUE_YEAR = 2020;

export type RevenueChannel = 'APP_STORE' | 'GOOGLE_PLAY' | 'TRANSFER' | 'CARD' | 'OTHER';
const MAIN_CHANNELS: RevenueChannel[] = ['APP_STORE', 'GOOGLE_PLAY', 'TRANSFER', 'CARD'];

export function channelOfMethod(method: string): RevenueChannel {
  switch (method) {
    case 'IAP_APPLE':
      return 'APP_STORE';
    case 'IAP_GOOGLE':
      return 'GOOGLE_PLAY';
    case 'TRANSFER':
    case 'MANUAL':
    case 'CASH':
      return 'TRANSFER';
    case 'LEMON_SQUEEZY':
    case 'STRIPE':
      return 'CARD';
    default:
      return 'OTHER';
  }
}

export interface RevenuePaymentRow {
  id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  processedAt: Date | null;
  createdAt: Date;
  refundedAt: Date | null;
  updatedAt: Date;
  merchantId: number | null;
  merchantName?: string | null;
  planName?: string | null;
}

export type RevenueQuery =
  | { scope: 'month'; month: string; year: number }
  | { scope: 'year'; year: number };

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^\d{4}$/;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** `?month=YYYY-MM` or `?year=YYYY` (exactly one); anything else is null (→ 400). */
export function parseRevenueQuery(params: { month?: string | null; year?: string | null }): RevenueQuery | null {
  const month = params.month || null;
  const year = params.year || null;
  if (month && year) return null;
  if (month) {
    const m = MONTH_RE.exec(month);
    if (!m || Number(m[1]) < FIRST_REVENUE_YEAR) return null;
    return { scope: 'month', month, year: Number(m[1]) };
  }
  if (year) {
    if (!YEAR_RE.test(year) || Number(year) < FIRST_REVENUE_YEAR) return null;
    return { scope: 'year', year: Number(year) };
  }
  return null;
}

const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `YYYY-MM` before `month`. */
export function previousMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
}

/** Vietnam-day bounds that cover everything the report needs: the whole year, plus December before a January. */
export function revenueFetchRange(query: RevenueQuery): { start: Date; end: Date } {
  let fromKey = `${query.year}-01-01`;
  if (query.scope === 'month' && query.month.endsWith('-01')) fromKey = `${query.year - 1}-12-01`;
  return getUtcRangeForDateKeys({ from: fromKey, to: `${query.year}-12-31` });
}

/** The instant a payment counts as received: `processedAt`, or `createdAt` for a row that never had one. */
export const receivedAt = (p: Pick<RevenuePaymentRow, 'processedAt' | 'createdAt'>): Date => p.processedAt ?? p.createdAt;
/** The instant a payment counts as refunded: `refundedAt`, or `updatedAt` for a refund made before the column existed. */
export const refundedAtOf = (p: Pick<RevenuePaymentRow, 'refundedAt' | 'updatedAt'>): Date => p.refundedAt ?? p.updatedAt;

const isVnd = (p: Pick<RevenuePaymentRow, 'currency'>) => (p.currency || 'VND').toUpperCase() === 'VND';

export interface RevenueMonthRow {
  month: string;
  total: number;
  count: number;
  newCount: number;
  renewalCount: number;
  refundTotal: number;
  refundCount: number;
}

export interface RevenueReport {
  scope: 'month' | 'year';
  month: string | null;
  year: number;
  todayKey: string;
  received: { total: number; count: number; newCount: number; renewalCount: number };
  refunds: { total: number; count: number };
  otherCurrencies: { currency: string; total: number; count: number; refundTotal: number; refundCount: number }[];
  daily: { date: string; total: number; count: number }[];
  previous: { month: string; daily: { date: string; total: number; count: number }[] } | null;
  byChannel: { channel: RevenueChannel; total: number; count: number }[];
  months: RevenueMonthRow[];
  latest: {
    id: number;
    at: string;
    dateKey: string;
    merchant: { id: number; name: string } | null;
    planName: string | null;
    channel: RevenueChannel;
    amount: number;
    currency: string;
    status: string;
  }[];
}

interface Dated {
  row: RevenuePaymentRow;
  at: Date;
  dateKey: string;
  isNew: boolean;
}

function dailySeries(month: string, dated: Dated[]) {
  const [y, m] = month.split('-').map(Number);
  const days = Array.from({ length: lastDayOfMonth(y, m) }, (_, i) => ({ date: `${month}-${pad2(i + 1)}`, total: 0, count: 0 }));
  for (const d of dated) {
    if (!isVnd(d.row) || !d.dateKey.startsWith(month)) continue;
    const day = days[Number(d.dateKey.slice(8, 10)) - 1];
    day.total += d.row.amount;
    day.count += 1;
  }
  return days;
}

/**
 * @param received  rows with status COMPLETED / REFUNDED whose received date is inside `revenueFetchRange(query)`
 * @param refunded  REFUNDED rows whose refund date is inside the same range (their payment may be from an earlier month)
 * @param earlierMerchantIds shops that were paid before the start of that range (so their payments here are renewals)
 */
export function buildRevenueReport(input: {
  query: RevenueQuery;
  todayKey: string;
  received: RevenuePaymentRow[];
  refunded: RevenuePaymentRow[];
  earlierMerchantIds: Set<number>;
}): RevenueReport {
  const { query, todayKey } = input;
  const received = input.received.filter((p) => (RECEIVED_STATUSES as readonly string[]).includes(p.status));

  // First received payment of each shop (by date, then id) is "new" unless the shop was paid before the range.
  const ordered = received
    .map((row) => ({ row, at: receivedAt(row) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.row.id - b.row.id);
  const seen = new Set<number>(input.earlierMerchantIds);
  const dated: Dated[] = ordered.map(({ row, at }) => {
    let isNew = false;
    if (row.merchantId != null && !seen.has(row.merchantId)) {
      isNew = true;
      seen.add(row.merchantId);
    }
    return { row, at, dateKey: getLocalDateKey(at), isNew };
  });

  const months: RevenueMonthRow[] = Array.from({ length: 12 }, (_, i) => ({
    month: `${query.year}-${pad2(i + 1)}`,
    total: 0, count: 0, newCount: 0, renewalCount: 0, refundTotal: 0, refundCount: 0,
  }));
  const monthOf = (dateKey: string) => months.find((m) => m.month === dateKey.slice(0, 7));
  for (const d of dated) {
    const m = monthOf(d.dateKey);
    if (!m || !isVnd(d.row)) continue;
    m.total += d.row.amount;
    m.count += 1;
    if (d.isNew) m.newCount += 1;
    else m.renewalCount += 1;
  }
  const refundDated = input.refunded
    .filter((p) => p.status === 'REFUNDED')
    .map((row) => ({ row, dateKey: getLocalDateKey(refundedAtOf(row)) }));
  for (const r of refundDated) {
    const m = monthOf(r.dateKey);
    if (!m || !isVnd(r.row)) continue;
    m.refundTotal += r.row.amount;
    m.refundCount += 1;
  }

  const inScope = (dateKey: string) => (query.scope === 'year' ? dateKey.startsWith(`${query.year}-`) : dateKey.startsWith(query.month));
  const scoped = dated.filter((d) => inScope(d.dateKey));
  const scopedVnd = scoped.filter((d) => isVnd(d.row));
  const scopedRefunds = refundDated.filter((r) => inScope(r.dateKey));

  // other currencies, own line each, nothing converted
  const other = new Map<string, { currency: string; total: number; count: number; refundTotal: number; refundCount: number }>();
  const line = (currency: string) => {
    const key = currency.toUpperCase();
    if (!other.has(key)) other.set(key, { currency: key, total: 0, count: 0, refundTotal: 0, refundCount: 0 });
    return other.get(key)!;
  };
  for (const d of scoped) {
    if (isVnd(d.row)) continue;
    const l = line(d.row.currency);
    l.total += d.row.amount;
    l.count += 1;
  }
  for (const r of scopedRefunds) {
    if (isVnd(r.row)) continue;
    const l = line(r.row.currency);
    l.refundTotal += r.row.amount;
    l.refundCount += 1;
  }

  const channelTotals = new Map<RevenueChannel, { total: number; count: number }>();
  for (const d of scopedVnd) {
    const c = channelOfMethod(d.row.method);
    const t = channelTotals.get(c) ?? { total: 0, count: 0 };
    t.total += d.row.amount;
    t.count += 1;
    channelTotals.set(c, t);
  }
  const channels = [...MAIN_CHANNELS, ...(channelTotals.has('OTHER') ? (['OTHER'] as RevenueChannel[]) : [])];

  const latest = [...scoped]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.row.id - a.row.id)
    .slice(0, 10)
    .map((d) => ({
      id: d.row.id,
      at: d.at.toISOString(),
      dateKey: d.dateKey,
      merchant: d.row.merchantId != null ? { id: d.row.merchantId, name: d.row.merchantName ?? '' } : null,
      planName: d.row.planName ?? null,
      channel: channelOfMethod(d.row.method),
      amount: d.row.amount,
      currency: (d.row.currency || 'VND').toUpperCase(),
      status: d.row.status,
    }));

  const month = query.scope === 'month' ? query.month : null;
  const previousMonth = month ? previousMonthKey(month) : null;
  return {
    scope: query.scope,
    month,
    year: query.year,
    todayKey,
    received: {
      total: scopedVnd.reduce((s, d) => s + d.row.amount, 0),
      count: scopedVnd.length,
      newCount: scopedVnd.filter((d) => d.isNew).length,
      renewalCount: scopedVnd.filter((d) => !d.isNew).length,
    },
    refunds: {
      total: scopedRefunds.filter((r) => isVnd(r.row)).reduce((s, r) => s + r.row.amount, 0),
      count: scopedRefunds.filter((r) => isVnd(r.row)).length,
    },
    otherCurrencies: [...other.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    daily: month ? dailySeries(month, dated) : [],
    previous: previousMonth ? { month: previousMonth, daily: dailySeries(previousMonth, dated) } : null,
    byChannel: channels.map((channel) => ({ channel, ...(channelTotals.get(channel) ?? { total: 0, count: 0 }) })),
    months,
    latest,
  };
}
