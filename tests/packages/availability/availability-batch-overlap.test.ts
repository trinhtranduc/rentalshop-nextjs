import { describe, expect, it } from 'vitest';

/**
 * Test case: Áo dài - stock 1, rented 04/05-07/05
 * Creating new order 10/05-15/10 should NOT conflict
 * 
 * This tests the batch-availability overlap condition logic
 */

// Simulate the batch-availability overlap condition (same as in route.ts)
function checkOverlapBatchStyle(
  orderPickup: Date,
  orderReturn: Date,
  rentalStart: Date,
  rentalEnd: Date
): boolean {
  // Condition 1: Pickup during requested period
  const pickupDuring = orderPickup <= rentalEnd && orderPickup >= rentalStart;
  // Condition 2: Return during requested period
  const returnDuring = orderReturn <= rentalEnd && orderReturn >= rentalStart;
  // Condition 3: Order spans across requested period
  const spansPeriod = orderPickup <= rentalStart && orderReturn >= rentalEnd;

  return pickupDuring || returnDuring || spansPeriod;
}

// Simulate the single-product availability overlap (correct logic from [id]/availability)
function checkOverlapSimplified(
  orderPickup: Date,
  orderReturn: Date,
  rentalStart: Date,
  rentalEnd: Date
): boolean {
  // Standard interval overlap: orderPickup < rentalEnd AND orderReturn > rentalStart
  return orderPickup < rentalEnd && orderReturn > rentalStart;
}

