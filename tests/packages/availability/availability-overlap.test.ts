import { describe, expect, it } from 'vitest';

/**
 * Unit tests for availability overlap detection
 * 
 * Tests the simplified overlap formula used in the API:
 *   pickupPlanAt < rentalEnd AND returnPlanAt > rentalStart
 * 
 * This formula correctly detects ALL overlap cases:
 * - Order pickup is within requested period
 * - Order return is within requested period
 * - Order spans across requested period
 * - Order is completely contained within requested period
 */

/**
 * Simplified overlap check matching the API query:
 * Two periods overlap when: start1 < end2 AND start2 < end1
 */
function periodsOverlap(
  orderPickup: string,
  orderReturn: string,
  rentalStart: string,
  rentalEnd: string
): boolean {
  const pickup = new Date(orderPickup);
  const returnD = new Date(orderReturn);
  const start = new Date(rentalStart);
  const end = new Date(rentalEnd);
  return pickup < end && returnD > start;
}

/**
 * Calculate conflicting quantity for a product given orders and rental period
 * Matches the logic in /api/products/[id]/availability
 */
function calculateConflicts(
  orders: Array<{
    orderType: string;
    status: string;
    pickupPlanAt: string;
    returnPlanAt: string;
    quantity: number;
  }>,
  rentalStart: string,
  rentalEnd: string
): { conflictingQuantity: number; conflictingOrders: number } {
  let conflictingQuantity = 0;
  let conflictingOrders = 0;

  for (const order of orders) {
    // Only RENT orders with RESERVED or PICKUPED status
    if (order.orderType !== 'RENT') continue;
    if (order.status !== 'RESERVED' && order.status !== 'PICKUPED') continue;

    // Check overlap using simplified formula
    if (periodsOverlap(order.pickupPlanAt, order.returnPlanAt, rentalStart, rentalEnd)) {
      conflictingQuantity += order.quantity;
      conflictingOrders++;
    }
  }

  return { conflictingQuantity, conflictingOrders };
}

