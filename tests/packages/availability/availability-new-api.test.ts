/**
 * Unit tests for the NEW availability API response format
 * GET /api/products/[id]/availability
 * 
 * Tests:
 * 1. Orders array with isConflict flag
 * 2. includeAllOrders=true vs false behavior
 * 3. effectivelyAvailable calculation
 * 4. Consistency between conflicts and orders.isConflict
 */

import { describe, expect, it } from 'vitest';
import { calculateEffectivelyAvailable } from '../../../apps/api/lib/availability';

function calcEffectivelyAvailable(
  totalStock: number,
  totalRenting: number,
  conflictingQuantity: number,
  reservedConflictQuantity = 0
): number {
  const totalAvailableStock = Math.max(0, totalStock - totalRenting);
  return calculateEffectivelyAvailable({
    totalStock,
    totalAvailableStock,
    totalRenting,
    conflictingQuantity,
    reservedConflictQuantity,
  });
}

// Simulate the API logic for orders display
function buildOrdersResponse(
  allOrders: Array<{
    id: number;
    orderNumber: string;
    orderType: string;
    status: string;
    pickupPlanAt: string;
    returnPlanAt: string;
    customerName: string;
    quantity: number;
  }>,
  conflictOrderIds: Set<number>,
  includeAllOrders: boolean
): Array<{
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  customerName: string;
  pickupPlanAt: string;
  returnPlanAt: string;
  quantity: number;
  isConflict: boolean;
}> {
  let filtered = allOrders;

  if (!includeAllOrders) {
    // Only active RENT orders
    filtered = allOrders.filter(
      o => o.orderType === 'RENT' && (o.status === 'RESERVED' || o.status === 'PICKUPED')
    );
  }

  return filtered.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerName: order.customerName,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    quantity: order.quantity,
    isConflict: conflictOrderIds.has(order.id),
  }));
}

