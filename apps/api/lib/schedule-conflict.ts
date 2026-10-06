/**
 * #518 — "Cho tạo đơn khi trùng lịch" (Merchant.allowOverlappingOrders).
 *
 * Pure check: would saving this rental make some product exceed its outlet stock on some Vietnam
 * civil day? Day model is the Order Check / Lịch Thuê one (`calendarDayAvailability`): an order holds
 * every VN day from its pickup day to its return day inclusive, and a same-day rental holds that day.
 *
 * The rule is the per-day peak, never a sum over the range:
 *   conflict on day D  ⇔  booked(D) + requested > stock
 * where booked(D) counts the product in OTHER active rentals (RENT, RESERVED/PICKUPED, not deleted)
 * at the same outlet that cover D.
 *
 * Kept free of @rentalshop/* imports so the unit tests stay fast.
 */
import {
  calendarDayAvailability,
  getAvailabilityCivilDayBounds,
  toAvailabilityCivilDateKey,
} from './availability-calendar-days';

export const ORDER_SCHEDULE_CONFLICT = 'ORDER_SCHEDULE_CONFLICT';

/** Statuses in which a RENT order holds stock for its planned days. */
export const SCHEDULE_ACTIVE_STATUSES = ['RESERVED', 'PICKUPED'] as const;

export type ScheduleRequestItem = {
  productId: number | null | undefined;
  quantity: number;
  productName?: string | null;
};

export type ScheduleExistingOrder = {
  id: number;
  orderNumber: string;
  outletId: number;
  orderType: string;
  status: string;
  deletedAt?: Date | null;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  orderItems: Array<{ productId: number | null; quantity: number }>;
};

export type ScheduleConflict = {
  /** Public numeric product id */
  productId: number;
  productName: string | null;
  /** Units of this product the order asks for (all its lines summed) */
  requested: number;
  /** Fewest free units on any day of the window (stock - booked, floored at 0) */
  available: number;
  /** VN civil days (YYYY-MM-DD) where booked + requested > stock, ascending */
  days: string[];
  /** Other orders holding this product on those days, ascending */
  orderNumbers: string[];
};

/** True when a RENT order in this status holds stock. */
export function isActiveRental(orderType: string | null | undefined, status: string | null | undefined): boolean {
  return orderType === 'RENT' && (SCHEDULE_ACTIVE_STATUSES as readonly string[]).includes(String(status));
}

/** Sum requested quantity per product; lines without a product or with qty <= 0 are ignored. */
export function sumRequestedByProduct(items: ScheduleRequestItem[]): Map<number, { quantity: number; productName: string | null }> {
  const byProduct = new Map<number, { quantity: number; productName: string | null }>();
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const current = byProduct.get(productId);
    byProduct.set(productId, {
      quantity: (current?.quantity ?? 0) + quantity,
      productName: current?.productName ?? item.productName ?? null,
    });
  }
  return byProduct;
}

/** VN civil day keys [from, to] covered by a pickup/return pair (inverted pairs are swapped). */
export function scheduleWindowDayKeys(pickupPlanAt: Date, returnPlanAt: Date): { fromYmd: string; toYmd: string } {
  const a = toAvailabilityCivilDateKey(pickupPlanAt);
  const b = toAvailabilityCivilDateKey(returnPlanAt);
  return a <= b ? { fromYmd: a, toYmd: b } : { fromYmd: b, toYmd: a };
}

