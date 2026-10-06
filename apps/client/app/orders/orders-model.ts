/**
 * #516 shop web Đơn hàng + Chi tiết đơn: pure mapping from the order API rows to what the screens show.
 * Days are Vietnam civil-day keys (`YYYY-MM-DD`); the caller passes `toDayKey` (getLocalDateKey) so
 * this file stays free of app imports and runs under any process TZ.
 */
import { addDays, daysBetween, formatDayLabel, isDayKey } from '../dashboard/overview-model';

export { formatDayLabel, addDays as addDaysKey };

type Num = number | null | undefined;
type DateLike = string | Date | null | undefined;
export type ToDayKey = (iso: string) => string;

const SHOP_TZ = 'Asia/Ho_Chi_Minh';
const clockFormat = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TZ, hour: '2-digit', minute: '2-digit', hour12: false });

const iso = (value: DateLike): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Vietnam day key of an instant, or null. */
export function dayKeyOf(value: DateLike, toDayKey: ToDayKey): string | null {
  const s = iso(value);
  if (!s) return null;
  const key = toDayKey(s);
  return isDayKey(key) ? key : null;
}

/** Shop clock "HH:mm" of an instant. */
export function clockOf(value: DateLike): string {
  const s = iso(value);
  return s ? clockFormat.format(new Date(s)) : '';
}

const pos = (n: Num) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

// ----------------------------------------------------------------------------
// List filters
// ----------------------------------------------------------------------------

export const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatusKey = (typeof ORDER_STATUSES)[number];

export type OrdersTab = 'todo' | 'all' | 'noshow';
export const ORDERS_TABS: OrdersTab[] = ['todo', 'all', 'noshow'];
export function parseTab(raw: string | null | undefined): OrdersTab {
  return raw === 'todo' || raw === 'noshow' ? raw : 'all';
}

export function parseStatus(raw: string | null | undefined): OrderStatusKey | '' {
  return (ORDER_STATUSES as readonly string[]).includes(raw || '') ? (raw as OrderStatusKey) : '';
}

export type OrderTypeFilter = '' | 'RENT' | 'SALE';
export function parseType(raw: string | null | undefined): OrderTypeFilter {
  return raw === 'RENT' || raw === 'SALE' ? raw : '';
}

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;
export function parsePageSize(raw: string | null | undefined): number {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parsePage(raw: string | null | undefined): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export const SORTS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  nearest: { sortBy: 'nearestTask', sortOrder: 'asc' },
  total: { sortBy: 'totalAmount', sortOrder: 'desc' },
} as const;
export type SortKey = keyof typeof SORTS;
export const SORT_KEYS = Object.keys(SORTS) as SortKey[];
export function parseSort(raw: string | null | undefined): SortKey {
  return raw && Object.prototype.hasOwnProperty.call(SORTS, raw) ? (raw as SortKey) : 'newest';
}

export type CreatedPreset = 'any' | '7d' | '30d' | 'month' | 'custom';
export const CREATED_PRESETS: CreatedPreset[] = ['any', '7d', '30d', 'month', 'custom'];

/** Created-day range of a preset, as Vietnam day keys; `null` for no limit. A reversed custom range is swapped. */
export function createdRange(
  preset: CreatedPreset,
  todayKey: string,
  custom?: { from?: string | null; to?: string | null },
): { startDate: string; endDate: string } | null {
  switch (preset) {
    case '7d':
      return { startDate: addDays(todayKey, -6), endDate: todayKey };
    case '30d':
      return { startDate: addDays(todayKey, -29), endDate: todayKey };
    case 'month':
      return { startDate: `${todayKey.slice(0, 8)}01`, endDate: todayKey };
    case 'custom': {
      const from = isDayKey(custom?.from) ? custom!.from! : null;
      const to = isDayKey(custom?.to) ? custom!.to! : null;
      if (!from && !to) return null;
      const a = from || to!;
      const b = to || from!;
      return a <= b ? { startDate: a, endDate: b } : { startDate: b, endDate: a };
    }
    default:
      return null;
  }
}

export function parsePreset(raw: string | null | undefined): CreatedPreset {
  return (CREATED_PRESETS as string[]).includes(raw || '') ? (raw as CreatedPreset) : 'any';
}

/** Page numbers to show around the current page; `0` marks a gap. */
export function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 1) return [1];
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(0);
    out.push(p);
  });
  return out;
}