describe('New Availability API - Orders Response', () => {
  const sampleOrders = [
    { id: 1, orderNumber: '697648', orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-06-01T17:00:00Z', returnPlanAt: '2026-06-03T17:00:00Z', customerName: 'Heather Robinson', quantity: 1 },
    { id: 2, orderNumber: '695698', orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-06-01T17:00:00Z', returnPlanAt: '2026-06-03T17:00:00Z', customerName: 'Heather Robinson', quantity: 1 },
    { id: 3, orderNumber: '887535', orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-06-01T17:00:00Z', returnPlanAt: '2026-06-03T17:00:00Z', customerName: 'nnnn', quantity: 1 },
    { id: 4, orderNumber: '637457', orderType: 'RENT', status: 'RETURNED', pickupPlanAt: '2026-05-31T17:00:00Z', returnPlanAt: '2026-06-17T17:00:00Z', customerName: 'Heather Robinson', quantity: 2 },
    { id: 5, orderNumber: 'SALE001', orderType: 'SALE', status: 'RESERVED', pickupPlanAt: '2026-06-01T00:00:00Z', returnPlanAt: '2026-06-01T00:00:00Z', customerName: 'Sale Customer', quantity: 1 },
    { id: 6, orderNumber: 'OLD001', orderType: 'RENT', status: 'CANCELLED', pickupPlanAt: '2026-05-01T00:00:00Z', returnPlanAt: '2026-05-05T00:00:00Z', customerName: 'Cancelled', quantity: 1 },
  ];

  // Orders 1, 2, 3 are conflicts (overlap with check date June 1)
  const conflictIds = new Set([1, 2, 3]);

  describe('includeAllOrders=false (default)', () => {
    it('should only return active RENT orders (RESERVED + PICKUPED)', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, false);
      
      // Should only include orders 1, 2, 3 (RENT + RESERVED)
      // Should NOT include: 4 (RETURNED), 5 (SALE), 6 (CANCELLED)
      expect(result.length).toBe(3);
      expect(result.every(o => o.orderType === 'RENT')).toBe(true);
      expect(result.every(o => o.status === 'RESERVED' || o.status === 'PICKUPED')).toBe(true);
    });

    it('should mark all returned orders as isConflict correctly', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, false);
      
      expect(result.find(o => o.orderNumber === '697648')?.isConflict).toBe(true);
      expect(result.find(o => o.orderNumber === '695698')?.isConflict).toBe(true);
      expect(result.find(o => o.orderNumber === '887535')?.isConflict).toBe(true);
    });
  });

  describe('includeAllOrders=true', () => {
    it('should return ALL orders regardless of type and status', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      
      // Should include all 6 orders
      expect(result.length).toBe(6);
    });

    it('should include RETURNED orders', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      
      const returned = result.find(o => o.orderNumber === '637457');
      expect(returned).toBeDefined();
      expect(returned?.status).toBe('RETURNED');
      expect(returned?.isConflict).toBe(false); // RETURNED orders are never conflicts
    });

    it('should include SALE orders', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      
      const sale = result.find(o => o.orderNumber === 'SALE001');
      expect(sale).toBeDefined();
      expect(sale?.orderType).toBe('SALE');
      expect(sale?.isConflict).toBe(false); // SALE orders don't conflict with RENT availability
    });

    it('should include CANCELLED orders', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      
      const cancelled = result.find(o => o.orderNumber === 'OLD001');
      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe('CANCELLED');
      expect(cancelled?.isConflict).toBe(false);
    });

    it('should still correctly mark conflict orders', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      
      const conflicts = result.filter(o => o.isConflict);
      expect(conflicts.length).toBe(3);
      expect(conflicts.map(o => o.id).sort()).toEqual([1, 2, 3]);
    });
  });

  describe('effectivelyAvailable calculation', () => {
    it('PICKUPED overlap: subtract conflicts from shelf (totalAvailableStock)', () => {
      // Product: stock=13, renting=1, shelf=12, conflicts=3 (PICKUPED overlap)
      const result = calcEffectivelyAvailable(13, 1, 3, 0);
      expect(result).toBe(9); // 12 - 3
    });

    it('should not go below 0', () => {
      const result = calcEffectivelyAvailable(5, 3, 6, 0);
      expect(result).toBe(0); // shelf=2, 2-6
    });

    it('should return shelf count when no conflicts', () => {
      const result = calcEffectivelyAvailable(20, 0, 0);
      expect(result).toBe(20);
    });

    it('no overlap: shelf count when renting exists but order not in period', () => {
      const result = calcEffectivelyAvailable(10, 3, 0);
      expect(result).toBe(7); // stock - renting = shelf
    });

    it('should handle real scenario: stock=3, renting=1 (not in period), conflicts=2 RESERVED', () => {
      const result = calcEffectivelyAvailable(3, 1, 2, 2);
      expect(result).toBe(1); // RESERVED path: totalStock - conflicts = 3 - 2
    });

    it('should handle conflicts exceeding stock', () => {
      const result = calcEffectivelyAvailable(3, 0, 5, 5);
      expect(result).toBe(0);
    });
  });

  describe('isConflict consistency', () => {
    it('conflict orders count should match totalConflictsFound', () => {
      const result = buildOrdersResponse(sampleOrders, conflictIds, true);
      const conflictCount = result.filter(o => o.isConflict).length;
      
      // totalConflictsFound from API = conflictIds.size
      expect(conflictCount).toBe(conflictIds.size);
    });

    it('non-active orders should never be marked as conflict', () => {
      // Even if somehow an ID matches, RETURNED/CANCELLED should not be conflict
      const badConflictIds = new Set([1, 2, 3, 4]); // 4 is RETURNED
      const result = buildOrdersResponse(sampleOrders, badConflictIds, true);
      
      // In real API, conflict query only returns RESERVED/PICKUPED orders
      // So order 4 (RETURNED) would never be in conflictIds
      // But if it somehow is, the isConflict flag would be true
      // This test documents the behavior - the API prevents this by only querying active orders
      const returned = result.find(o => o.id === 4);
      expect(returned?.isConflict).toBe(true); // Flag is set based on ID match
      // Note: In production, this won't happen because conflict query filters by status
    });
  });

  describe('Edge cases', () => {
    it('should handle empty orders list', () => {
      const result = buildOrdersResponse([], new Set(), true);
      expect(result).toEqual([]);
    });

    it('should handle no conflicts', () => {
      const result = buildOrdersResponse(sampleOrders, new Set(), true);
      expect(result.every(o => o.isConflict === false)).toBe(true);
    });

    it('should handle all orders being conflicts', () => {
      const allIds = new Set(sampleOrders.map(o => o.id));
      const result = buildOrdersResponse(sampleOrders, allIds, false);
      // Only active RENT orders returned, all marked as conflict
      expect(result.length).toBe(3);
      expect(result.every(o => o.isConflict === true)).toBe(true);
    });
  });
});

// =============================================================================
// excludeOrderId - Edit Order Availability Tests
// =============================================================================

/**
 * Simulate the conflict detection logic WITH excludeOrderId support
 * This mirrors the API behavior: when editing an order, exclude it from conflict check
 */
