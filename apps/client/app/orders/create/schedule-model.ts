/**
 * Tạo đơn / Sửa đơn (#556): which cart lines are booked out for the chosen days ("Trùng lịch", #518).
 * A port of iOS `ScheduleConflictLogic` (apps/mobile/POS ADBD/Model/ScheduleConflict.swift) and the same day rule
 * as the API check (`apps/api/lib/schedule-conflict.ts`): an order holds every Vietnam civil day from its pickup
 * day to its return day, both included; a line is short on a day when stock − units other orders hold that day
 * is less than the quantity asked for. A day no other order holds is never a conflict.
 *
 * Pure and free of @rentalshop/* imports so the tests stay fast. Vietnam has no daylight saving: UTC+7 always.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const keyMs = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const msKey = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** The Vietnam civil day (YYYY-MM-DD) of an instant; null when unreadable. */
export function vnDayKey(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return msKey(ms + VN_OFFSET_MS);
}

/** Day keys from `from` to `to`, both included; an end before the start is the start day only. */
export function dayKeysBetween(from: string, to: string): string[] {
  if (!KEY.test(from)) return [];
  const last = KEY.test(to) && to > from ? to : from;
  const keys: string[] = [];
  // 400 days is far beyond any rental; it only guards against a broken date
  for (let ms = keyMs(from); ms <= keyMs(last) && keys.length < 400; ms += DAY_MS) keys.push(msKey(ms));
  return keys;
}

/** "ORD-001-0003" → "0003", "482113" → "482113" (iOS `OrdersHomeLogic.shortNumber`). */
export function shortOrderNumber(orderNumber: string): string {
  const last = orderNumber.split('-').pop();
  return last ? last : orderNumber;
}

export interface Booking {
  orderNumber?: string | null;
  quantity: number;
  /** Instants as the API sends them */
  pickup: string | Date;
  returnDate: string | Date;
}

export interface LineConflict {
  productId: number;
  productName: string;
  /** Units missing on the worst day */
  shortBy: number;
  /** Vietnam civil days on which the line is short, ascending */
  dayKeys: string[];
  /** Orders holding the item on those days, short numbers ("0003") */
  orderNumbers: string[];
}

export function lineConflict(input: {
  productId: number;
  productName: string;
  requested: number;
  /** Units the outlet holds; null when the answer has none */
  stock: number | null;
  /** Units free for the whole window; the fallback without a stock figure */
  available: number | null;
  bookings: Booking[];
  pickupKey: string;
  returnKey: string;
  /** Whether other orders hold the product; defaults to "some booking was read" */
  heldByOthers?: boolean;
}): LineConflict | null {
  const { requested, stock, available, bookings } = input;
  if (!(requested > 0)) return null;
  if (!(input.heldByOthers ?? bookings.length > 0)) return null;
  const window = dayKeysBetween(input.pickupKey, input.returnKey);
  if (!window.length) return null;
  const held = bookings.flatMap((booking) => {
    const from = vnDayKey(booking.pickup);
    const to = vnDayKey(booking.returnDate);
    return from && to ? [{ booking, days: new Set(dayKeysBetween(from, to)) }] : [];
  });

  let shortDays: string[] = [];
  let worst = 0;
  if (stock != null) {
    for (const key of window) {
      const booked = held.filter((h) => h.days.has(key)).reduce((s, h) => s + Math.max(0, h.booking.quantity || 0), 0);
      const free = Math.max(0, stock - booked);
      if (booked > 0 && free < requested) {
        shortDays.push(key);
        worst = Math.max(worst, requested - free);
      }
    }
  } else if (available != null && available < requested) {
    shortDays = window;
    worst = requested - Math.max(0, available);
  }
  if (!shortDays.length) return null;

  const short = new Set(shortDays);
  const numbers: string[] = [];
  for (const h of held) {
    if (!Array.from(h.days).some((d) => short.has(d))) continue;
    const raw = (h.booking.orderNumber || '').trim();
    if (!raw) continue;
    const n = shortOrderNumber(raw);
    if (!numbers.includes(n)) numbers.push(n);
  }
  return { productId: input.productId, productName: input.productName, shortBy: worst, dayKeys: shortDays, orderNumbers: numbers };
}