/** "a–b" shown in the footer. */
export function rangeOf(page: number, limit: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = Math.min(total, (page - 1) * limit + 1);
  return { from, to: Math.min(total, page * limit) };
}

// ----------------------------------------------------------------------------
// List rows
// ----------------------------------------------------------------------------

export interface OrderRowLike {
  id: number;
  orderNumber: string;
  orderType?: string | null;
  status?: string | null;
  customerName?: string | null;
  customer?: { firstName?: string | null; lastName?: string | null } | null;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  pickupPlanAt?: DateLike;
  returnPlanAt?: DateLike;
  pickedUpAt?: DateLike;
  returnedAt?: DateLike;
  totalAmount?: Num;
  amountDue?: Num;
  refundDue?: Num;
  isReadyToDeliver?: boolean | null;
  productNames?: string | null;
}

export type Schedule =
  | { kind: 'pickupReturn'; pickup: string | null; ret: string | null }
  | { kind: 'return'; day: string }
  | { kind: 'due'; day: string }
  | { kind: 'returned'; day: string }
  | { kind: 'sale'; day: string }
  | { kind: 'cancelled'; day: string };

export type RowNote =
  | { kind: 'late'; days: number }
  | { kind: 'overduePickup'; days: number }
  | { kind: 'unprepared' }
  | { kind: 'sale' };

export type RowPay =
  | { kind: 'due'; amount: number; urgent: boolean }
  | { kind: 'fee'; amount: number }
  | { kind: 'refund'; amount: number }
  | { kind: 'noRevenue' };

export interface OrderRow {
  id: number;
  orderNumber: string;
  status: OrderStatusKey | string;
  isSale: boolean;
  name: string;
  createdKey: string | null;
  /** Shown instead of the created day where there is none (today's work lists) */
  detail: string | null;
  schedule: Schedule | null;
  note: RowNote | null;
  total: number;
  cancelled: boolean;
  pay: RowPay | null;
}

export function customerNameOf(row: Pick<OrderRowLike, 'customerName' | 'customer'>): string {
  const fromParts = [row.customer?.firstName, row.customer?.lastName].filter(Boolean).join(' ').trim();
  return (row.customerName || '').trim() || fromParts;
}

/** One list row: schedule, note and money, from the API row and today's Vietnam day. */
export function buildOrderRow(o: OrderRowLike, todayKey: string, toDayKey: ToDayKey): OrderRow {
  const key = (v: DateLike) => dayKeyOf(v, toDayKey);
  const status = (o.status || '') as OrderStatusKey;
  const isSale = o.orderType === 'SALE';
  const amountDue = pos(o.amountDue);
  const refundDue = pos(o.refundDue);
  let schedule: Schedule | null = null;
  let note: RowNote | null = null;
  let pay: RowPay | null = null;

  if (status === 'CANCELLED') {
    const day = key(o.updatedAt) || key(o.createdAt);
    schedule = day ? { kind: 'cancelled', day } : null;
    pay = { kind: 'noRevenue' };
  } else if (isSale) {
    const day = key(o.createdAt);
    schedule = day ? { kind: 'sale', day } : null;
    note = { kind: 'sale' };
    if (amountDue > 0) pay = { kind: 'due', amount: amountDue, urgent: false };
  } else if (status === 'RESERVED') {
    const pickup = key(o.pickupPlanAt);
    schedule = { kind: 'pickupReturn', pickup, ret: key(o.returnPlanAt) };
    const overdue = pickup ? daysBetween(pickup, todayKey) : 0;
    if (overdue > 0) note = { kind: 'overduePickup', days: overdue };
    else if (o.isReadyToDeliver === false) note = { kind: 'unprepared' };
    if (amountDue > 0) pay = { kind: 'due', amount: amountDue, urgent: overdue > 0 };
  } else if (status === 'PICKUPED') {
    const ret = key(o.returnPlanAt);
    const late = ret ? daysBetween(ret, todayKey) : 0;
    if (ret) schedule = late > 0 ? { kind: 'due', day: ret } : { kind: 'return', day: ret };
    if (late > 0) note = { kind: 'late', days: late };
    if (refundDue > 0) pay = { kind: 'refund', amount: refundDue };
    else if (amountDue > 0) pay = late > 0 ? { kind: 'fee', amount: amountDue } : { kind: 'due', amount: amountDue, urgent: false };
  } else {
    const day = key(o.returnedAt) || key(o.returnPlanAt);
    schedule = day ? { kind: 'returned', day } : null;
    if (refundDue > 0) pay = { kind: 'refund', amount: refundDue };
    else if (amountDue > 0) pay = { kind: 'due', amount: amountDue, urgent: false };
  }

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status,
    isSale,
    name: customerNameOf(o),
    createdKey: key(o.createdAt),
    detail: null,
    schedule,
    note,
    total: pos(o.totalAmount),
    cancelled: status === 'CANCELLED',
    pay,
  };
}