function findConflictingOrders(
  allOrders: Array<{
    id: number;
    orderNumber: string;
    orderType: string;
    status: string;
    pickupPlanAt: Date;
    returnPlanAt: Date;
    quantity: number;
  }>,
  rentalStart: Date,
  rentalEnd: Date,
  excludeOrderId?: number
): Array<{ id: number; orderNumber: string; quantity: number }> {
  return allOrders.filter(order => {
    // Exclude the order being edited
    if (excludeOrderId && order.id === excludeOrderId) {
      return false;
    }
    // Only active RENT orders
    if (order.orderType !== 'RENT') return false;
    if (order.status !== 'RESERVED' && order.status !== 'PICKUPED') return false;
    // Overlap: orderPickup < rentalEnd AND orderReturn > rentalStart
    return order.pickupPlanAt < rentalEnd && order.returnPlanAt > rentalStart;
  });
}

function calculateAvailabilityWithExclude(
  totalStock: number,
  allOrders: Array<{
    id: number;
    orderNumber: string;
    orderType: string;
    status: string;
    pickupPlanAt: Date;
    returnPlanAt: Date;
    quantity: number;
  }>,
  rentalStart: Date,
  rentalEnd: Date,
  requestedQuantity: number,
  excludeOrderId?: number
): {
  conflictingQuantity: number;
  effectivelyAvailable: number;
  canFulfillRequest: boolean;
  conflictingOrders: Array<{ id: number; orderNumber: string; quantity: number }>;
} {
  const conflicts = findConflictingOrders(allOrders, rentalStart, rentalEnd, excludeOrderId);
  const conflictingQuantity = conflicts.reduce((sum, o) => sum + o.quantity, 0);
  const effectivelyAvailable = Math.max(0, totalStock - conflictingQuantity);
  const canFulfillRequest = effectivelyAvailable >= requestedQuantity;

  return {
    conflictingQuantity,
    effectivelyAvailable,
    canFulfillRequest,
    conflictingOrders: conflicts,
  };
}

