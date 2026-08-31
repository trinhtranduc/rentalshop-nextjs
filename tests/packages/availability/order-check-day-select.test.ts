/**
 * Order Check — tap day: calendar qty, sheet list, isConflict must stay in sync (VN civil days).
 */

import { describe, expect, it } from '@jest/globals';
import {
  calendarRemainingForDay,
  convertShopDateToStoredInstant,
  mobileSameDayOrder,
  rentalPeriodOverlaps,
  resolveTappedDayWindow,
  shopCivilKeyFromStored,
  simulateOrderCheckDayTap,
} from './order-check-day-select.harness';

describe('Order Check day tap — calendar paint matches conflict', () => {
  const stock = 1;

  it('tap 28/09 with active same-day order: calendar 0, sheet lists order, isConflict true', () => {
    const order = mobileSameDayOrder(101, '2026-09-28');
    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock,
      orders: [order],
    });

    expect(result.calendarAvailable).toBe(0);
    expect(result.ordersInSheet).toHaveLength(1);
    expect(result.ordersInSheet[0].id).toBe(101);
    expect(result.ordersInSheet[0].isConflict).toBe(true);
    expect(result.conflictOrderIds).toEqual([101]);
  });

  /** Live prod bug: order 834769 stored as 26T17Z (27/9 VN), calendar paints 27 booked but tap 27 showed renting=0. */
  it('tap 27/09 with same-day order stored as 26T17Z: calendar 0, isConflict true', () => {
    const order = mobileSameDayOrder(12351, '2026-09-27');
    expect(order.pickupPlanAt.toISOString()).toBe('2026-09-26T17:00:00.000Z');

    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-27',
      stock,
      orders: [order],
    });

    expect(result.window.start.toISOString()).toBe('2026-09-26T17:00:00.000Z');
    expect(result.window.end.toISOString()).toBe('2026-09-27T17:00:00.000Z');
    expect(result.calendarAvailable).toBe(0);
    expect(result.ordersInSheet).toHaveLength(1);
    expect(result.ordersInSheet[0].isConflict).toBe(true);
    expect(result.conflictOrderIds).toEqual([12351]);
  });

  it('tap 27/09 when order is on 28/09 only: calendar 1, sheet shows order without conflict', () => {
    const order = mobileSameDayOrder(102, '2026-09-28');
    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-27',
      stock,
      orders: [order],
    });

    expect(result.calendarAvailable).toBe(1);
    expect(result.ordersInSheet).toHaveLength(1);
    expect(result.ordersInSheet[0].isConflict).toBe(false);
    expect(result.conflictOrderIds).toHaveLength(0);
  });

  it('tap 29/09 when order is on 28/09 only: calendar 1, sheet shows order without conflict', () => {
    const order = mobileSameDayOrder(103, '2026-09-28');
    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-29',
      stock,
      orders: [order],
    });

    expect(result.calendarAvailable).toBe(1);
    expect(result.ordersInSheet).toHaveLength(1);
    expect(result.ordersInSheet[0].isConflict).toBe(false);
  });

  it('Aug screenshot: tap 27 must not flag order on 28 as conflict', () => {
    const orderOn28 = mobileSameDayOrder(201, '2026-08-28');
    const tap27 = simulateOrderCheckDayTap({
      tappedDayKey: '2026-08-27',
      stock,
      orders: [orderOn28],
    });

    expect(tap27.calendarAvailable).toBe(1);
    expect(tap27.ordersInSheet).toHaveLength(1);
    expect(tap27.ordersInSheet[0].isConflict).toBe(false);

    const tap28 = simulateOrderCheckDayTap({
      tappedDayKey: '2026-08-28',
      stock,
      orders: [orderOn28],
    });

    expect(tap28.calendarAvailable).toBe(0);
    expect(tap28.ordersInSheet[0]?.isConflict).toBe(true);
  });
});

