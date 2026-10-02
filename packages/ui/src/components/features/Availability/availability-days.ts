import type { ActiveOrder } from './types';

/**
 * Day logic for Order Check (/availability). A rental period is a range of Vietnam civil days
 * (`YYYY-MM-DD`). Vietnam has no DST, so a day starts at 17:00Z the day before.
 * Kept free of the @rentalshop/utils barrel so unit tests stay light.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function keyToUtcMidnight(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMidnightToKey(ms: number): string {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** UTC instants for the API: 00:00 of the pickup day to 23:59:59.999 of the return day, Vietnam time. */
export function shopDayRangeIso(pickupKey: string, returnKey: string): { startDate: string; endDate: string } {
  const start = keyToUtcMidnight(pickupKey) - VN_OFFSET_MS;
  const end = keyToUtcMidnight(returnKey) - VN_OFFSET_MS + DAY_MS - 1;
  return { startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString() };
}

/** Vietnam civil day of a stored instant. */
export function shopDateKey(value: string | Date): string {
  const ms = typeof value === 'string' ? Date.parse(value) : value.getTime();
  if (Number.isNaN(ms)) return '';
  return utcMidnightToKey(Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS);
}

export function addDaysToKey(key: string, days: number): string {
  return utcMidnightToKey(keyToUtcMidnight(key) + days * DAY_MS);
}

/** Today in Vietnam. */
export function todayShopKey(now: Date = new Date()): string {
  return shopDateKey(now);
}

export interface KeyRange {
  from: string;
  to: string;
}

/** Quick period chips: today, tomorrow, the coming weekend (Sat–Sun), and 3 days from today. */
export function quickRanges(todayKey: string): { today: KeyRange; tomorrow: KeyRange; weekend: KeyRange; threeDays: KeyRange } {
  const weekday = new Date(keyToUtcMidnight(todayKey)).getUTCDay(); // 0 = Sunday
  const weekendStart = weekday === 0 || weekday === 6 ? todayKey : addDaysToKey(todayKey, 6 - weekday);
  const weekendEnd = weekday === 0 ? todayKey : addDaysToKey(weekendStart, 1);
  return {
    today: { from: todayKey, to: todayKey },
    tomorrow: { from: addDaysToKey(todayKey, 1), to: addDaysToKey(todayKey, 1) },
    weekend: { from: weekendStart, to: weekendEnd },
    threeDays: { from: todayKey, to: addDaysToKey(todayKey, 2) },
  };
}

/** Civil-day ranges overlap (inclusive): a same-day return still occupies that day. */
export function keyRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Orders from `/api/orders` → rows for the checked product, with Vietnam day keys and only
 * that product's units (an order can hold several products).
 */
export function toActiveOrders(orders: any[], productId: number, pickupKey?: string, returnKey?: string): ActiveOrder[] {
  return orders.map((o) => {
    const pickupPlanAt = o.pickupPlanAt ? shopDateKey(o.pickupPlanAt) : '';
    const returnPlanAt = o.returnPlanAt ? shopDateKey(o.returnPlanAt) : pickupPlanAt;
    const items: any[] = o.orderItems || [];
    const quantity = items
      .filter((item) => (item.productId ?? item.product?.id) === productId)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber || `#${o.id}`,
      customerName: o.customer
        ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ')
        : o.customerName || '—',
      pickupPlanAt,
      returnPlanAt,
      quantity: quantity || 1,
      status: o.status || 'RESERVED',
      isConflict:
        Boolean(pickupKey && returnKey && pickupPlanAt) &&
        keyRangesOverlap(pickupKey as string, returnKey as string, pickupPlanAt, returnPlanAt),
    };
  });
}

/** Units still free on each day: stock minus every active order covering that day. */
export function freeUnitsByDay(totalStock: number, orders: ActiveOrder[], dayKeys: string[]): number[] {
  return dayKeys.map((day) => {
    const busy = orders
      .filter((o) => o.pickupPlanAt && keyRangesOverlap(day, day, o.pickupPlanAt, o.returnPlanAt || o.pickupPlanAt))
      .reduce((sum, o) => sum + o.quantity, 0);
    return Math.max(0, totalStock - busy);
  });
}
