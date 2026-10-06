/**
 * #556 shop web Tạo đơn: cart lines booked out for the chosen days ("Trùng lịch"), ported from the iOS
 * ScheduleConflictTests (apps/mobile/POS ADBDTests). Vietnam civil days must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  allowsOverlap,
  conflictFromResult,
  ctaState,
  dayKeysBetween,
  dayRangeText,
  lineConflict,
  orderListText,
  shortOrderNumber,
  vnDayKey,
  type Booking,
  type BatchResultLike,
} from '../apps/client/app/orders/create/schedule-model';

const booking = (orderNumber: string | null, quantity: number, pickup: string, returnDate: string): Booking => ({
  orderNumber,
  quantity,
  pickup,
  returnDate,
});

/** Window 02/10 → 06/10 (Vietnam days) */
const conflict = (requested: number, stock: number | null, bookings: Booking[], available: number | null = null, heldByOthers?: boolean) =>
  lineConflict({
    productId: 7,
    productName: 'Vest đen slim fit',
    requested,
    stock,
    available,
    bookings,
    pickupKey: '2026-10-02',
    returnKey: '2026-10-06',
    heldByOthers,
  });

describe('days', () => {
  it('splits at Vietnam midnight, not UTC', () => {
    expect(vnDayKey('2026-10-02T16:59:59Z')).toBe('2026-10-02');
    expect(vnDayKey('2026-10-02T17:00:00Z')).toBe('2026-10-03');
    expect(vnDayKey(new Date('2026-10-02T17:00:00Z'))).toBe('2026-10-03');
    expect(vnDayKey('not a date')).toBeNull();
    expect(vnDayKey(null)).toBeNull();
  });

  it('lists both ends; a same-day rental is one day; an end before the start is the start day', () => {
    expect(dayKeysBetween('2026-10-03', '2026-10-03')).toEqual(['2026-10-03']);
    expect(dayKeysBetween('2026-10-05', '2026-10-03')).toEqual(['2026-10-05']);
    expect(dayKeysBetween('2026-09-30', '2026-10-02')).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
    expect(dayKeysBetween('', '2026-10-02')).toEqual([]);
  });
});

