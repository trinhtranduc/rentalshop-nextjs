import { describe, expect, it } from 'vitest';

/**
 * Test cases simulating mobile app reading batch-availability API response
 * 
 * Mobile code reads:
 *   let available = bestOutlet.effectivelyAvailable ?? result.totalAvailableStock ?? 0
 *   let isAvailable = result.isAvailable && (available >= result.requestedQuantity)
 * 
 * API returns:
 *   totalAvailableStock: effectivelyAvailable (server-side fix for current mobile)
 *   availabilityByOutlet[0].effectivelyAvailable: correct value
 *   isAvailable: canFulfillRequest
 */

interface BatchAvailabilityResult {
  productId: number;
  productName: string;
  totalStock: number;
  totalAvailableStock: number; // Server now returns effectivelyAvailable here
  totalRenting: number;
  requestedQuantity: number;
  isAvailable: boolean;
  stockAvailable: boolean;
  hasNoConflicts: boolean;
  availabilityByOutlet: Array<{
    outletId: number;
    stock: number;
    renting: number;
    conflictingQuantity: number;
    effectivelyAvailable: number;
    canFulfillRequest: boolean;
  }>;
}

/**
 * Simulate API response generation (server-side)
 */
function buildBatchResponse(
  totalStock: number,
  totalRenting: number,
  conflictingQuantity: number,
  requestedQuantity: number
): BatchAvailabilityResult {
  const effectivelyAvailable = Math.max(0, totalStock - conflictingQuantity);
  const canFulfillRequest = effectivelyAvailable >= requestedQuantity;

  return {
    productId: 1,
    productName: 'Test Product',
    totalStock,
    // CRITICAL: Server returns effectivelyAvailable as totalAvailableStock
    // so old mobile clients that read this field get the correct value
    totalAvailableStock: effectivelyAvailable,
    totalRenting,
    requestedQuantity,
    isAvailable: canFulfillRequest,
    stockAvailable: Math.max(0, totalStock - totalRenting) >= requestedQuantity,
    hasNoConflicts: conflictingQuantity === 0,
    availabilityByOutlet: [{
      outletId: 1,
      stock: totalStock,
      renting: totalRenting,
      conflictingQuantity,
      effectivelyAvailable,
      canFulfillRequest,
    }],
  };
}

/**
 * Simulate OLD mobile reading logic (before fix)
 * reads: result.totalAvailableStock
 */
function mobileOldLogic(result: BatchAvailabilityResult): { isAvailable: boolean; available: number } {
  const available = result.totalAvailableStock ?? 0;
  const isAvailable = result.isAvailable && (available >= result.requestedQuantity);
  return { isAvailable, available };
}

/**
 * Simulate NEW mobile reading logic (after fix)
 * reads: availabilityByOutlet[0].effectivelyAvailable ?? totalAvailableStock
 */
function mobileNewLogic(result: BatchAvailabilityResult): { isAvailable: boolean; available: number } {
  let available: number;
  if (result.availabilityByOutlet && result.availabilityByOutlet.length > 0) {
    available = result.availabilityByOutlet[0].effectivelyAvailable ?? result.totalAvailableStock ?? 0;
  } else {
    available = result.totalAvailableStock ?? 0;
  }
  const isAvailable = result.isAvailable && (available >= result.requestedQuantity);
  return { isAvailable, available };
}