describe('Availability Overlap Detection', () => {
  describe('periodsOverlap (simplified formula)', () => {
    it('should detect overlap when order pickup is within requested period', () => {
      // Order: June 5-10, Request: June 1-15
      expect(periodsOverlap(
        '2026-06-05T00:00:00Z', '2026-06-10T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-15T23:59:59Z'
      )).toBe(true);
    });

    it('should detect overlap when order return is within requested period', () => {
      // Order: May 28 - June 3, Request: June 1-15
      expect(periodsOverlap(
        '2026-05-28T00:00:00Z', '2026-06-03T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-15T23:59:59Z'
      )).toBe(true);
    });

    it('should detect overlap when order spans across requested period', () => {
      // Order: May 20 - July 10, Request: June 1-30
      expect(periodsOverlap(
        '2026-05-20T00:00:00Z', '2026-07-10T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(true);
    });

    it('should detect overlap when order is contained within requested period', () => {
      // Order: June 5-10, Request: June 1-30
      expect(periodsOverlap(
        '2026-06-05T00:00:00Z', '2026-06-10T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(true);
    });

    it('should NOT detect overlap when order is completely before requested period', () => {
      // Order: May 1-15, Request: June 1-30
      expect(periodsOverlap(
        '2026-05-01T00:00:00Z', '2026-05-15T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(false);
    });

    it('should NOT detect overlap when order is completely after requested period', () => {
      // Order: July 5-15, Request: June 1-30
      expect(periodsOverlap(
        '2026-07-05T00:00:00Z', '2026-07-15T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(false);
    });

    it('should detect overlap when order ends exactly at period start (touching)', () => {
      // Order return = June 1 17:00, Request start = June 1 00:00
      // returnPlanAt > rentalStart → 17:00 > 00:00 → true
      expect(periodsOverlap(
        '2026-05-31T17:00:00Z', '2026-06-01T17:00:00Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(true);
    });

    it('should NOT detect overlap when order ends exactly at period start boundary', () => {
      // Order return = May 31 23:59, Request start = June 1 00:00
      // returnPlanAt > rentalStart → May 31 23:59 < June 1 00:00 → false
      expect(periodsOverlap(
        '2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(false);
    });

    // Real-world case from the bug report
    it('should detect overlap: order 31/5-29/6 vs check 1/6-30/6 (UTC timezone)', () => {
      // Order pickup: May 31 17:00 UTC (= June 1 00:00 UTC+7)
      // Order return: June 29 17:00 UTC (= June 30 00:00 UTC+7)
      // Check: June 1 00:00 UTC - June 30 23:59 UTC
      expect(periodsOverlap(
        '2026-05-31T17:00:00Z', '2026-06-29T17:00:00Z',
        '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z'
      )).toBe(true);
    });
  });

  describe('calculateConflicts', () => {
    const rentalStart = '2026-06-01T00:00:00.000Z';
    const rentalEnd = '2026-06-30T23:59:59.999Z';

    it('should count conflicting quantity from overlapping RESERVED orders', () => {
      const orders = [
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-05-31T17:00:00Z', returnPlanAt: '2026-06-29T17:00:00Z', quantity: 3 },
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-05-31T17:00:00Z', returnPlanAt: '2026-06-29T17:00:00Z', quantity: 1 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(4);
      expect(result.conflictingOrders).toBe(2);
    });

    it('should count PICKUPED orders that overlap', () => {
      const orders = [
        { orderType: 'RENT', status: 'PICKUPED', pickupPlanAt: '2026-05-20T00:00:00Z', returnPlanAt: '2026-06-15T23:59:59Z', quantity: 2 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(2);
      expect(result.conflictingOrders).toBe(1);
    });

    it('should NOT count PICKUPED orders that do NOT overlap', () => {
      const orders = [
        // Order from Nov 2025 - already past, but still PICKUPED (not returned)
        // Its returnPlanAt is Dec 3 2025 which is < rentalStart June 1 2026
        { orderType: 'RENT', status: 'PICKUPED', pickupPlanAt: '2025-11-21T18:00:00Z', returnPlanAt: '2025-12-03T07:00:00Z', quantity: 1 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(0);
      expect(result.conflictingOrders).toBe(0);
    });

    it('should NOT count SALE orders', () => {
      const orders = [
        { orderType: 'SALE', status: 'RESERVED', pickupPlanAt: '2026-06-05T00:00:00Z', returnPlanAt: '2026-06-10T23:59:59Z', quantity: 5 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(0);
    });

    it('should NOT count RETURNED or CANCELLED orders', () => {
      const orders = [
        { orderType: 'RENT', status: 'RETURNED', pickupPlanAt: '2026-06-01T00:00:00Z', returnPlanAt: '2026-06-10T23:59:59Z', quantity: 3 },
        { orderType: 'RENT', status: 'CANCELLED', pickupPlanAt: '2026-06-05T00:00:00Z', returnPlanAt: '2026-06-15T23:59:59Z', quantity: 2 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(0);
    });

    it('should NOT count orders completely before the period', () => {
      const orders = [
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-04-30T17:00:00Z', returnPlanAt: '2026-05-30T17:00:00Z', quantity: 1 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      expect(result.conflictingQuantity).toBe(0);
    });

    // Full real-world scenario from the bug report
    it('should correctly calculate for Product 60 real data', () => {
      const orders = [
        // #374102: RESERVED, 31/5-29/6, qty 3 → OVERLAP
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-05-31T17:00:00.000Z', returnPlanAt: '2026-06-29T17:00:00.000Z', quantity: 3 },
        // #100611: RESERVED, 31/5-29/6, qty 1 → OVERLAP
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-05-31T17:00:00.000Z', returnPlanAt: '2026-06-29T17:00:00.000Z', quantity: 1 },
        // #512894: RESERVED, 30/4-30/5, qty 1 → NO OVERLAP (ends before June 1)
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-04-30T17:00:00.000Z', returnPlanAt: '2026-05-30T17:00:00.000Z', quantity: 1 },
        // ORD-004-0022: SALE, RESERVED → NOT COUNTED (SALE type)
        { orderType: 'SALE', status: 'RESERVED', pickupPlanAt: '2025-11-28T15:13:38.916Z', returnPlanAt: '2025-11-28T15:13:38.916Z', quantity: 1 },
        // ORD-004-0012: RESERVED, 1/12-5/12/2025, qty 1 → NO OVERLAP
        { orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2025-12-01T08:28:30.065Z', returnPlanAt: '2025-12-05T20:20:21.690Z', quantity: 1 },
        // ORD-004-0028: PICKUPED, 21/11-3/12/2025, qty 1 → NO OVERLAP (return before June)
        { orderType: 'RENT', status: 'PICKUPED', pickupPlanAt: '2025-11-21T18:35:45.676Z', returnPlanAt: '2025-12-03T07:24:33.133Z', quantity: 1 },
      ];

      const result = calculateConflicts(orders, rentalStart, rentalEnd);
      // Only #374102 (3) and #100611 (1) overlap → total 4
      expect(result.conflictingQuantity).toBe(4);
      expect(result.conflictingOrders).toBe(2);

      // effectivelyAvailable = totalAvailableStock - conflictingQuantity
      const totalStock = 15;
      const totalRenting = 1; // ORD-004-0028 is PICKUPED (counted in outletStock.renting)
      const totalAvailableStock = totalStock - totalRenting; // 14
      const effectivelyAvailable = Math.max(0, totalAvailableStock - result.conflictingQuantity); // 14 - 4 = 10
      expect(effectivelyAvailable).toBe(10);
    });
  });
});
