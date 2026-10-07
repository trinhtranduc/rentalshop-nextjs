/**
 * Lịch giao trả (#527): pure mapping for the month grid and the day panel.
 * No React and no clock: callers pass the shop's today key (Vietnam civil day) and a
 * `toDayKey` for ISO instants, so the result is the same under any machine TZ.
 */
import { addDays, daysBetween, isDayKey } from '../dashboard/overview-model';

export { addDays, daysBetween, isDayKey };

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

const pad = (n: number) => String(n).padStart(2, '0');

export const monthKey = (m: MonthRef): string => `${m.year}-${pad(m.month)}`;
export const firstDayOf = (m: MonthRef): string => `${monthKey(m)}-01`;

export function monthOfKey(key: string): MonthRef {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

/** `?month=10&year=2026` from the URL, else the month of today. */
export function parseMonth(month: string | null | undefined, year: string | null | undefined, todayKey: string): MonthRef {
  const fallback = monthOfKey(todayKey);
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) return fallback;
  const y = year == null || year === '' ? fallback.year : Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return fallback;
  return { year: y, month: m };
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  const index = m.year * 12 + (m.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth(m: MonthRef): number {
  return new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
}

/** Day of week of a key, Monday = 0 … Sunday = 6. */
export function mondayIndex(key: string): number {
  const [y, mo, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() + 6) % 7;
}

export interface GridCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Whole weeks (Monday first) covering the month: 35 or 42 cells, rarely 28. */
export function monthGrid(m: MonthRef, todayKey: string): GridCell[] {
  const first = firstDayOf(m);
  const start = addDays(first, -mondayIndex(first));
  const last = `${monthKey(m)}-${pad(daysInMonth(m))}`;
  const end = addDays(last, 6 - mondayIndex(last));
  const count = daysBetween(start, end) + 1;
  const prefix = monthKey(m);
  return Array.from({ length: count }, (_, i) => {
    const key = addDays(start, i);
    return { key, day: Number(key.slice(8, 10)), inMonth: key.startsWith(prefix), isToday: key === todayKey };
  });
}

/** Labels for the grid header, Monday first, from a Sunday-first list (CN,T2,…,T7). */
export function mondayFirst(weekdays: string[]): string[] {
  return [...weekdays.slice(1), weekdays[0]];
}

// ----------------------------------------------------------------------------
// Counts (GET /api/calendar/orders/count)
// ----------------------------------------------------------------------------

export interface DayCount {
  pickups: number;
  returns: number;
  late: number;
}

export interface CountResponseLike {
  countByDate?: Record<string, number> | null;
  byDate?: Record<string, { pickups?: number | null; returns?: number | null }> | null;
  lateReturns?: number | null;
}

/**
 * Hand-overs and returns per Vietnam day. `byDate` (#362) has both; an older API only sends
 * `countByDate` (RESERVED by pickup day), which is then read as hand-overs. Rentals already late
 * on their return are a single number for today, so they sit on today's cell.
 */
export function dayCounts(data: CountResponseLike | null | undefined, todayKey: string): Map<string, DayCount> {
  const map = new Map<string, DayCount>();
  if (!data) return map;
  const get = (key: string) => map.get(key) ?? { pickups: 0, returns: 0, late: 0 };
  if (data.byDate) {
    Object.entries(data.byDate).forEach(([key, v]) => {
      if (!isDayKey(key)) return;
      map.set(key, { ...get(key), pickups: Number(v?.pickups) || 0, returns: Number(v?.returns) || 0 });
    });
  } else if (data.countByDate) {
    Object.entries(data.countByDate).forEach(([key, v]) => {
      if (!isDayKey(key)) return;
      map.set(key, { ...get(key), pickups: Number(v) || 0 });
    });
  }
  const late = Number(data.lateReturns) || 0;
  if (late > 0) map.set(todayKey, { ...get(todayKey), late });
  return map;
}

// ----------------------------------------------------------------------------
// Day panel (GET /api/calendar/orders/by-date, overdue from outlet-operations)
// ----------------------------------------------------------------------------

export type DayRowKind = 'pickup' | 'return';

export interface DayOrderLike {
  id: number;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  pickupPlanAt?: string | null;
  returnPlanAt?: string | null;
  isReadyToDeliver?: boolean | null;
  amountDue?: number | null;
  refundDue?: number | null;
  lateFee?: number | null;
  productName?: string | null;
  productNames?: string | null;
  orderItems?: Array<{ productName?: string | null; quantity?: number | null }> | null;
  items?: Array<{ name?: string | null; quantity?: number | null }> | null;
}

export type DaySub =
  /** hand-over row: when it comes back ("trả T5 08/10"; same day: "trả trong ngày") */
  | { kind: 'returnOn'; day: string }
  | { kind: 'sameDay' }
  /** return row: when it went out */
  | { kind: 'pickedOn'; day: string }
  /** return row past its planned return */
  | { kind: 'late'; day: string; days: number }
  | null;

export interface DayRow {
  id: number;
  orderNumber: string;
  kind: DayRowKind;
  name: string;
  phone: string;
  sub: DaySub;
  notPrepared: boolean;
  products: string;
  money: { kind: 'collect' | 'refund' | 'fee'; amount: number } | null;
}

function productsOf(o: DayOrderLike): string {
  const list = (o.orderItems || [])
    .map((i) => (i.productName ? `${i.productName}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ''}` : ''))
    .filter(Boolean);
  if (list.length) return list.join(', ');
  const items = (o.items || []).map((i) => (i.name ? `${i.name}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ''}` : '')).filter(Boolean);
  if (items.length) return items.join(', ');
  return o.productNames || o.productName || '';
}

/**
 * One row per order for the panel of `dayKey`. A hand-over shows when it comes back (a pickup
 * and return on the same day still belongs to that day); a return shows when it went out, or how
 * many days it is late when its planned return is before `todayKey`.
 */
export function buildDayRow(o: DayOrderLike, kind: DayRowKind, todayKey: string, toDayKey: (iso: string) => string): DayRow {
  const pickupKey = o.pickupPlanAt ? toDayKey(o.pickupPlanAt) : '';
  const returnKey = o.returnPlanAt ? toDayKey(o.returnPlanAt) : '';
  const due = Number(o.amountDue) || 0;
  const refund = Number(o.refundDue) || 0;
  let sub: DaySub = null;
  let money: DayRow['money'] = null;
  if (kind === 'pickup') {
    if (returnKey && pickupKey && returnKey === pickupKey) sub = { kind: 'sameDay' };
    else if (returnKey) sub = { kind: 'returnOn', day: returnKey };
    if (due > 0) money = { kind: 'collect', amount: due };
  } else {
    const late = returnKey && isDayKey(todayKey) ? daysBetween(returnKey, todayKey) : 0;
    if (late > 0) sub = { kind: 'late', day: returnKey, days: late };
    else if (pickupKey) sub = { kind: 'pickedOn', day: pickupKey };
    if (due > 0) money = { kind: 'fee', amount: due };
    else if (refund > 0) money = { kind: 'refund', amount: refund };
  }
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    kind,
    name: (o.customerName || '').trim(),
    phone: o.customerPhone || '',
    sub,
    notPrepared: kind === 'pickup' && o.isReadyToDeliver === false,
    products: productsOf(o),
    money,
  };
}

/** Returns of the day, then late ones (only shown on today), each order once. */
export function mergeReturns(returns: DayRow[], late: DayRow[]): DayRow[] {
  const seen = new Set(returns.map((r) => r.id));
  return [...returns, ...late.filter((r) => !seen.has(r.id) && (seen.add(r.id), true))];
}

/** Accessible name of a cell: "6/10, giao 3, trả 2, trễ 1" built from translated parts. */
export function cellLabel(cell: GridCell, count: DayCount | undefined, parts: { pickups: string; returns: string; late: string }): string {
  const bits = [`${cell.day}/${Number(cell.key.slice(5, 7))}`];
  if (count?.pickups) bits.push(`${parts.pickups} ${count.pickups}`);
  if (count?.returns) bits.push(`${parts.returns} ${count.returns}`);
  if (count?.late) bits.push(`${parts.late} ${count.late}`);
  return bits.join(', ');
}