describe('Batch Availability Overlap - Áo dài case', () => {
  describe('Order 04/05-07/05, Request 10/05-15/10', () => {
    // Existing order: rented 04/05-07/05 (PICKUPED)
    const orderPickup = new Date('2026-05-04T00:00:00.000Z');
    const orderReturn = new Date('2026-05-07T00:00:00.000Z');
    
    // New order request: 10/05-15/10
    const rentalStart = new Date('2026-05-10T00:00:00.000Z');
    const rentalEnd = new Date('2026-10-15T00:00:00.000Z');

    it('batch-style overlap should NOT detect conflict', () => {
      const hasOverlap = checkOverlapBatchStyle(orderPickup, orderReturn, rentalStart, rentalEnd);
      expect(hasOverlap).toBe(false);
    });

    it('simplified overlap should NOT detect conflict', () => {
      const hasOverlap = checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd);
      expect(hasOverlap).toBe(false);
    });

    it('availability should be 1 (stock=1, no conflicts)', () => {
      const totalStock = 1;
      const hasOverlap = checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd);
      const conflictingQuantity = hasOverlap ? 1 : 0;
      const effectivelyAvailable = Math.max(0, totalStock - conflictingQuantity);
      
      expect(effectivelyAvailable).toBe(1);
      expect(effectivelyAvailable >= 1).toBe(true); // can fulfill qty 1
    });
  });

  describe('Order 04/05-07/05 with time components (Vietnam timezone)', () => {
    // Scenario: Dates stored with Vietnam timezone offset (UTC+7)
    // Mobile sends: pickupDate=2026-05-04, returnDate=2026-05-07
    // Server stores as UTC: 2026-05-03T17:00:00Z to 2026-05-06T17:00:00Z
    const orderPickupUTC = new Date('2026-05-03T17:00:00.000Z'); // 04/05 00:00 VN = 03/05 17:00 UTC
    const orderReturnUTC = new Date('2026-05-06T17:00:00.000Z'); // 07/05 00:00 VN = 06/05 17:00 UTC

    // New order: 10/05-15/10 (Vietnam time)
    const rentalStartUTC = new Date('2026-05-09T17:00:00.000Z'); // 10/05 00:00 VN
    const rentalEndUTC = new Date('2026-10-14T17:00:00.000Z');   // 15/10 00:00 VN

    it('batch-style should NOT detect conflict with UTC dates', () => {
      const hasOverlap = checkOverlapBatchStyle(orderPickupUTC, orderReturnUTC, rentalStartUTC, rentalEndUTC);
      expect(hasOverlap).toBe(false);
    });

    it('simplified should NOT detect conflict with UTC dates', () => {
      const hasOverlap = checkOverlapSimplified(orderPickupUTC, orderReturnUTC, rentalStartUTC, rentalEndUTC);
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Edge case: Order return date with end-of-day time', () => {
    // If server stores return date as end of day (23:59:59)
    const orderPickup = new Date('2026-05-04T00:00:00.000Z');
    const orderReturn = new Date('2026-05-07T23:59:59.999Z'); // end of 07/05

    // Request starts 10/05
    const rentalStart = new Date('2026-05-10T00:00:00.000Z');
    const rentalEnd = new Date('2026-10-15T23:59:59.999Z');

    it('should NOT detect conflict even with end-of-day return', () => {
      const hasOverlap = checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd);
      // 07/05 23:59:59 > 10/05 00:00:00? NO → no overlap
      expect(hasOverlap).toBe(false);
    });

    it('batch-style should NOT detect conflict', () => {
      const hasOverlap = checkOverlapBatchStyle(orderPickup, orderReturn, rentalStart, rentalEnd);
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Confirm overlapping cases DO get detected', () => {
    it('should detect overlap: order 04/05-12/05 vs request 10/05-15/10', () => {
      // Order return (12/05) is during the request period
      const orderPickup = new Date('2026-05-04T00:00:00.000Z');
      const orderReturn = new Date('2026-05-12T00:00:00.000Z');
      const rentalStart = new Date('2026-05-10T00:00:00.000Z');
      const rentalEnd = new Date('2026-10-15T00:00:00.000Z');

      expect(checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
      expect(checkOverlapBatchStyle(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
    });

    it('should detect overlap: order 08/05-12/05 vs request 10/05-15/10', () => {
      // Order pickup (08/05) is before request, return (12/05) is during
      const orderPickup = new Date('2026-05-08T00:00:00.000Z');
      const orderReturn = new Date('2026-05-12T00:00:00.000Z');
      const rentalStart = new Date('2026-05-10T00:00:00.000Z');
      const rentalEnd = new Date('2026-10-15T00:00:00.000Z');

      expect(checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
      expect(checkOverlapBatchStyle(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
    });

    it('should detect overlap: order 01/06-20/11 vs request 10/05-15/10 (order spans end)', () => {
      const orderPickup = new Date('2026-06-01T00:00:00.000Z');
      const orderReturn = new Date('2026-11-20T00:00:00.000Z');
      const rentalStart = new Date('2026-05-10T00:00:00.000Z');
      const rentalEnd = new Date('2026-10-15T00:00:00.000Z');

      expect(checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
      expect(checkOverlapBatchStyle(orderPickup, orderReturn, rentalStart, rentalEnd)).toBe(true);
    });
  });

  describe('Bug reproduction: PICKUPED order with renting counter', () => {
    // The real bug: batch-availability uses totalAvailableStock (stock - renting)
    // If the order 04/05-07/05 is PICKUPED, outletStock.renting = 1
    // Even though dates don't overlap, the renting counter reduces available stock
    
    it('OLD BUG: totalAvailableStock - conflictingQuantity double-counts', () => {
      const totalStock = 1;
      const totalRenting = 1; // PICKUPED order counts in renting
      const conflictingQuantity = 0; // No date overlap

      // OLD formula (BUGGY): totalAvailableStock - conflictingQuantity
      const totalAvailableStock = Math.max(0, totalStock - totalRenting); // 1 - 1 = 0
      const oldResult = Math.max(0, totalAvailableStock - conflictingQuantity); // 0 - 0 = 0
      expect(oldResult).toBe(0); // WRONG! Reports unavailable

      // NEW formula (FIXED): totalStock - conflictingQuantity
      const newResult = Math.max(0, totalStock - conflictingQuantity); // 1 - 0 = 1
      expect(newResult).toBe(1); // CORRECT! Available
    });

    it('REAL SCENARIO: stock=1, PICKUPED 04/05-07/05, request 10/05-15/10', () => {
      const totalStock = 1;
      const orderPickup = new Date('2026-05-04T00:00:00.000Z');
      const orderReturn = new Date('2026-05-07T00:00:00.000Z');
      const rentalStart = new Date('2026-05-10T00:00:00.000Z');
      const rentalEnd = new Date('2026-10-15T00:00:00.000Z');

      // Check overlap
      const hasOverlap = checkOverlapSimplified(orderPickup, orderReturn, rentalStart, rentalEnd);
      expect(hasOverlap).toBe(false); // No overlap

      // Calculate availability with FIXED formula
      const conflictingQuantity = hasOverlap ? 1 : 0;
      const effectivelyAvailable = Math.max(0, totalStock - conflictingQuantity);
      
      expect(conflictingQuantity).toBe(0);
      expect(effectivelyAvailable).toBe(1);
      expect(effectivelyAvailable >= 1).toBe(true); // Can fulfill request for qty 1
    });
  });
});