describe('Edit Order Availability - excludeOrderId', () => {
  // Scenario: Product "AD sui hồng Uyến Hoa - XL"
  // Stock: 1
  // Order 725881: 31/07-03/08, qty 1, RESERVED (this is the order being edited)
  // Order 309990: 07/08-10/08, qty 1, RESERVED
  const orders = [
    {
      id: 725881,
      orderNumber: '725881',
      orderType: 'RENT',
      status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-31T00:00:00Z'),
      returnPlanAt: new Date('2026-08-03T00:00:00Z'),
      quantity: 1,
    },
    {
      id: 309990,
      orderNumber: '309990',
      orderType: 'RENT',
      status: 'RESERVED',
      pickupPlanAt: new Date('2026-08-07T00:00:00Z'),
      returnPlanAt: new Date('2026-08-10T00:00:00Z'),
      quantity: 1,
    },
  ];

  const totalStock = 1;

  describe('Creating new order (no excludeOrderId)', () => {
    it('should report conflict when period overlaps with existing order', () => {
      // New order: 31/07-03/08 → overlaps with order 725881
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-07-31T00:00:00Z'),
        new Date('2026-08-03T00:00:00Z'),
        1,
        undefined // no exclude
      );

      expect(result.conflictingQuantity).toBe(1);
      expect(result.effectivelyAvailable).toBe(0); // 1 - 1 = 0
      expect(result.canFulfillRequest).toBe(false);
      expect(result.conflictingOrders).toHaveLength(1);
      expect(result.conflictingOrders[0].orderNumber).toBe('725881');
    });

    it('should report unavailable when stock=1 and 1 order exists in period', () => {
      // New order: 01/08-05/08 → overlaps with order 725881 (31/07-03/08)
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-08-05T00:00:00Z'),
        1,
        undefined
      );

      expect(result.conflictingQuantity).toBe(1);
      expect(result.canFulfillRequest).toBe(false);
    });
  });

  describe('Editing existing order (with excludeOrderId)', () => {
    it('should NOT self-conflict when editing order with same dates and quantity', () => {
      // Editing order 725881: same dates 31/07-03/08, qty 1
      // Should exclude order 725881 from conflict check → no conflicts
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-07-31T00:00:00Z'),
        new Date('2026-08-03T00:00:00Z'),
        1,
        725881 // exclude this order
      );

      expect(result.conflictingQuantity).toBe(0);
      expect(result.effectivelyAvailable).toBe(1); // 1 - 0 = 1
      expect(result.canFulfillRequest).toBe(true);
      expect(result.conflictingOrders).toHaveLength(0);
    });

    it('should report unavailable when increasing quantity beyond stock during edit', () => {
      // Editing order 725881: same dates but qty 2 (stock is only 1)
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-07-31T00:00:00Z'),
        new Date('2026-08-03T00:00:00Z'),
        2, // requesting 2 but stock is 1
        725881
      );

      expect(result.conflictingQuantity).toBe(0);
      expect(result.effectivelyAvailable).toBe(1); // 1 - 0 = 1
      expect(result.canFulfillRequest).toBe(false); // 1 < 2
    });

    it('should detect conflict with OTHER orders when editing and changing dates', () => {
      // Editing order 725881: changing dates to 07/08-10/08 (overlaps with order 309990)
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-08-07T00:00:00Z'),
        new Date('2026-08-10T00:00:00Z'),
        1,
        725881 // exclude self
      );

      expect(result.conflictingQuantity).toBe(1); // order 309990 conflicts
      expect(result.effectivelyAvailable).toBe(0); // 1 - 1 = 0
      expect(result.canFulfillRequest).toBe(false);
      expect(result.conflictingOrders[0].orderNumber).toBe('309990');
    });

    it('should allow edit when changing to non-conflicting dates', () => {
      // Editing order 725881: changing dates to 04/08-06/08 (no overlap with any other order)
      const result = calculateAvailabilityWithExclude(
        totalStock,
        orders,
        new Date('2026-08-04T00:00:00Z'),
        new Date('2026-08-06T00:00:00Z'),
        1,
        725881
      );

      expect(result.conflictingQuantity).toBe(0);
      expect(result.effectivelyAvailable).toBe(1);
      expect(result.canFulfillRequest).toBe(true);
    });
  });

  describe('Edit order with multiple products and higher stock', () => {
    const multiOrders = [
      {
        id: 100,
        orderNumber: '100',
        orderType: 'RENT',
        status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-01T00:00:00Z'),
        returnPlanAt: new Date('2026-07-05T00:00:00Z'),
        quantity: 2,
      },
      {
        id: 200,
        orderNumber: '200',
        orderType: 'RENT',
        status: 'PICKUPED',
        pickupPlanAt: new Date('2026-07-03T00:00:00Z'),
        returnPlanAt: new Date('2026-07-08T00:00:00Z'),
        quantity: 1,
      },
      {
        id: 300,
        orderNumber: '300',
        orderType: 'RENT',
        status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
        returnPlanAt: new Date('2026-07-15T00:00:00Z'),
        quantity: 3,
      },
    ];

    const stock = 5;

    it('should allow editing order 100 with same qty (excludes self)', () => {
      // Period 01/07-05/07 overlaps with order 200 (03/07-08/07)
      // Without exclude: conflicts = order 100 (qty 2) + order 200 (qty 1) = 3
      // With exclude 100: conflicts = order 200 (qty 1) only
      const result = calculateAvailabilityWithExclude(
        stock,
        multiOrders,
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-05T00:00:00Z'),
        2,
        100
      );

      expect(result.conflictingQuantity).toBe(1); // only order 200
      expect(result.effectivelyAvailable).toBe(4); // 5 - 1 = 4
      expect(result.canFulfillRequest).toBe(true); // 4 >= 2
    });

    it('should detect insufficient stock when increasing qty during edit', () => {
      // Editing order 100: increase qty from 2 to 5
      // Period 01/07-05/07, exclude self (100), conflicts = order 200 (qty 1)
      // effectivelyAvailable = 5 - 1 = 4, requesting 5 → not enough
      const result = calculateAvailabilityWithExclude(
        stock,
        multiOrders,
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-05T00:00:00Z'),
        5,
        100
      );

      expect(result.conflictingQuantity).toBe(1);
      expect(result.effectivelyAvailable).toBe(4); // 5 - 1 = 4
      expect(result.canFulfillRequest).toBe(false); // 4 < 5
    });

    it('without excludeOrderId should include self in conflicts', () => {
      // Same scenario but WITHOUT excludeOrderId (like creating new order)
      const result = calculateAvailabilityWithExclude(
        stock,
        multiOrders,
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-05T00:00:00Z'),
        2,
        undefined // no exclude
      );

      expect(result.conflictingQuantity).toBe(3); // order 100 (qty 2) + order 200 (qty 1)
      expect(result.effectivelyAvailable).toBe(2); // 5 - 3 = 2
      expect(result.canFulfillRequest).toBe(true); // 2 >= 2
    });

    it('should handle RETURNED/CANCELLED orders correctly (never conflict)', () => {
      const ordersWithReturned = [
        ...multiOrders,
        {
          id: 400,
          orderNumber: '400',
          orderType: 'RENT',
          status: 'RETURNED', // should not conflict
          pickupPlanAt: new Date('2026-07-01T00:00:00Z'),
          returnPlanAt: new Date('2026-07-05T00:00:00Z'),
          quantity: 2,
        },
      ];

      const result = calculateAvailabilityWithExclude(
        stock,
        ordersWithReturned,
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-05T00:00:00Z'),
        2,
        100
      );

      // RETURNED order 400 should not count
      expect(result.conflictingQuantity).toBe(1); // only order 200
      expect(result.canFulfillRequest).toBe(true);
    });
  });
});