describe('Order Check query mode parity (date= vs store T00/T23)', () => {
  const order = mobileSameDayOrder(301, '2026-09-20');

  it('date= and storeUtc produce the same window, calendar, and conflicts', () => {
    const viaDate = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-20',
      stock: 1,
      orders: [order],
      queryMode: 'date',
    });
    const viaStore = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-20',
      stock: 1,
      orders: [order],
      queryMode: 'storeUtc',
    });

    expect(viaStore.window.start.toISOString()).toBe(viaDate.window.start.toISOString());
    expect(viaStore.window.end.toISOString()).toBe(viaDate.window.end.toISOString());
    expect(viaStore.calendarAvailable).toBe(viaDate.calendarAvailable);
    expect(viaStore.conflictOrderIds).toEqual(viaDate.conflictOrderIds);
    expect(viaStore.ordersInSheet.map((o) => o.isConflict)).toEqual(
      viaDate.ordersInSheet.map((o) => o.isConflict)
    );
  });
});

describe('Order Check sheet — all product orders, highlight conflict on tapped day only', () => {
  it('returns every order; only the one on the tapped day gets isConflict', () => {
    const order27 = mobileSameDayOrder(1001, '2026-09-27');
    const order28 = mobileSameDayOrder(1002, '2026-09-28');

    const tap27 = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-27',
      stock: 1,
      orders: [order27, order28],
    });

    expect(tap27.ordersInSheet).toHaveLength(2);
    expect(tap27.ordersInSheet.find((o) => o.id === 1001)?.isConflict).toBe(true);
    expect(tap27.ordersInSheet.find((o) => o.id === 1002)?.isConflict).toBe(false);

    const tap28 = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 1,
      orders: [order27, order28],
    });

    expect(tap28.ordersInSheet.find((o) => o.id === 1001)?.isConflict).toBe(false);
    expect(tap28.ordersInSheet.find((o) => o.id === 1002)?.isConflict).toBe(true);
  });
});

describe('Order Check sheet — status and order type rules', () => {
  it('RETURNED RENT appears in sheet but isConflict=false; RESERVED on same day conflicts', () => {
    const returned = mobileSameDayOrder(401, '2026-09-28', { status: 'RETURNED' });
    const active = mobileSameDayOrder(402, '2026-09-28', { status: 'RESERVED' });

    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 2,
      orders: [returned, active],
    });

    expect(result.ordersInSheet).toHaveLength(2);
    const returnedRow = result.ordersInSheet.find((o) => o.id === 401);
    const activeRow = result.ordersInSheet.find((o) => o.id === 402);
    expect(returnedRow?.isConflict).toBe(false);
    expect(activeRow?.isConflict).toBe(true);
    expect(result.calendarAvailable).toBe(1); // only active order blocks stock
  });

  it('PICKUPED RENT on tapped day conflicts like RESERVED', () => {
    const order = mobileSameDayOrder(501, '2026-09-28', { status: 'PICKUPED' });
    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 1,
      orders: [order],
    });

    expect(result.calendarAvailable).toBe(0);
    expect(result.ordersInSheet[0].isConflict).toBe(true);
  });

  it('SALE order overlapping the day is never a rental conflict', () => {
    const saleInstant = convertShopDateToStoredInstant('2026-09-28');
    const saleOrder = {
      id: 601,
      status: 'COMPLETED' as const,
      orderType: 'SALE' as const,
      pickupPlanAt: new Date(saleInstant),
      returnPlanAt: new Date(saleInstant),
    };
    const rentOrder = mobileSameDayOrder(602, '2026-09-28');

    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 1,
      orders: [saleOrder, rentOrder],
    });

    expect(result.ordersInSheet).toHaveLength(2);
    expect(result.ordersInSheet.find((o) => o.id === 601)?.isConflict).toBe(false);
    expect(result.ordersInSheet.find((o) => o.id === 602)?.isConflict).toBe(true);
    expect(result.calendarAvailable).toBe(0);
  });
});