export interface OpsOrderRowLike extends OrderRowLike {
  lateDays?: Num;
  itemCount?: Num;
}

export interface OpsListsLike {
  pickupsToday?: { count: number; orders: OpsOrderRowLike[] } | null;
  returnsToday?: { count: number; orders: OpsOrderRowLike[] } | null;
  overdueReturns?: { count: number; orders: OpsOrderRowLike[] } | null;
  noShows?: { count: number; orders: OpsOrderRowLike[] } | null;
}

/**
 * Rows of the "Việc cần làm" (hand-overs today, returns today, late returns; each order once) or
 * "Chưa lấy đồ" (no-shows) tab. Every row is a rental; its state follows the list it came from.
 */
export function buildOpsRows(ops: OpsListsLike | null | undefined, tab: 'todo' | 'noshow', todayKey: string, toDayKey: ToDayKey): OrderRow[] {
  if (!ops) return [];
  const lists: Array<[OpsOrderRowLike[] | undefined, OrderStatusKey]> =
    tab === 'noshow'
      ? [[ops.noShows?.orders, 'RESERVED']]
      : [
          [ops.pickupsToday?.orders, 'RESERVED'],
          [ops.returnsToday?.orders, 'PICKUPED'],
          [ops.overdueReturns?.orders, 'PICKUPED'],
        ];
  const seen = new Set<number>();
  const rows: OrderRow[] = [];
  for (const [orders, status] of lists) {
    for (const o of orders || []) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      const row = buildOrderRow({ ...o, orderType: 'RENT', status }, todayKey, toDayKey);
      row.detail = (o.productNames || '').trim() || null;
      rows.push(row);
    }
  }
  return rows;
}

/** Badge counts of the two work tabs. */
export function opsCounts(ops: OpsListsLike | null | undefined): { todo: number; noshow: number } {
  if (!ops) return { todo: 0, noshow: 0 };
  const ids = new Set<number>();
  [ops.pickupsToday, ops.returnsToday, ops.overdueReturns].forEach((l) => l?.orders.forEach((o) => ids.add(o.id)));
  // Lists are capped at 50, so start from the counts and drop the orders sent in two lists
  const listed = (ops.pickupsToday?.count || 0) + (ops.returnsToday?.count || 0) + (ops.overdueReturns?.count || 0);
  const sent = (ops.pickupsToday?.orders.length || 0) + (ops.returnsToday?.orders.length || 0) + (ops.overdueReturns?.orders.length || 0);
  return { todo: Math.max(ids.size, listed - (sent - ids.size)), noshow: ops.noShows?.count || 0 };
}

// ----------------------------------------------------------------------------
// Order page
// ----------------------------------------------------------------------------

export interface PaymentLike {
  id?: number;
  amount?: Num;
  status?: string | null;
  notes?: string | null;
  method?: string | null;
  createdAt?: DateLike;
}

export interface OrderDetailLike extends OrderRowLike {
  depositAmount?: Num;
  securityDeposit?: Num;
  lateFee?: Num;
  damageFee?: Num;
  discountAmount?: Num;
  payments?: PaymentLike[] | null;
  createdBy?: { firstName?: string | null; lastName?: string | null; name?: string | null } | null;
}

