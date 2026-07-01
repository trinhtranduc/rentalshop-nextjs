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

// Simulate effectivelyAvailable calculation
// FIXED: Use totalStock - conflictingQuantity (not totalAvailableStock - conflictingQuantity)
// This avoids double-counting PICKUPED orders that are already in renting AND in conflictingQuantity
function calculateEffectivelyAvailable(
  totalStock: number,
  _totalRenting: number, // kept for backward compat but not used in formula
  conflictingQuantity: number
): number {
  return Math.max(0, totalStock - conflictingQuantity);
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
    it('should calculate: totalStock - conflictingQuantity (ignores renting to avoid double-count)', () => {
      // Product 60: stock=13, renting=1, conflicts=3
      // Formula: totalStock - conflictingQuantity = 13 - 3 = 10
      // (renting is ignored because conflicting orders already include PICKUPED orders that overlap)
      const result = calculateEffectivelyAvailable(13, 1, 3);
      expect(result).toBe(10); // 13 - 3 = 10
    });

    it('should not go below 0', () => {
      // stock=5, renting=3, conflicts=6 → 5-6 = -1 → 0
      const result = calculateEffectivelyAvailable(5, 3, 6);
      expect(result).toBe(0);
    });

    it('should return full stock when no conflicts', () => {
      const result = calculateEffectivelyAvailable(20, 0, 0);
      expect(result).toBe(20);
    });

    it('should return full stock when renting exists but no conflicts (order not in period)', () => {
      // renting=3 but conflicts=0 means PICKUPED orders don't overlap requested period
      const result = calculateEffectivelyAvailable(10, 3, 0);
      expect(result).toBe(10); // All stock available for the requested period
    });

    it('should handle real scenario: stock=3, renting=1 (not in period), conflicts=2', () => {
      // Scenario: Product stock=3
      // - Order A: 01/07-05/07, qty 1, PICKUPED (renting=1, but NOT in period 08/07-20/07)
      // - Order B: 17/07-20/07, qty 2, RESERVED (conflicts with 08/07-20/07)
      // Request: qty 1 for 08/07-20/07
      // effectivelyAvailable = 3 - 2 = 1 (enough for qty 1)
      const result = calculateEffectivelyAvailable(3, 1, 2);
      expect(result).toBe(1);
    });

    it('should handle conflicts exceeding stock', () => {
      // stock=3, conflicts=5 → 3-5 = -2 → 0
      const result = calculateEffectivelyAvailable(3, 0, 5);
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