describe('Order Check multi-day rental spans', () => {
  it('order 26→28: tap 27 conflicts; tap 25 does not', () => {
    const order: Parameters<typeof simulateOrderCheckDayTap>[0]['orders'][0] = {
      id: 701,
      status: 'RESERVED',
      orderType: 'RENT',
      pickupPlanAt: new Date(convertShopDateToStoredInstant('2026-09-26')),
      returnPlanAt: new Date(convertShopDateToStoredInstant('2026-09-28')),
      quantity: 1,
    };

    expect(
      simulateOrderCheckDayTap({ tappedDayKey: '2026-09-27', stock: 1, orders: [order] })
        .ordersInSheet[0]?.isConflict
    ).toBe(true);

    expect(
      simulateOrderCheckDayTap({ tappedDayKey: '2026-09-25', stock: 1, orders: [order] })
        .ordersInSheet[0]?.isConflict
    ).toBe(false);

    expect(calendarRemainingForDay('2026-09-27', 1, [order])).toBe(0);
    expect(calendarRemainingForDay('2026-09-25', 1, [order])).toBe(1);
  });

  it('stock=2 with two same-day orders: calendar 0, both conflict', () => {
    const orders = [
      mobileSameDayOrder(801, '2026-09-28'),
      mobileSameDayOrder(802, '2026-09-28'),
    ];
    const result = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 2,
      orders,
    });

    expect(result.calendarAvailable).toBe(0);
    expect(result.ordersInSheet.filter((o) => o.isConflict)).toHaveLength(2);
  });
});

describe('Shop date encoding (web + mobile write path)', () => {
  it('roundtrip: pick 28/09 → store → civil key 28/09', () => {
    const stored = convertShopDateToStoredInstant('2026-09-28');
    expect(stored).toBe('2026-09-27T17:00:00.000Z');
    expect(shopCivilKeyFromStored(stored)).toBe('2026-09-28');
  });

  it('legacy web bug instant books next calendar day, not selected day', () => {
    const legacyInstant = '2026-09-28T17:00:00.000Z';
    expect(shopCivilKeyFromStored(legacyInstant)).toBe('2026-09-29');

    const order = mobileSameDayOrder(901, '2026-09-28');
    // Simulate legacy stored value (off-by-one web bug)
    const legacyOrder = {
      ...order,
      pickupPlanAt: new Date(legacyInstant),
      returnPlanAt: new Date(legacyInstant),
    };

    expect(calendarRemainingForDay('2026-09-28', 1, [legacyOrder])).toBe(1);
    expect(calendarRemainingForDay('2026-09-29', 1, [legacyOrder])).toBe(0);

    const tap28 = simulateOrderCheckDayTap({
      tappedDayKey: '2026-09-28',
      stock: 1,
      orders: [legacyOrder],
    });
    expect(tap28.ordersInSheet).toHaveLength(1);
    expect(tap28.ordersInSheet[0].isConflict).toBe(false);
    expect(tap28.calendarAvailable).toBe(1);
  });
});

describe('Order Check window boundaries', () => {
  it('same-day order at VN midnight satisfies pickup < end and return >= start', () => {
    const window = resolveTappedDayWindow('2026-09-28', 'date');
    const pickup = new Date('2026-09-27T17:00:00.000Z');
    const ret = new Date('2026-09-27T17:00:00.000Z');

    expect(rentalPeriodOverlaps(pickup, ret, window.start, window.end)).toBe(true);
    expect(pickup < window.end).toBe(true);
    expect(ret >= window.start).toBe(true);
  });

  it('order starting exactly at next VN midnight does not overlap prior day', () => {
    const window = resolveTappedDayWindow('2026-09-28', 'date');
    const nextDayPickup = new Date('2026-09-28T17:00:00.000Z'); // 29/09 VN

    expect(rentalPeriodOverlaps(nextDayPickup, nextDayPickup, window.start, window.end)).toBe(
      false
    );
  });
});