/** Same rule as the API (`apps/api/lib/order-balance.ts`), so the page and the list agree. */
export function orderBalance(o: OrderDetailLike): { amountDue: number; refundDue: number } {
  const paid = (notes: string) =>
    (o.payments || []).filter((p) => p.status === 'COMPLETED' && p.notes === notes).reduce((s, p) => s + (p.amount || 0), 0);
  if (o.orderType === 'SALE') return { amountDue: Math.max(0, pos(o.totalAmount) - paid('SALE')), refundDue: 0 };
  if (o.orderType === 'RENT' && o.status === 'RESERVED') {
    return { amountDue: Math.max(0, pos(o.totalAmount) - pos(o.depositAmount) + pos(o.securityDeposit) - paid('PICKUP')), refundDue: 0 };
  }
  if (o.orderType === 'RENT' && o.status === 'PICKUPED') {
    const net = pos(o.damageFee) + pos(o.lateFee) - pos(o.securityDeposit) - paid('RETURN_ADJUSTMENT');
    return { amountDue: Math.max(0, net), refundDue: Math.max(0, -net) };
  }
  return { amountDue: 0, refundDue: 0 };
}

export type StepWhen =
  | { kind: 'done'; key: string | null; clock: string }
  | { kind: 'plan'; key: string; today: boolean; late: boolean }
  | { kind: 'none' };

export interface ProgressStep {
  step: 'RESERVED' | 'PICKUP' | 'RETURN';
  reached: boolean;
  when: StepWhen;
}

/** Đã đặt → Giao đồ → Trả đồ, for rentals that are not cancelled; empty otherwise. */
export function buildProgress(o: OrderDetailLike, todayKey: string, toDayKey: ToDayKey): ProgressStep[] {
  if (o.orderType !== 'RENT' || o.status === 'CANCELLED') return [];
  const status = o.status || '';
  const pickedUp = status === 'PICKUPED' || status === 'RETURNED' || status === 'COMPLETED';
  const returned = status === 'RETURNED' || status === 'COMPLETED';
  const done = (v: DateLike): StepWhen => ({ kind: 'done', key: dayKeyOf(v, toDayKey), clock: clockOf(v) });
  const plan = (v: DateLike): StepWhen => {
    const key = dayKeyOf(v, toDayKey);
    return key ? { kind: 'plan', key, today: key === todayKey, late: key < todayKey } : { kind: 'none' };
  };
  return [
    { step: 'RESERVED', reached: true, when: done(o.createdAt) },
    { step: 'PICKUP', reached: pickedUp, when: pickedUp ? (o.pickedUpAt ? done(o.pickedUpAt) : { kind: 'none' }) : plan(o.pickupPlanAt) },
    { step: 'RETURN', reached: returned, when: returned ? (o.returnedAt ? done(o.returnedAt) : { kind: 'none' }) : plan(o.returnPlanAt) },
  ];
}

export type NextStep =
  | { kind: 'pickup'; day: string | null; today: boolean; lateDays: number; amount: number }
  | { kind: 'return'; day: string | null; today: boolean; lateDays: number; amount: number; refund: number };

/** The one thing to do next on a rental, with the money that changes hands; null when nothing is left. */
export function buildNextStep(o: OrderDetailLike, todayKey: string, toDayKey: ToDayKey): NextStep | null {
  if (o.orderType !== 'RENT') return null;
  const balance = orderBalance(o);
  if (o.status === 'RESERVED') {
    const day = dayKeyOf(o.pickupPlanAt, toDayKey);
    return { kind: 'pickup', day, today: day === todayKey, lateDays: day ? Math.max(0, daysBetween(day, todayKey)) : 0, amount: balance.amountDue };
  }
  if (o.status === 'PICKUPED') {
    const day = dayKeyOf(o.returnPlanAt, toDayKey);
    return {
      kind: 'return',
      day,
      today: day === todayKey,
      lateDays: day ? Math.max(0, daysBetween(day, todayKey)) : 0,
      amount: balance.amountDue,
      refund: balance.refundDue,
    };
  }
  return null;
}

export type PayLine =
  | { kind: 'rent' | 'saleTotal' | 'deposit' | 'paid' | 'lateFee' | 'damageFee' | 'collateralHeld'; amount: number; sign: 1 | -1 | 0 };

export type PayTotal =
  | { kind: 'dueAtPickup' | 'collectAtReturn' | 'refundAtReturn' | 'due'; amount: number }
  | { kind: 'settled' | 'noRevenue' | 'nothingAtReturn' };

export interface PaySummary {
  lines: PayLine[];
  total: PayTotal;
  /** Collateral money taken at hand-over (reserved rentals), already inside the total */
  collateral: number;
  /** Total struck through: the order is cancelled */
  struck: boolean;
}

const paidOf = (o: OrderDetailLike, notes: string[]) =>
  (o.payments || []).filter((p) => p.status === 'COMPLETED' && notes.includes(p.notes || '')).reduce((s, p) => s + (p.amount || 0), 0);

