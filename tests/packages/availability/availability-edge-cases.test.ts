/**
 * Availability edge-case matrix
 *
 * End-to-end checks: overlap detection → aggregateConflictingQuantities
 * → calculateEffectivelyAvailable → buildAvailabilityMetrics
 *
 * Field semantics:
 * - stock (Kho): physical count in outlet (may lag after SALE)
 * - available / totalAvailableStock (Có sẵn): shelf now, SALE-aware
 * - effectivelyAvailable (verdict): schedulable for the checked period
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateConflictingQuantities,
  buildAvailabilityMetrics,
  calculateEffectivelyAvailable,
  resolveTotalAvailableStock,
  type ConflictingOrderInput,
} from '../../../apps/api/lib/availability';

// Same formula as GET /api/products/[id]/availability Prisma where clause
function periodsOverlap(
  orderPickup: Date,
  orderReturn: Date,
  rentalStart: Date,
  rentalEnd: Date
): boolean {
  return orderPickup < rentalEnd && orderReturn > rentalStart;
}

function dayRangeUtc(isoDate: string): { start: Date; end: Date } {
  return {
    start: new Date(`${isoDate}T00:00:00.000Z`),
    end: new Date(`${isoDate}T23:59:59.999Z`),
  };
}

function rentOrder(input: {
  id: number;
  status: 'RESERVED' | 'PICKUPED';
  pickup: string;
  return: string;
  quantity: number;
  productId?: number;
  outletId?: number;
}): ConflictingOrderInput & { pickupPlanAt: Date; returnPlanAt: Date } {
  return {
    id: input.id,
    orderType: 'RENT',
    status: input.status,
    outletId: input.outletId ?? 30,
    pickupPlanAt: new Date(input.pickup),
    returnPlanAt: new Date(input.return),
    orderItems: [{ productId: input.productId ?? 13832, quantity: input.quantity }],
  };
}

function simulateAvailability(input: {
  outletStock: { stock: number; available: number; renting: number; outletId?: number };
  orders: ReturnType<typeof rentOrder>[];
  checkDate: string;
  requestedQuantity?: number;
  productId?: number;
}) {
  const productId = input.productId ?? 13832;
  const outletId = input.outletStock.outletId ?? 30;
  const { start: rentalStart, end: rentalEnd } = dayRangeUtc(input.checkDate);

  const overlappingOrders = input.orders.filter((order) =>
    periodsOverlap(order.pickupPlanAt, order.returnPlanAt, rentalStart, rentalEnd)
  );

  const { conflictingQuantity, reservedConflictQuantity } = aggregateConflictingQuantities(
    productId,
    outletId,
    overlappingOrders
  );

  const metrics = buildAvailabilityMetrics({
    outletStock: {
      stock: input.outletStock.stock,
      available: input.outletStock.available,
      renting: input.outletStock.renting,
      outlet: { id: outletId, name: 'Test outlet' },
    },
    conflictingQuantity,
    reservedConflictQuantity,
    requestedQuantity: input.requestedQuantity ?? 1,
  });

  return {
    overlappingOrderIds: overlappingOrders.map((o) => o.id),
    conflictingQuantity,
    reservedConflictQuantity,
    metrics,
  };
}

// Production snapshot: product 13832, outlet 30
const PRODUCT_13832_STOCK = { stock: 20, available: 19, renting: 1 };
const THUY_RENT = rentOrder({
  id: 7480,
  status: 'PICKUPED',
  pickup: '2026-07-07T17:00:00.000Z',
  return: '2026-07-12T16:59:59.000Z',
  quantity: 1,
});

describe('Product 13832 timeline (SALE -1, PICKUPED Thuỷ 7/7–12/7)', () => {
  it.each([
    {
      checkDate: '2026-07-10',
      expectOverlap: true,
      expectEffective: 18,
      note: 'check day inside rental window',
    },
    {
      checkDate: '2026-07-12',
      expectOverlap: true,
      expectEffective: 18,
      note: 'return 12/7 16:59 still overlaps full check day',
    },
    {
      checkDate: '2026-07-13',
      expectOverlap: false,
      expectEffective: 19,
      note: 'return before check day starts — no schedule block',
    },
    {
      checkDate: '2026-07-16',
      expectOverlap: false,
      expectEffective: 19,
      note: 'no overlap; verdict must not use raw stock (20)',
    },
  ])('$checkDate → overlap=$expectOverlap, effective=$expectEffective ($note)', ({
    checkDate,
    expectOverlap,
    expectEffective,
  }) => {
    const result = simulateAvailability({
      outletStock: PRODUCT_13832_STOCK,
      orders: [THUY_RENT],
      checkDate,
    });

    expect(result.overlappingOrderIds.length > 0).toBe(expectOverlap);
    expect(result.metrics.totalAvailableStock).toBe(19);
    expect(result.metrics.effectivelyAvailable).toBe(expectEffective);
    expect(result.metrics.effectivelyAvailable).not.toBe(20);
    expect(result.metrics.isAvailable).toBe(expectEffective >= 1);
  });
});

describe('calculateEffectivelyAvailable — formula matrix', () => {
  it.each([
    {
      name: 'PICKUPED-only overlap',
      input: {
        totalStock: 20,
        totalAvailableStock: 19,
        totalRenting: 1,
        conflictingQuantity: 1,
        reservedConflictQuantity: 0,
      },
      expected: 18,
    },
    {
      name: 'no overlap, SALE reduces shelf',
      input: {
        totalStock: 20,
        totalAvailableStock: 19,
        totalRenting: 1,
        conflictingQuantity: 0,
        reservedConflictQuantity: 0,
      },
      expected: 19,
    },
    {
      name: 'only RESERVED overlap',
      input: {
        totalStock: 10,
        totalAvailableStock: 10,
        totalRenting: 0,
        conflictingQuantity: 3,
        reservedConflictQuantity: 3,
      },
      expected: 7,
    },
    {
      name: 'mixed RESERVED + PICKUPED (reserved branch)',
      input: {
        totalStock: 10,
        totalAvailableStock: 8,
        totalRenting: 2,
        conflictingQuantity: 4,
        reservedConflictQuantity: 2,
      },
      expected: 6,
    },
    {
      name: 'multiple PICKUPED overlaps',
      input: {
        totalStock: 20,
        totalAvailableStock: 17,
        totalRenting: 3,
        conflictingQuantity: 5,
        reservedConflictQuantity: 0,
      },
      expected: 12,
    },
    {
      name: 'conflicts exceed shelf (floor at 0)',
      input: {
        totalStock: 5,
        totalAvailableStock: 3,
        totalRenting: 2,
        conflictingQuantity: 10,
        reservedConflictQuantity: 0,
      },
      expected: 0,
    },
    {
      name: 'batch fix: shelf=0, rented, no overlap',
      input: {
        totalStock: 1,
        totalAvailableStock: 0,
        totalRenting: 1,
        conflictingQuantity: 0,
        reservedConflictQuantity: 0,
      },
      expected: 1,
    },
    {
      name: 'truly out of stock: shelf=0, renting=0',
      input: {
        totalStock: 0,
        totalAvailableStock: 0,
        totalRenting: 0,
        conflictingQuantity: 0,
        reservedConflictQuantity: 0,
      },
      expected: 0,
    },
    {
      name: 'shelf=0, renting=0 but conflicts (impossible state guard)',
      input: {
        totalStock: 5,
        totalAvailableStock: 0,
        totalRenting: 0,
        conflictingQuantity: 2,
        reservedConflictQuantity: 2,
      },
      expected: 3,
    },
    {
      name: 'partial rent out, no overlap — uses shelf not stock',
      input: {
        totalStock: 10,
        totalAvailableStock: 7,
        totalRenting: 3,
        conflictingQuantity: 0,
        reservedConflictQuantity: 0,
      },
      expected: 7,
    },
  ])('$name → $expected', ({ input, expected }) => {
    expect(calculateEffectivelyAvailable(input)).toBe(expected);
  });
});

describe('resolveTotalAvailableStock — data quality edge cases', () => {
  it.each([
    { stock: 20, available: 19, renting: 1, expected: 19, note: 'prefer available (SALE-aware)' },
    { stock: 20, available: -1, renting: 1, expected: 19, note: 'negative available → stock - renting' },
    { stock: 10, available: 0, renting: 0, expected: 0, note: 'sold out' },
    { stock: 5, available: 5, renting: 0, expected: 5, note: 'full shelf' },
    { stock: 0, available: 0, renting: 0, expected: 0, note: 'empty outlet' },
  ])('$note: shelf=$expected', ({ stock, available, renting, expected }) => {
    expect(resolveTotalAvailableStock({ stock, available, renting })).toBe(expected);
  });
});

describe('aggregateConflictingQuantities — filtering edge cases', () => {
  const base = THUY_RENT;

  it('ignores wrong productId in order items', () => {
    const order = {
      ...base,
      orderItems: [{ productId: 99999, quantity: 5 }],
    };
    const result = aggregateConflictingQuantities(13832, 30, [order]);
    expect(result.conflictingQuantity).toBe(0);
  });

  it('sums only matching product lines in multi-item order', () => {
    const order = {
      ...base,
      orderItems: [
        { productId: 13832, quantity: 2 },
        { productId: 555, quantity: 10 },
      ],
    };
    const result = aggregateConflictingQuantities(13832, 30, [order]);
    expect(result.conflictingQuantity).toBe(2);
  });

  it('accumulates multiple overlapping orders', () => {
    const orders = [
      rentOrder({ id: 1, status: 'PICKUPED', pickup: '2026-07-07T00:00:00Z', return: '2026-07-15T00:00:00Z', quantity: 2 }),
      rentOrder({ id: 2, status: 'RESERVED', pickup: '2026-07-08T00:00:00Z', return: '2026-07-11T00:00:00Z', quantity: 3 }),
    ];
    const result = aggregateConflictingQuantities(13832, 30, orders);
    expect(result.conflictingQuantity).toBe(5);
    expect(result.reservedConflictQuantity).toBe(3);
    expect(result.conflictOrderIds).toEqual(new Set([1, 2]));
  });

  it('ignores COMPLETED SALE even if dates overlap', () => {
    const saleAsConflictInput = {
      id: 99,
      orderType: 'SALE',
      status: 'COMPLETED',
      outletId: 30,
      orderItems: [{ productId: 13832, quantity: 1 }],
    };
    const result = aggregateConflictingQuantities(13832, 30, [saleAsConflictInput]);
    expect(result.conflictingQuantity).toBe(0);
  });
});

describe('buildAvailabilityMetrics — fulfillment boundaries', () => {
  const outlet = { stock: 20, available: 19, renting: 1, outlet: { id: 30, name: 'O' } };

  it('canFulfill when requested equals effective exactly', () => {
    const result = buildAvailabilityMetrics({
      outletStock: outlet,
      conflictingQuantity: 1,
      reservedConflictQuantity: 0,
      requestedQuantity: 18,
    });
    expect(result.effectivelyAvailable).toBe(18);
    expect(result.canFulfillRequest).toBe(true);
    expect(result.isAvailable).toBe(true);
  });

  it('cannot fulfill when requested is effective + 1', () => {
    const result = buildAvailabilityMetrics({
      outletStock: outlet,
      conflictingQuantity: 1,
      reservedConflictQuantity: 0,
      requestedQuantity: 19,
    });
    expect(result.effectivelyAvailable).toBe(18);
    expect(result.canFulfillRequest).toBe(false);
    expect(result.isAvailable).toBe(false);
  });

  it('stockAvailable vs isAvailable: shelf ok but conflict blocks verdict', () => {
    const result = buildAvailabilityMetrics({
      outletStock: outlet,
      conflictingQuantity: 19,
      reservedConflictQuantity: 0,
      requestedQuantity: 1,
    });
    expect(result.stockAvailable).toBe(true); // shelf 19 >= 1
    expect(result.effectivelyAvailable).toBe(0);
    expect(result.isAvailable).toBe(false);
  });

  it('stockAvailable false when shelf below request even without conflicts', () => {
    const result = buildAvailabilityMetrics({
      outletStock: { stock: 20, available: 19, renting: 1, outlet: { id: 30, name: 'O' } },
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
      requestedQuantity: 20,
    });
    expect(result.stockAvailable).toBe(false);
    expect(result.effectivelyAvailable).toBe(19);
    expect(result.isAvailable).toBe(false);
  });
});

describe('Overlap boundary conditions (API query semantics)', () => {
  const orderPickup = new Date('2026-07-07T17:00:00.000Z');
  const orderReturn = new Date('2026-07-12T16:59:59.000Z');

  it.each([
    {
      checkDate: '2026-07-12',
      overlaps: true,
      reason: 'returnPlanAt (12/7 16:59) > rentalStart (12/7 00:00)',
    },
    {
      checkDate: '2026-07-13',
      overlaps: false,
      reason: 'returnPlanAt (12/7 16:59) NOT > rentalStart (13/7 00:00)',
    },
    {
      checkDate: '2026-07-07',
      overlaps: true,
      reason: 'pickup before check end, return after check start',
    },
  ])('$checkDate overlap=$overlaps ($reason)', ({ checkDate, overlaps }) => {
    const { start, end } = dayRangeUtc(checkDate);
    expect(periodsOverlap(orderPickup, orderReturn, start, end)).toBe(overlaps);
  });

  it('adjacent periods do not overlap: order ends when check starts', () => {
    const orderEnd = new Date('2026-07-13T00:00:00.000Z');
    const orderStart = new Date('2026-07-10T00:00:00.000Z');
    const { start: checkStart, end: checkEnd } = dayRangeUtc('2026-07-13');
    // orderReturn must be > checkStart for overlap; equal is NOT >
    expect(periodsOverlap(orderStart, orderEnd, checkStart, checkEnd)).toBe(false);
  });
});

describe('SALE + multiple rents — combined stress scenario', () => {
  it('sold 1, two PICKUPED overlaps on check day', () => {
    const orders = [
      rentOrder({ id: 1, status: 'PICKUPED', pickup: '2026-07-07T00:00:00Z', return: '2026-07-15T00:00:00Z', quantity: 1 }),
      rentOrder({ id: 2, status: 'PICKUPED', pickup: '2026-07-09T00:00:00Z', return: '2026-07-11T00:00:00Z', quantity: 2 }),
    ];

    const result = simulateAvailability({
      outletStock: { stock: 20, available: 17, renting: 3 },
      orders,
      checkDate: '2026-07-10',
      requestedQuantity: 2,
    });

    expect(result.conflictingQuantity).toBe(3);
    expect(result.metrics.totalAvailableStock).toBe(17);
    expect(result.metrics.effectivelyAvailable).toBe(14); // 17 - 3
    expect(result.metrics.isAvailable).toBe(true);
  });

  it('RESERVED blocks from stock when item still on shelf', () => {
    const orders = [
      rentOrder({ id: 10, status: 'RESERVED', pickup: '2026-07-10T00:00:00Z', return: '2026-07-12T00:00:00Z', quantity: 4 }),
    ];

    const result = simulateAvailability({
      outletStock: { stock: 20, available: 19, renting: 1 },
      orders,
      checkDate: '2026-07-10',
    });

    expect(result.reservedConflictQuantity).toBe(4);
    expect(result.metrics.effectivelyAvailable).toBe(16); // 20 - 4, not 19 - 4
  });
});

describe('Documented limitations / review flags', () => {
  /**
   * When renting units will return before the check period but shelf > 0,
   * verdict uses current shelf only (does not add returning units).
   * Example: stock=10, available=7, renting=3, no overlap → 7 not 10.
   * This is intentional unless shelf=0 (batch fix).
   */
  it('FLAG: partial rent-out without overlap does not add returning units to verdict', () => {
    const effective = calculateEffectivelyAvailable({
      totalStock: 10,
      totalAvailableStock: 7,
      totalRenting: 3,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });
    expect(effective).toBe(7);
    expect(effective).toBeLessThan(10);
  });

  /**
   * stock field may remain 20 after SALE while available=19.
   * Mobile "Kho" shows stock; "Có sẵn" and verdict must use available/effective.
   */
  it('FLAG: stale stock field after SALE must not affect verdict', () => {
    const metrics = buildAvailabilityMetrics({
      outletStock: { stock: 20, available: 19, renting: 0, outlet: { id: 30, name: 'O' } },
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
      requestedQuantity: 1,
    });
    expect(metrics.totalStock).toBe(20);
    expect(metrics.totalAvailableStock).toBe(19);
    expect(metrics.effectivelyAvailable).toBe(19);
  });
});
