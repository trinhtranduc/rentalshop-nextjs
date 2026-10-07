/**
 * Kiểm tra còn hàng (#527): pure mapping for the period result, the day strip and the orders
 * holding the product. No React and no clock: callers pass the shop's today key (Vietnam civil
 * day) and a `toDayKey` for ISO instants, so the result is the same under any machine TZ.
 * A day counts both the pickup and the return day, also when both are the same day.
 */
import { addDays, daysBetween, isDayKey } from '../dashboard/overview-model';

export { addDays, daysBetween, isDayKey };

/** Civil-day ranges overlap, ends included. */
export const overlaps = (aFrom: string, aTo: string, bFrom: string, bTo: string): boolean => aFrom <= bTo && bFrom <= aTo;

/** `?pickup=&return=` from the URL; a reversed or broken pair falls back to today → today + 2. */
export function parsePeriod(pickup: string | null | undefined, ret: string | null | undefined, todayKey: string): { from: string; to: string } {
  const from = isDayKey(pickup) ? pickup : null;
  const to = isDayKey(ret) ? ret : null;
  if (from && to && to >= from) return { from, to };
  if (from && !to) return { from, to: from };
  return { from: todayKey, to: addDays(todayKey, 2) };
}

export function parseQty(value: string | null | undefined): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 999) : 1;
}

/** Quick period chips: today, tomorrow, the coming weekend (Sat–Sun), 3 days from today. */
export function quickPeriods(todayKey: string): Record<'today' | 'tomorrow' | 'weekend' | 'threeDays', { from: string; to: string }> {
  const [y, m, d] = todayKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const sat = weekday === 0 || weekday === 6 ? todayKey : addDays(todayKey, 6 - weekday);
  return {
    today: { from: todayKey, to: todayKey },
    tomorrow: { from: addDays(todayKey, 1), to: addDays(todayKey, 1) },
    weekend: { from: sat, to: weekday === 0 ? todayKey : addDays(sat, 1) },
    threeDays: { from: todayKey, to: addDays(todayKey, 2) },
  };
}

/**
 * Days of the strip: from two days before the pickup, at least 14 days, long enough to show the
 * whole period plus two days after it (capped at `maxDays`).
 */
export function stripDays(from: string, to: string, minDays = 14, maxDays = 42): string[] {
  const start = addDays(from, -2);
  const length = Math.min(maxDays, Math.max(minDays, daysBetween(start, to) + 3));
  return Array.from({ length }, (_, i) => addDays(start, i));
}

// ----------------------------------------------------------------------------
// Orders holding the product (GET /api/orders?productId=)
// ----------------------------------------------------------------------------

export interface RawOrderLike {
  id: number;
  orderNumber?: string | null;
  status?: string | null;
  orderType?: string | null;
  pickupPlanAt?: string | null;
  returnPlanAt?: string | null;
  customerName?: string | null;
  customer?: { firstName?: string | null; lastName?: string | null } | null;
  orderItems?: Array<{ productId?: number | null; product?: { id?: number | null } | null; quantity?: number | null }> | null;
}

export interface Holder {
  id: number;
  orderNumber: string;
  name: string;
  status: 'RESERVED' | 'PICKUPED';
  orderType: string;
  pickupKey: string;
  returnKey: string;
  /** Units of this product in the order */
  quantity: number;
  /** Holds units on a day of the checked period */
  inPeriod: boolean;
}

/**
 * Active orders (RESERVED, PICKUPED) of the product, with Vietnam day keys and only this
 * product's units, sorted by pickup day. A missing return day means the pickup day only.
 */