/** Lines of the Thanh toán card, by order state. */
export function buildPaySummary(o: OrderDetailLike): PaySummary {
  const total = pos(o.totalAmount);
  const balance = orderBalance(o);
  if (o.status === 'CANCELLED') {
    return { lines: [{ kind: o.orderType === 'SALE' ? 'saleTotal' : 'rent', amount: total, sign: 0 }], total: { kind: 'noRevenue' }, collateral: 0, struck: true };
  }
  if (o.orderType === 'SALE') {
    const paid = paidOf(o, ['SALE']);
    const lines: PayLine[] = [{ kind: 'saleTotal', amount: total, sign: 0 }];
    if (paid > 0) lines.push({ kind: 'paid', amount: paid, sign: -1 });
    return { lines, total: balance.amountDue > 0 ? { kind: 'due', amount: balance.amountDue } : { kind: 'settled' }, collateral: 0, struck: false };
  }
  const lines: PayLine[] = [{ kind: 'rent', amount: total, sign: 0 }, { kind: 'deposit', amount: pos(o.depositAmount), sign: -1 }];
  if (o.status === 'RESERVED') {
    const paid = paidOf(o, ['PICKUP']);
    if (paid > 0) lines.push({ kind: 'paid', amount: paid, sign: -1 });
    return {
      lines,
      total: balance.amountDue > 0 ? { kind: 'dueAtPickup', amount: balance.amountDue } : { kind: 'settled' },
      collateral: pos(o.securityDeposit),
      struck: false,
    };
  }
  if (pos(o.lateFee) > 0) lines.push({ kind: 'lateFee', amount: pos(o.lateFee), sign: 1 });
  if (pos(o.damageFee) > 0) lines.push({ kind: 'damageFee', amount: pos(o.damageFee), sign: 1 });
  if (o.status === 'PICKUPED') {
    if (pos(o.securityDeposit) > 0) lines.push({ kind: 'collateralHeld', amount: pos(o.securityDeposit), sign: -1 });
    const t: PayTotal =
      balance.refundDue > 0
        ? { kind: 'refundAtReturn', amount: balance.refundDue }
        : balance.amountDue > 0
          ? { kind: 'collectAtReturn', amount: balance.amountDue }
          : { kind: 'nothingAtReturn' };
    return { lines, total: t, collateral: 0, struck: false };
  }
  return { lines, total: { kind: 'settled' }, collateral: 0, struck: false };
}

export type HistoryEvent =
  | { kind: 'created'; at: string; by: string }
  | { kind: 'payment'; at: string; amount: number; refund: boolean }
  | { kind: 'pickedUp'; at: string }
  | { kind: 'returned'; at: string }
  | { kind: 'cancelled'; at: string };

/** What happened to the order, newest first, from its own timestamps and completed payments. */
export function buildHistory(o: OrderDetailLike): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  const created = iso(o.createdAt);
  if (created) {
    const by = (o.createdBy?.name || '').trim() || [o.createdBy?.firstName, o.createdBy?.lastName].filter(Boolean).join(' ').trim();
    events.push({ kind: 'created', at: created, by });
  }
  for (const p of o.payments || []) {
    const at = iso(p.createdAt);
    if (!at || p.status !== 'COMPLETED' || !pos(p.amount)) continue;
    events.push({ kind: 'payment', at, amount: pos(p.amount), refund: /REFUND/i.test(p.notes || '') });
  }
  const picked = iso(o.pickedUpAt);
  if (picked) events.push({ kind: 'pickedUp', at: picked });
  const returned = iso(o.returnedAt);
  if (returned) events.push({ kind: 'returned', at: returned });
  const updated = iso(o.updatedAt);
  if (o.status === 'CANCELLED' && updated) events.push({ kind: 'cancelled', at: updated });
  // Stable: same instant keeps the order above (created before payment)
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.at === b.e.at ? b.i - a.i : a.e.at < b.e.at ? 1 : -1))
    .map(({ e }) => e);
}

/** "14:32 05/10" in shop time. */
export function clockDay(value: DateLike, toDayKey: ToDayKey): string {
  const key = dayKeyOf(value, toDayKey);
  return key ? `${clockOf(value)} ${key.slice(8, 10)}/${key.slice(5, 7)}` : '';
}