// ============================================================================
describe('Mobile reads batch-availability response correctly', () => {

  describe('Yếm đỏ Hoàng Mai: stock=1, renting=1, no date conflict', () => {
    // Order 03/07-05/07 PICKUPED, request 15/07-24/07 → no overlap
    const result = buildBatchResponse(1, 1, 0, 1);

    it('API returns correct values', () => {
      expect(result.totalStock).toBe(1);
      expect(result.totalRenting).toBe(1);
      expect(result.totalAvailableStock).toBe(1); // effectivelyAvailable = 1-0 = 1
      expect(result.isAvailable).toBe(true);
      expect(result.availabilityByOutlet[0].effectivelyAvailable).toBe(1);
      expect(result.availabilityByOutlet[0].conflictingQuantity).toBe(0);
    });

    it('OLD mobile logic: reads totalAvailableStock → correct (server fix)', () => {
      const { isAvailable, available } = mobileOldLogic(result);
      expect(available).toBe(1); // Server now returns effectivelyAvailable
      expect(isAvailable).toBe(true);
    });

    it('NEW mobile logic: reads effectivelyAvailable → correct', () => {
      const { isAvailable, available } = mobileNewLogic(result);
      expect(available).toBe(1);
      expect(isAvailable).toBe(true);
    });
  });

  describe('AD quả kem: stock=3, renting=1, conflicts=2 (partial overlap)', () => {
    // Order 01/07-05/07 PICKUPED (renting=1, not in period)
    // Order 17/07-20/07 RESERVED qty=2 (overlaps 08/07-20/07)
    const result = buildBatchResponse(3, 1, 2, 1);

    it('API returns correct values', () => {
      expect(result.totalAvailableStock).toBe(1); // effectivelyAvailable = 3-2 = 1
      expect(result.isAvailable).toBe(true); // 1 >= 1
      expect(result.availabilityByOutlet[0].effectivelyAvailable).toBe(1);
    });

    it('OLD mobile: correct with server fix', () => {
      const { isAvailable, available } = mobileOldLogic(result);
      expect(available).toBe(1);
      expect(isAvailable).toBe(true);
    });

    it('NEW mobile: correct', () => {
      const { isAvailable, available } = mobileNewLogic(result);
      expect(available).toBe(1);
      expect(isAvailable).toBe(true);
    });
  });

  describe('Fully booked: stock=2, conflicts=2', () => {
    const result = buildBatchResponse(2, 0, 2, 1);

    it('API reports unavailable', () => {
      expect(result.totalAvailableStock).toBe(0); // 2-2 = 0
      expect(result.isAvailable).toBe(false);
    });

    it('OLD mobile: correctly shows unavailable', () => {
      const { isAvailable, available } = mobileOldLogic(result);
      expect(available).toBe(0);
      expect(isAvailable).toBe(false);
    });

    it('NEW mobile: correctly shows unavailable', () => {
      const { isAvailable, available } = mobileNewLogic(result);
      expect(available).toBe(0);
      expect(isAvailable).toBe(false);
    });
  });

  describe('No conflicts, no renting: fully available', () => {
    const result = buildBatchResponse(5, 0, 0, 3);

    it('API reports available', () => {
      expect(result.totalAvailableStock).toBe(5);
      expect(result.isAvailable).toBe(true);
    });

    it('both mobile versions show available', () => {
      expect(mobileOldLogic(result).isAvailable).toBe(true);
      expect(mobileOldLogic(result).available).toBe(5);
      expect(mobileNewLogic(result).isAvailable).toBe(true);
      expect(mobileNewLogic(result).available).toBe(5);
    });
  });

  describe('Request qty exceeds available', () => {
    // stock=3, conflicts=1, request=3
    // effectivelyAvailable = 3-1 = 2, but requesting 3
    const result = buildBatchResponse(3, 0, 1, 3);

    it('API reports unavailable (2 < 3)', () => {
      expect(result.totalAvailableStock).toBe(2); // effectivelyAvailable
      expect(result.isAvailable).toBe(false);
    });

    it('OLD mobile: shows unavailable', () => {
      const { isAvailable, available } = mobileOldLogic(result);
      expect(available).toBe(2);
      expect(isAvailable).toBe(false);
    });

    it('NEW mobile: shows unavailable', () => {
      const { isAvailable, available } = mobileNewLogic(result);
      expect(available).toBe(2);
      expect(isAvailable).toBe(false);
    });
  });

  describe('High renting but no conflict (orders outside requested period)', () => {
    // stock=5, renting=4 (all PICKUPED orders NOT overlapping), conflicts=0
    const result = buildBatchResponse(5, 4, 0, 3);

    it('API correctly shows all stock available for the period', () => {
      expect(result.totalAvailableStock).toBe(5); // effectivelyAvailable = 5-0 = 5
      expect(result.isAvailable).toBe(true);
    });

    it('OLD mobile: correct with server fix', () => {
      const { isAvailable, available } = mobileOldLogic(result);
      expect(available).toBe(5); // Not 5-4=1 anymore!
      expect(isAvailable).toBe(true);
    });

    it('NEW mobile: correct', () => {
      const { isAvailable, available } = mobileNewLogic(result);
      expect(available).toBe(5);
      expect(isAvailable).toBe(true);
    });
  });

  describe('Edit order: excludeOrderId removes self from conflicts', () => {
    // stock=1, the only order IS the one being edited → conflicts=0 after exclude
    const result = buildBatchResponse(1, 1, 0, 1);

    it('with excludeOrderId, no self-conflict', () => {
      expect(result.totalAvailableStock).toBe(1);
      expect(result.isAvailable).toBe(true);
    });

    it('mobile shows available when editing', () => {
      expect(mobileOldLogic(result).isAvailable).toBe(true);
      expect(mobileNewLogic(result).isAvailable).toBe(true);
    });
  });

  describe('Edit order: increase qty beyond stock', () => {
    // stock=2, editing order (excluded), another order conflicts qty=1
    // effectivelyAvailable = 2-1 = 1, requesting 2
    const result = buildBatchResponse(2, 1, 1, 2);

    it('insufficient stock for increased qty', () => {
      expect(result.totalAvailableStock).toBe(1); // effectivelyAvailable = 2-1 = 1
      expect(result.isAvailable).toBe(false); // 1 < 2
    });

    it('mobile correctly shows unavailable', () => {
      expect(mobileOldLogic(result).isAvailable).toBe(false);
      expect(mobileNewLogic(result).isAvailable).toBe(false);
    });
  });
});
