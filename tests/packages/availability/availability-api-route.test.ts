/**
 * GET /api/products/[id]/availability — API payload tests
 *
 * Tests the exact response `data` shape produced by the route via
 * buildAvailabilityCheckedData + aggregateConflictingQuantities.
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateConflictingQuantities,
  buildAvailabilityCheckedData,
  buildAvailabilityMetrics,
  mapAvailabilityOrderDisplay,
} from '../../../apps/api/lib/availability';

const PRODUCT_ID = 13832;
const OUTLET_ID = 30;

const outletStockFixture = {
  stock: 20,
  available: 19,
  renting: 1,
  outlet: { id: OUTLET_ID, name: 'Outlet 30' },
};

const pickupedRentOrder = {
  id: 9001,
  orderNumber: 'ORD-RENT-1',
  orderType: 'RENT',
  status: 'PICKUPED',
  outletId: OUTLET_ID,
  pickupPlanAt: new Date('2026-07-07T00:00:00.000Z'),
  returnPlanAt: new Date('2026-07-12T23:59:59.999Z'),
  orderItems: [{ productId: PRODUCT_ID, quantity: 1 }],
  customer: { firstName: 'Chị', lastName: 'Thuỷ', phone: '0876878999' },
};

const completedSaleOrder = {
  id: 9002,
  orderNumber: 'ORD-SALE-1',
  orderType: 'SALE',
  status: 'COMPLETED',
  outletId: OUTLET_ID,
  pickupPlanAt: new Date('2026-07-01T00:00:00.000Z'),
  returnPlanAt: new Date('2026-07-01T00:00:00.000Z'),
  createdAt: new Date('2026-07-01T08:00:00.000Z'),
  orderItems: [{ productId: PRODUCT_ID, quantity: 1 }],
  customer: { firstName: 'Khách', lastName: 'Mua', phone: '0900000000' },
};

function buildApiDataForScenario(conflictingOrders: typeof pickupedRentOrder[]) {
  const { conflictingQuantity, reservedConflictQuantity, conflictOrderIds } =
    aggregateConflictingQuantities(PRODUCT_ID, OUTLET_ID, conflictingOrders);

  const data = buildAvailabilityCheckedData({
    productId: PRODUCT_ID,
    productName: 'Áo test availability',
    outletStock: outletStockFixture,
    conflictingQuantity,
    reservedConflictQuantity,
    requestedQuantity: 1,
    conflicts: conflictingOrders.map((order) => ({
      orderNumber: order.orderNumber,
      quantity: 1,
    })),
  });

  const orders = [pickupedRentOrder, completedSaleOrder].map((order) =>
    mapAvailabilityOrderDisplay(
      {
        ...order,
        createdAt: 'createdAt' in order ? order.createdAt : null,
      },
      PRODUCT_ID,
      conflictOrderIds.has(order.id)
    )
  );

  return { data, orders, conflictingQuantity, reservedConflictQuantity };
}

describe('GET /api/products/[id]/availability — buildAvailabilityMetrics', () => {
  it('no conflict: totalAvailableStock from outlet.available (SALE-aware)', () => {
    const result = buildAvailabilityMetrics({
      outletStock: { stock: 20, available: 19, renting: 0, outlet: { id: 30, name: 'O' } },
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
      requestedQuantity: 1,
    });

    expect(result.totalStock).toBe(20);
    expect(result.totalAvailableStock).toBe(19);
    expect(result.effectivelyAvailable).toBe(20);
    expect(result.isAvailable).toBe(true);
  });

  it('user scenario: stock=20, available=19, 1 PICKUPED overlap → effectivelyAvailable=18', () => {
    const { conflictingQuantity, reservedConflictQuantity } = aggregateConflictingQuantities(
      PRODUCT_ID,
      OUTLET_ID,
      [pickupedRentOrder]
    );

    expect(conflictingQuantity).toBe(1);
    expect(reservedConflictQuantity).toBe(0);

    const result = buildAvailabilityMetrics({
      outletStock: outletStockFixture,
      conflictingQuantity,
      reservedConflictQuantity,
      requestedQuantity: 1,
    });

    expect(result.totalAvailableStock).toBe(19);
    expect(result.effectivelyAvailable).toBe(18);
    expect(result.isAvailable).toBe(true);
    expect(result.availabilityByOutlet.available).toBe(19);
    expect(result.availabilityByOutlet.effectivelyAvailable).toBe(18);
  });

  it('RESERVED overlap subtracts from totalStock', () => {
    const reservedOrder = { ...pickupedRentOrder, id: 9003, status: 'RESERVED' };
    const { conflictingQuantity, reservedConflictQuantity } = aggregateConflictingQuantities(
      PRODUCT_ID,
      OUTLET_ID,
      [reservedOrder]
    );

    const result = buildAvailabilityMetrics({
      outletStock: { stock: 5, available: 4, renting: 1, outlet: { id: 30, name: 'O' } },
      conflictingQuantity,
      reservedConflictQuantity,
      requestedQuantity: 1,
    });

    expect(result.effectivelyAvailable).toBe(4);
  });

  it('no period overlap: effectivelyAvailable uses totalStock (batch fix)', () => {
    const result = buildAvailabilityMetrics({
      outletStock: { stock: 1, available: 0, renting: 1, outlet: { id: 30, name: 'O' } },
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
      requestedQuantity: 1,
    });

    expect(result.totalAvailableStock).toBe(0);
    expect(result.effectivelyAvailable).toBe(1);
    expect(result.isAvailable).toBe(true);
  });
});

describe('aggregateConflictingQuantities', () => {
  it('ignores SALE, RETURNED, CANCELLED and wrong outlet', () => {
    const result = aggregateConflictingQuantities(PRODUCT_ID, OUTLET_ID, [
      completedSaleOrder,
      { ...pickupedRentOrder, outletId: 99 },
      { ...pickupedRentOrder, id: 9004, status: 'RETURNED' },
      { ...pickupedRentOrder, id: 9005, status: 'CANCELLED' },
      pickupedRentOrder,
    ]);

    expect(result.conflictingQuantity).toBe(1);
    expect(result.reservedConflictQuantity).toBe(0);
    expect(result.conflictOrderIds).toEqual(new Set([9001]));
  });

  it('counts RESERVED separately for formula branch', () => {
    const result = aggregateConflictingQuantities(PRODUCT_ID, OUTLET_ID, [
      { ...pickupedRentOrder, id: 1, status: 'RESERVED', orderItems: [{ productId: PRODUCT_ID, quantity: 2 }] },
      { ...pickupedRentOrder, id: 2, status: 'PICKUPED', orderItems: [{ productId: PRODUCT_ID, quantity: 1 }] },
    ]);

    expect(result.conflictingQuantity).toBe(3);
    expect(result.reservedConflictQuantity).toBe(2);
  });
});

describe('GET /api/products/[id]/availability — API response data', () => {
  it('without dates: totalAvailableStock=19 (Có sẵn), not 20', () => {
    const { data } = buildApiDataForScenario([]);

    expect(data.totalStock).toBe(20);
    expect(data.totalAvailableStock).toBe(19);
    expect(data.availabilityByOutlet[0].available).toBe(19);
    expect(data.availabilityByOutlet[0].stock).toBe(20);
    expect(data.isAvailable).toBe(true);
    expect(data.hasNoConflicts).toBe(true);
  });

  it('with date 2026-07-10: effectivelyAvailable=18 (user scenario)', () => {
    const { data } = buildApiDataForScenario([pickupedRentOrder]);

    expect(data.totalStock).toBe(20);
    expect(data.totalAvailableStock).toBe(19);
    expect(data.availabilityByOutlet[0].effectivelyAvailable).toBe(18);
    expect(data.bestOutlet.effectivelyAvailable).toBe(18);
    expect(data.isAvailable).toBe(true);
    expect(data.hasNoConflicts).toBe(false);
    expect(data.stockAvailable).toBe(true);
  });

  it('marks overlapping RENT order isConflict=true; SALE is false', () => {
    const { orders } = buildApiDataForScenario([pickupedRentOrder]);

    const rentOrder = orders.find((order) => order.orderNumber === 'ORD-RENT-1');
    const saleOrder = orders.find((order) => order.orderNumber === 'ORD-SALE-1');

    expect(rentOrder?.isConflict).toBe(true);
    expect(rentOrder?.orderType).toBe('RENT');
    expect(saleOrder?.isConflict).toBe(false);
    expect(saleOrder?.orderType).toBe('SALE');
    expect(saleOrder?.createdAt).toBe('2026-07-01T08:00:00.000Z');
  });

  it('insufficient stock: isAvailable=false when requestedQuantity exceeds effective', () => {
    const { conflictingQuantity, reservedConflictQuantity } = aggregateConflictingQuantities(
      PRODUCT_ID,
      OUTLET_ID,
      [pickupedRentOrder, { ...pickupedRentOrder, id: 9010, orderItems: [{ productId: PRODUCT_ID, quantity: 18 }] }]
    );

    const data = buildAvailabilityCheckedData({
      productId: PRODUCT_ID,
      productName: 'Test',
      outletStock: outletStockFixture,
      conflictingQuantity,
      reservedConflictQuantity,
      requestedQuantity: 5,
    });

    expect(data.isAvailable).toBe(false);
    expect(data.availabilityByOutlet[0].effectivelyAvailable).toBeLessThan(5);
  });

  it('mobile field contract: Kho / Có sẵn / verdict use different fields', () => {
    const { data } = buildApiDataForScenario([pickupedRentOrder]);
    const outlet = data.availabilityByOutlet[0];

    expect(outlet.stock).toBe(20);
    expect(outlet.available).toBe(19);
    expect(outlet.renting).toBe(1);
    expect(outlet.effectivelyAvailable).toBe(18);
    expect(outlet.available).not.toBe(outlet.effectivelyAvailable);
    expect(data.totalAvailableStock).toBe(outlet.available);
  });
});
