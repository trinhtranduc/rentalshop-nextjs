/**
 * Pure harness mirroring Order Check: calendar paint + tap-day sheet + isConflict.
 * Uses the same overlap/window rules as GET /availability and availability-calendar.
 */

import {
  calendarDayAvailability,
  resolveAvailabilityQueryWindow,
  toAvailabilityCivilDateKey,
} from '../../../apps/api/lib/availability-calendar-days';

export type OrderCheckTestOrder = {
  id: number;
  orderNumber?: string;
  status: 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'CANCELLED' | 'COMPLETED';
  orderType: 'RENT' | 'SALE';
  pickupPlanAt: Date;
  returnPlanAt: Date;
  quantity?: number;
};

export type OrderCheckQueryMode = 'date' | 'storeUtc';

const ACTIVE_RENT_STATUSES = new Set(['RESERVED', 'PICKUPED']);

/** Same as Prisma where on GET /availability — inclusive civil-day overlap. */
export function rentalPeriodOverlaps(
  pickup: Date,
  ret: Date,
  rentalStart: Date,
  rentalEnd: Date
): boolean {
  return pickup < rentalEnd && ret >= rentalStart;
}

/** How mobile/API resolves the tapped civil day (App Store vs new app). */
export function resolveTappedDayWindow(
  tappedDayKey: string,
  mode: OrderCheckQueryMode
): { start: Date; end: Date; civilDayYmd: string | null } {
  if (mode === 'date') {
    const window = resolveAvailabilityQueryWindow({ date: tappedDayKey });
    if (!window) throw new Error(`Invalid day key: ${tappedDayKey}`);
    return window;
  }

  const window = resolveAvailabilityQueryWindow({
    startDate: `${tappedDayKey}T00:00:00.000Z`,
    endDate: `${tappedDayKey}T23:59:59.999Z`,
  });
  if (!window) throw new Error(`Invalid store UTC window for: ${tappedDayKey}`);
  return window;
}

/** Remaining qty painted on calendar for one civil day (active RENT only). */
export function calendarRemainingForDay(
  tappedDayKey: string,
  stock: number,
  orders: OrderCheckTestOrder[]
): number {
  const activeRent = orders.filter(
    (o) => o.orderType === 'RENT' && ACTIVE_RENT_STATUSES.has(o.status)
  );

  const days = calendarDayAvailability({
    stock,
    fromYmd: tappedDayKey,
    toYmd: tappedDayKey,
    orders: activeRent.map((o) => ({
      pickupPlanAt: o.pickupPlanAt,
      returnPlanAt: o.returnPlanAt,
      quantity: o.quantity ?? 1,
    })),
  });

  return days.find((d) => d.date === tappedDayKey)?.available ?? stock;
}

export type OrderCheckTapResult = {
  tappedDayKey: string;
  queryMode: OrderCheckQueryMode;
  calendarAvailable: number;
  /** All product orders for the sheet; isConflict marks tapped-day overlap only. */
  ordersInSheet: Array<OrderCheckTestOrder & { isConflict: boolean }>;
  conflictOrderIds: number[];
  window: { start: Date; end: Date; civilDayYmd: string | null };
};

/** Mirrors GET /availability includeAllOrders filter for the orders array. */
export function ordersForAvailabilitySheet(
  orders: OrderCheckTestOrder[],
  includeAllOrders: boolean
): OrderCheckTestOrder[] {
  if (includeAllOrders) return orders;
  return orders.filter(
    (o) => o.orderType === 'RENT' && ACTIVE_RENT_STATUSES.has(o.status)
  );
}

/**
 * End-to-end simulation: user taps a calendar cell → paint qty + open order sheet.
 */
export function simulateOrderCheckDayTap(input: {
  tappedDayKey: string;
  stock: number;
  orders: OrderCheckTestOrder[];
  queryMode?: OrderCheckQueryMode;
  /** Mobile Order Check sends includeAllOrders=true. */
  includeAllOrders?: boolean;
}): OrderCheckTapResult {
  const { tappedDayKey, stock, orders, queryMode = 'date', includeAllOrders = true } = input;
  const window = resolveTappedDayWindow(tappedDayKey, queryMode);

  const activeRent = orders.filter(
    (o) => o.orderType === 'RENT' && ACTIVE_RENT_STATUSES.has(o.status)
  );

  const conflictOrderIds = activeRent
    .filter((o) =>
      rentalPeriodOverlaps(o.pickupPlanAt, o.returnPlanAt, window.start, window.end)
    )
    .map((o) => o.id);

  const conflictIdSet = new Set(conflictOrderIds);

  const ordersInSheet = ordersForAvailabilitySheet(orders, includeAllOrders).map((o) => ({
    ...o,
    isConflict: conflictIdSet.has(o.id),
  }));

  return {
    tappedDayKey,
    queryMode,
    calendarAvailable: calendarRemainingForDay(tappedDayKey, stock, orders),
    ordersInSheet,
    conflictOrderIds,
    window,
  };
}

/** Fixed web/mobile shop encoding (mirrors packages/utils convertLocalDateToUTCDatetime). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function convertShopDateToStoredInstant(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS).toISOString();
}

export function shopCivilKeyFromStored(iso: string): string {
  return toAvailabilityCivilDateKey(new Date(iso));
}

/** Build same-day mobile order for shop civil day `ymd`. */
export function mobileSameDayOrder(
  id: number,
  ymd: string,
  overrides: Partial<OrderCheckTestOrder> = {}
): OrderCheckTestOrder {
  const instant = convertShopDateToStoredInstant(ymd);
  return {
    id,
    status: 'RESERVED',
    orderType: 'RENT',
    pickupPlanAt: new Date(instant),
    returnPlanAt: new Date(instant),
    quantity: 1,
    ...overrides,
  };
}