describe('conflict per day', () => {
  it('names the booked-out days and the order', () => {
    expect(conflict(1, 2, [booking('ORD-1-482113', 2, '2026-10-03T02:00:00Z', '2026-10-05T10:00:00Z')])).toEqual({
      productId: 7,
      productName: 'Vest đen slim fit',
      shortBy: 1,
      dayKeys: ['2026-10-03', '2026-10-04', '2026-10-05'],
      orderNumbers: ['482113'],
    });
  });

  it('takes the peak day, not the sum of all bookings', () => {
    // Stock 3: one unit out 03–04/10, two units out 04–05/10 → only 04/10 holds all three
    const r = conflict(1, 3, [
      booking('ORD-1-0001', 1, '2026-10-03T02:00:00Z', '2026-10-04T02:00:00Z'),
      booking('ORD-1-0002', 2, '2026-10-04T02:00:00Z', '2026-10-05T02:00:00Z'),
    ]);
    expect(r?.dayKeys).toEqual(['2026-10-04']);
    expect(r?.shortBy).toBe(1);
    expect(r?.orderNumbers).toEqual(['0001', '0002']);
  });

  it('reports the worst day as shortBy', () => {
    const r = conflict(3, 3, [
      booking('ORD-1-0001', 1, '2026-10-03T02:00:00Z', '2026-10-03T05:00:00Z'),
      booking('ORD-1-0002', 2, '2026-10-04T02:00:00Z', '2026-10-04T05:00:00Z'),
    ]);
    expect(r?.dayKeys).toEqual(['2026-10-03', '2026-10-04']);
    expect(r?.shortBy).toBe(2);
  });

  it('does not list a booking outside the short days', () => {
    const r = conflict(1, 1, [
      booking('ORD-1-0009', 0, '2026-10-02T02:00:00Z', '2026-10-02T05:00:00Z'),
      booking('ORD-1-0010', 1, '2026-10-05T02:00:00Z', '2026-10-05T05:00:00Z'),
    ]);
    expect(r?.dayKeys).toEqual(['2026-10-05']);
    expect(r?.orderNumbers).toEqual(['0010']);
  });

  it('a return before Vietnam midnight does not touch the next day; a same-day return holds its day', () => {
    const run = (ret: string) =>
      lineConflict({
        productId: 1,
        productName: 'A',
        requested: 1,
        stock: 1,
        available: null,
        bookings: [booking('ORD-1-1', 1, '2026-10-02T02:00:00Z', ret)],
        pickupKey: '2026-10-03',
        returnKey: '2026-10-03',
      });
    expect(run('2026-10-02T16:59:59Z')).toBeNull();
    expect(run('2026-10-02T17:00:00Z')?.dayKeys).toEqual(['2026-10-03']);
  });

  it('enough stock, or nothing asked, is no conflict', () => {
    const held = [booking('ORD-1-482113', 2, '2026-10-03T02:00:00Z', '2026-10-05T10:00:00Z')];
    expect(conflict(1, 3, held)).toBeNull();
    expect(conflict(0, 0, held)).toBeNull();
  });

  it('without a stock figure, the free units decide for the whole window', () => {
    const r = conflict(2, null, [], 0, true);
    expect(r?.dayKeys).toEqual(['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
    expect(r?.shortBy).toBe(2);
    expect(r?.orderNumbers).toEqual([]);
    expect(conflict(2, null, [], 2)).toBeNull();
    expect(conflict(2, null, [], null)).toBeNull();
  });

  it('a day no other order holds is never a conflict', () => {
    // Shops that keep stock at 0 are not blocked (API: booked > 0 && booked + requested > stock)
    expect(conflict(1, 0, [])).toBeNull();
    expect(conflict(2, null, [], 0)).toBeNull();
    const r = conflict(1, 0, [booking('ORD-1-482113', 1, '2026-10-03T02:00:00Z', '2026-10-03T10:00:00Z')]);
    expect(r?.dayKeys).toEqual(['2026-10-03']);
    expect(r?.orderNumbers).toEqual(['482113']);
  });

  it('drops duplicate and blank order numbers', () => {
    const r = conflict(1, 2, [
      booking('ORD-1-482113', 1, '2026-10-03T02:00:00Z', '2026-10-04T02:00:00Z'),
      booking('ORD-1-482113', 1, '2026-10-03T02:00:00Z', '2026-10-04T02:00:00Z'),
      booking(' ', 1, '2026-10-03T02:00:00Z', '2026-10-04T02:00:00Z'),
      booking(null, 1, '2026-10-03T02:00:00Z', '2026-10-04T02:00:00Z'),
    ]);
    expect(r?.orderNumbers).toEqual(['482113']);
  });
});

describe('from the batch availability answer', () => {
  const input = { outletId: 1, productName: '', requested: 1, pickupKey: '2026-10-02', returnKey: '2026-10-06' };
  const booked: BatchResultLike = {
    productId: 7,
    productName: 'Vest đen slim fit',
    totalStock: 1,
    totalAvailableStock: 0,
    isAvailable: false,
    availabilityByOutlet: [
      {
        outletId: 1,
        stock: 1,
        effectivelyAvailable: 0,
        conflicts: [{ orderNumber: 'ORD-1-482113', pickupDate: '2026-10-03T02:00:00.000Z', returnDate: '2026-10-05T10:00:00Z', quantity: 1 }],
      },
    ],
  };

  it('uses the outlet stock and the other orders', () => {
    expect(conflictFromResult(booked, input)).toEqual({
      productId: 7,
      productName: 'Vest đen slim fit',
      shortBy: 1,
      dayKeys: ['2026-10-03', '2026-10-04', '2026-10-05'],
      orderNumbers: ['482113'],
    });
    expect(conflictFromResult(booked, { ...input, productName: 'Vest (cart)' })?.productName).toBe('Vest (cart)');
  });

  it('a line whose free units cover its quantity has nothing to explain', () => {
    const fits: BatchResultLike = {
      productId: 7,
      isAvailable: true,
      availabilityByOutlet: [{ outletId: 1, stock: 20, effectivelyAvailable: 16, conflicts: booked.availabilityByOutlet![0].conflicts }],
    };
    expect(conflictFromResult(fits, input)).toBeNull();
    // The screen asks with quantity 1: a line of 17 is short on the days the other orders hold
    const r = conflictFromResult(
      {
        ...fits,
        availabilityByOutlet: [
          {
            outletId: 1,
            stock: 20,
            effectivelyAvailable: 16,
            conflicts: [{ orderNumber: 'ORD-001-0003', pickupDate: '2026-10-03T02:00:00Z', returnDate: '2026-10-04T02:00:00Z', quantity: 4 }],
          },
        ],
      },
      { ...input, requested: 17 },
    );
    expect(r).toMatchObject({ shortBy: 1, dayKeys: ['2026-10-03', '2026-10-04'], orderNumbers: ['0003'] });
  });

  it('no other orders: no conflict, even at stock 0', () => {
    const empty: BatchResultLike = {
      productId: 7,
      isAvailable: false,
      totalStock: 0,
      totalAvailableStock: 0,
      availabilityByOutlet: [{ outletId: 1, stock: 0, effectivelyAvailable: 0, conflicts: [] }],
    };
    expect(conflictFromResult(empty, input)).toBeNull();
    expect(conflictFromResult(undefined, input)).toBeNull();
    expect(conflictFromResult({ productId: 7, error: 'NOT_FOUND' }, input)).toBeNull();
  });

  it('unreadable booking dates fall back to the free units', () => {
    const r = conflictFromResult(
      {
        productId: 7,
        isAvailable: false,
        totalAvailableStock: 1,
        availabilityByOutlet: [{ outletId: 1, conflicts: [{ orderNumber: 'ORD-1-9', pickupDate: 'not a date', returnDate: null, quantity: 1 }] }],
      },
      { ...input, requested: 2, productName: 'Vest' },
    );
    expect(r?.shortBy).toBe(1);
    expect(r?.dayKeys).toHaveLength(5);
    expect(r?.orderNumbers).toEqual([]);
  });

  it('reads the order outlet row, else the only row', () => {
    const two: BatchResultLike = {
      productId: 7,
      availabilityByOutlet: [
        { outletId: 2, stock: 5, effectivelyAvailable: 5, conflicts: [] },
        booked.availabilityByOutlet![0],
      ],
    };
    expect(conflictFromResult(two, input)?.orderNumbers).toEqual(['482113']);
    expect(conflictFromResult(two, { ...input, outletId: 2 })).toBeNull();
  });
});

describe('texts', () => {
  it('formats the day range like iOS', () => {
    expect(dayRangeText(['2026-10-03', '2026-10-04', '2026-10-05'])).toBe('03–05/10');
    expect(dayRangeText(['2026-10-03'])).toBe('03/10');
    expect(dayRangeText(['2026-09-30', '2026-10-01', '2026-10-02'])).toBe('30/09–02/10');
    expect(dayRangeText([])).toBe('');
  });

  it('lists short order numbers', () => {
    expect(orderListText(['482113', '0057'])).toBe('#482113, #0057');
    expect(shortOrderNumber('ORD-001-0003')).toBe('0003');
    expect(shortOrderNumber('482113')).toBe('482113');
  });
});

describe('setting and button', () => {
  it('reads a missing setting as ON, like before #518', () => {
    expect(allowsOverlap(null)).toBe(true);
    expect(allowsOverlap({})).toBe(true);
    expect(allowsOverlap({ allowOverlappingOrders: null })).toBe(true);
    expect(allowsOverlap({ allowOverlappingOrders: true })).toBe(true);
    expect(allowsOverlap({ allowOverlappingOrders: false })).toBe(false);
  });

  it('warns when ON, blocks when OFF, leaves sales and clean carts alone', () => {
    expect(ctaState(true, 0, false)).toBe('normal');
    expect(ctaState(false, 1, false)).toBe('normal');
    expect(ctaState(true, 1, true)).toBe('warn');
    expect(ctaState(true, 2, false)).toBe('blocked');
  });
});