export function toHolders(
  orders: RawOrderLike[],
  productId: number,
  period: { from: string; to: string },
  toDayKey: (iso: string) => string,
): Holder[] {
  return orders
    .filter((o) => o.status === 'RESERVED' || o.status === 'PICKUPED')
    .map((o) => {
      const pickupKey = o.pickupPlanAt ? toDayKey(o.pickupPlanAt) : '';
      const returnKey = o.returnPlanAt ? toDayKey(o.returnPlanAt) : pickupKey;
      const units = (o.orderItems || [])
        .filter((i) => (i.productId ?? i.product?.id) === productId)
        .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const name = o.customer ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ').trim() : (o.customerName || '').trim();
      return {
        id: o.id,
        orderNumber: o.orderNumber || String(o.id),
        name,
        status: o.status as Holder['status'],
        orderType: o.orderType || 'RENT',
        pickupKey,
        returnKey: returnKey || pickupKey,
        quantity: units || 1,
        inPeriod: !!pickupKey && overlaps(period.from, period.to, pickupKey, returnKey || pickupKey),
      };
    })
    .sort((a, b) => (a.pickupKey || '9999').localeCompare(b.pickupKey || '9999') || a.id - b.id);
}

/**
 * Units still free on each day: stock minus every rental covering that day (both ends included).
 * Sale orders hold no days, like the availability API.
 */
export function freeByDay(total: number, holders: Holder[], days: string[]): number[] {
  const rentals = holders.filter((h) => h.orderType !== 'SALE' && h.pickupKey);
  return days.map((day) => {
    const busy = rentals.filter((h) => overlaps(day, day, h.pickupKey, h.returnKey)).reduce((sum, h) => sum + h.quantity, 0);
    return Math.max(0, total - busy);
  });
}

/** Colour of a day's number: none free (or fewer than asked), just enough, plenty. */
export function dayLevel(free: number, quantity: number): 'none' | 'tight' | 'ok' {
  if (free <= 0 || free < quantity) return 'none';
  if (free === quantity) return 'tight';
  return 'ok';
}

/** Columns (0-based, inclusive) of a holder's bar inside the strip, or null when outside it. */
export function barColumns(h: Holder, days: string[]): { start: number; end: number } | null {
  if (!h.pickupKey || days.length === 0) return null;
  const first = days[0];
  const last = days[days.length - 1];
  if (!overlaps(first, last, h.pickupKey, h.returnKey)) return null;
  const start = h.pickupKey < first ? 0 : daysBetween(first, h.pickupKey);
  const end = h.returnKey > last ? days.length - 1 : daysBetween(first, h.returnKey);
  return { start, end };
}

/** Text in the bar: "trả 05/10" for a rental already out, else "06/10 → 08/10" (one day: "06/10"). */
export function barText(h: Holder): { kind: 'returnOn'; day: string } | { kind: 'range'; from: string; to: string } | { kind: 'single'; day: string } {
  if (h.status === 'PICKUPED') return { kind: 'returnOn', day: h.returnKey };
  if (h.pickupKey === h.returnKey) return { kind: 'single', day: h.pickupKey };
  return { kind: 'range', from: h.pickupKey, to: h.returnKey };
}

/** "06/10" */
export const dayMonth = (key: string): string => (isDayKey(key) ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : '');

// ----------------------------------------------------------------------------
// Period result (GET /api/products/{id}/availability)
// ----------------------------------------------------------------------------

export interface StockLike {
  free: number;
  total: number;
}

export type Verdict = { kind: 'ok'; free: number; total: number } | { kind: 'short'; missing: number; free: number; total: number } | { kind: 'none'; total: number };

export function verdictOf(stock: StockLike, quantity: number): Verdict {
  if (stock.free <= 0) return { kind: 'none', total: stock.total };
  if (stock.free < quantity) return { kind: 'short', missing: quantity - stock.free, free: stock.free, total: stock.total };
  return { kind: 'ok', free: stock.free, total: stock.total };
}

/** Same-category products with enough free units for the period, most free first. */
export function similarFree<P extends { id: number }>(
  products: P[],
  currentId: number,
  stockOf: (id: number) => StockLike | null | undefined,
  quantity: number,
  limit = 5,
): Array<{ product: P; free: number; total: number }> {
  return products
    .filter((p) => p.id !== currentId)
    .map((p) => ({ product: p, stock: stockOf(p.id) }))
    .filter((x): x is { product: P; stock: StockLike } => !!x.stock && x.stock.free >= quantity)
    .sort((a, b) => b.stock.free - a.stock.free)
    .slice(0, limit)
    .map((x) => ({ product: x.product, free: x.stock.free, total: x.stock.total }));
}