function stockFor(stockByProductId: Map<number, number> | Record<number, number>, productId: number): number {
  const raw = stockByProductId instanceof Map ? stockByProductId.get(productId) : stockByProductId[productId];
  const stock = Number(raw);
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

/**
 * Products of this rental that would be over-booked on some VN civil day. Empty array = OK to save.
 *
 * @param input.productIds  limit the check to these products (an edit that only grows some lines)
 * @param input.excludeOrderId  the order being edited never conflicts with itself
 */
export function findScheduleConflicts(input: {
  outletId: number;
  pickupPlanAt: Date;
  returnPlanAt: Date;
  items: ScheduleRequestItem[];
  /** OutletStock.stock per product at this outlet; a missing product counts as 0 */
  stockByProductId: Map<number, number> | Record<number, number>;
  existingOrders: ScheduleExistingOrder[];
  excludeOrderId?: number | null;
  productIds?: number[] | null;
  productNames?: Map<number, string | null> | Record<number, string | null>;
}): ScheduleConflict[] {
  const { fromYmd, toYmd } = scheduleWindowDayKeys(input.pickupPlanAt, input.returnPlanAt);
  const requestedByProduct = sumRequestedByProduct(input.items);
  const only = input.productIds ? new Set(input.productIds.map(Number)) : null;

  const holders = input.existingOrders.filter(
    (order) =>
      order.outletId === input.outletId &&
      isActiveRental(order.orderType, order.status) &&
      !order.deletedAt &&
      (input.excludeOrderId == null || order.id !== input.excludeOrderId)
  );

  const conflicts: ScheduleConflict[] = [];
  for (const [productId, { quantity: requested, productName }] of requestedByProduct) {
    if (only && !only.has(productId)) continue;

    const stock = stockFor(input.stockByProductId, productId);
    const ordersForProduct = holders
      .map((order) => ({
        orderNumber: order.orderNumber,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        quantity: order.orderItems
          .filter((item) => item.productId === productId)
          .reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
      }))
      .filter((order) => order.quantity > 0);

    const perDay = calendarDayAvailability({ stock, orders: ordersForProduct, fromYmd, toYmd });
    const badDays = perDay.filter((day) => day.booked + requested > stock).map((day) => day.date);
    if (badDays.length === 0) continue;

    const badDaySet = new Set(badDays);
    const orderNumbers = new Set<string>();
    for (const order of ordersForProduct) {
      const held = calendarDayAvailability({ stock: 1, orders: [order], fromYmd, toYmd });
      if (held.some((day) => day.booked > 0 && badDaySet.has(day.date))) orderNumbers.add(order.orderNumber);
    }

    const names = input.productNames;
    const nameFromMap = names instanceof Map ? names.get(productId) : names?.[productId];
    conflicts.push({
      productId,
      productName: productName ?? nameFromMap ?? null,
      requested,
      available: Math.min(...perDay.map((day) => day.available)),
      days: badDays,
      orderNumbers: [...orderNumbers].sort(),
    });
  }

  return conflicts.sort((a, b) => a.productId - b.productId);
}

/** UTC bounds for the SQL overlap filter: [VN start of first day, VN start of the day after the last). */
export function scheduleWindowUtcBounds(pickupPlanAt: Date, returnPlanAt: Date): { start: Date; end: Date } {
  const { fromYmd, toYmd } = scheduleWindowDayKeys(pickupPlanAt, returnPlanAt);
  // Both keys come from toAvailabilityCivilDateKey, so the bounds always parse
  const first = getAvailabilityCivilDayBounds(fromYmd)!;
  const last = getAvailabilityCivilDayBounds(toYmd)!;
  return { start: first.start, end: last.end };
}

/**
 * Which products an edit must re-check (#518).
 * - dates, outlet or "became active" changed → every product of the final item list
 * - otherwise only products whose summed quantity grew (new lines included)
 * - nothing relevant changed → [] (no check, no queries)
 */
export function productsToRecheckOnEdit(input: {
  before: { outletId: number; pickupPlanAt: Date | null; returnPlanAt: Date | null; active: boolean; items: ScheduleRequestItem[] };
  after: { outletId: number; pickupPlanAt: Date | null; returnPlanAt: Date | null; active: boolean; items: ScheduleRequestItem[] };
}): number[] {
  const { before, after } = input;
  if (!after.active || !after.pickupPlanAt || !after.returnPlanAt) return [];

  const afterQty = sumRequestedByProduct(after.items);
  const sameInstant = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);
  const windowOrScopeChanged =
    !before.active ||
    before.outletId !== after.outletId ||
    !sameInstant(before.pickupPlanAt, after.pickupPlanAt) ||
    !sameInstant(before.returnPlanAt, after.returnPlanAt);

  if (windowOrScopeChanged) return [...afterQty.keys()].sort((a, b) => a - b);

  const beforeQty = sumRequestedByProduct(before.items);
  return [...afterQty.entries()]
    .filter(([productId, { quantity }]) => quantity > (beforeQty.get(productId)?.quantity ?? 0))
    .map(([productId]) => productId)
    .sort((a, b) => a - b);
}

/** Parse a date-ish request value; undefined/null/invalid → null. */
export function toDateOrNull(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}