/** One result of `POST /api/products/batch-availability`, the fields this screen reads. */
export interface BatchResultLike {
  productId: number;
  productName?: string | null;
  error?: string;
  isAvailable?: boolean | null;
  totalStock?: number | null;
  totalAvailableStock?: number | null;
  availabilityByOutlet?: Array<{
    outletId?: number;
    stock?: number | null;
    effectivelyAvailable?: number | null;
    conflicts?: Array<{
      orderNumber?: string | null;
      quantity?: number | null;
      pickupDate?: string | null;
      returnDate?: string | null;
    }> | null;
  }> | null;
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The row of the order's outlet, or the only row. */
export function outletRow(result: BatchResultLike, outletId: number | null) {
  const rows = result.availabilityByOutlet || [];
  return (outletId != null && rows.find((o) => o.outletId === outletId)) || (rows.length === 1 ? rows[0] : null);
}

/**
 * The conflict of one cart line from the batch answer. The screen asks with quantity 1 per product, so
 * `requested` is the line's quantity: a line whose free units cover it has nothing to explain.
 */
export function conflictFromResult(
  result: BatchResultLike | undefined,
  input: { outletId: number | null; productName: string; requested: number; pickupKey: string; returnKey: string },
): LineConflict | null {
  if (!result || result.error) return null;
  const row = outletRow(result, input.outletId);
  const available = numOrNull(row?.effectivelyAvailable) ?? numOrNull(result.totalAvailableStock);
  if (available != null && available >= input.requested) return null;
  const raw = row?.conflicts || [];
  const bookings: Booking[] = raw.flatMap((c) =>
    c.pickupDate && c.returnDate && vnDayKey(c.pickupDate) && vnDayKey(c.returnDate)
      ? [{ orderNumber: c.orderNumber, quantity: c.quantity || 0, pickup: c.pickupDate, returnDate: c.returnDate }]
      : [],
  );
  return lineConflict({
    productId: result.productId,
    productName: input.productName || result.productName || '',
    requested: input.requested,
    stock: numOrNull(row?.stock) ?? numOrNull(result.totalStock),
    available,
    bookings,
    pickupKey: input.pickupKey,
    returnKey: input.returnKey,
    heldByOthers: raw.length > 0,
  });
}

// ----------------------------------------------------------------------------
// Texts
// ----------------------------------------------------------------------------

/** "03–05/10", "03/10", "30/09–02/10" (first and last short day). */
export function dayRangeText(keys: string[]): string {
  const parts = (key: string | undefined) => {
    const m = key ? KEY.exec(key) : null;
    return m ? { day: m[3], month: m[2] } : null;
  };
  const first = parts(keys[0]);
  if (!first) return '';
  const lastKey = keys[keys.length - 1];
  const last = lastKey !== keys[0] ? parts(lastKey) : null;
  if (!last) return `${first.day}/${first.month}`;
  return first.month === last.month ? `${first.day}–${last.day}/${last.month}` : `${first.day}/${first.month}–${last.day}/${last.month}`;
}

/** "#482113, #0057" */
export const orderListText = (numbers: string[]): string => numbers.map((n) => `#${n}`).join(', ');

// ----------------------------------------------------------------------------
// Setting and button
// ----------------------------------------------------------------------------

/** "Cho tạo đơn khi trùng lịch": a merchant without the field (before #518) reads ON. */
export const allowsOverlap = (merchant: { allowOverlappingOrders?: boolean | null } | null | undefined): boolean =>
  merchant?.allowOverlappingOrders !== false;

/** normal: as before · warn: ask "Trùng lịch" first, "Vẫn tạo đơn" · blocked: create disabled with the notice. */
export type CtaState = 'normal' | 'warn' | 'blocked';

export function ctaState(isRent: boolean, conflictCount: number, allowOverlap: boolean): CtaState {
  if (!isRent || conflictCount <= 0) return 'normal';
  return allowOverlap ? 'warn' : 'blocked';
}
