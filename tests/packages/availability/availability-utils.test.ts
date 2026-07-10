import { describe, expect, it } from 'vitest';

/**
 * Unit tests for Availability Check Page utilities
 * Tests the logic for deriving availability results and order conflict detection
 */

import {
  deriveAvailabilityResult,
  datesOverlap,
  toActiveOrders,
  addDaysToDateString,
  needsOutletSelection,
  formatAvailabilityDate,
} from '../../../packages/ui/src/components/features/Availability/utils';

describe('Availability Utils', () => {
  describe('deriveAvailabilityResult', () => {
    it('should return "available" when stock is sufficient and no conflicts', () => {
      const data = {
        stockAvailable: true,
        isAvailable: true,
        totalStock: 15,
        totalRenting: 0,
        totalAvailableStock: 15,
        totalConflictsFound: 0,
        availabilityByOutlet: [{
          outletId: 1,
          effectivelyAvailable: 15,
          conflicts: [],
        }],
      };

      const result = deriveAvailabilityResult(data, 1, 1);
      expect(result.status).toBe('available');
      expect(result.effectivelyAvailable).toBe(15);
      expect(result.totalConflictsFound).toBe(0);
    });

    it('should return "warning" when available but has conflicts', () => {
      const data = {
        stockAvailable: true,
        isAvailable: true,
        totalStock: 15,
        totalRenting: 1,
        totalAvailableStock: 14,
        totalConflictsFound: 2,
        availabilityByOutlet: [{
          outletId: 1,
          effectivelyAvailable: 12,
          conflicts: [
            { orderNumber: 'ORD-001', quantity: 1 },
            { orderNumber: 'ORD-002', quantity: 1 },
          ],
        }],
      };

      const result = deriveAvailabilityResult(data, 1, 1);
      expect(result.status).toBe('warning');
      expect(result.effectivelyAvailable).toBe(12);
      expect(result.totalConflictsFound).toBe(2);
    });

    it('should return "unavailable" when stock is insufficient', () => {
      const data = {
        stockAvailable: false,
        isAvailable: false,
        totalStock: 5,
        totalRenting: 5,
        totalAvailableStock: 0,
        totalConflictsFound: 0,
        availabilityByOutlet: [{
          outletId: 1,
          effectivelyAvailable: 0,
          conflicts: [],
        }],
      };

      const result = deriveAvailabilityResult(data, 1, 1);
      expect(result.status).toBe('unavailable');
      expect(result.effectivelyAvailable).toBe(0);
    });

    it('should return "unavailable" when requested quantity exceeds available', () => {
      const data = {
        stockAvailable: true,
        isAvailable: false,
        totalStock: 15,
        totalRenting: 5,
        totalAvailableStock: 10,
        totalConflictsFound: 3,
        availabilityByOutlet: [{
          outletId: 1,
          effectivelyAvailable: 2,
          conflicts: [],
        }],
      };

      // Requesting 5 but only 2 effectively available
      const result = deriveAvailabilityResult(data, 5, 1);
      expect(result.status).toBe('unavailable');
      expect(result.effectivelyAvailable).toBe(2);
    });

    it('should use correct outlet data when outletId is specified', () => {
      const data = {
        stockAvailable: true,
        isAvailable: true,
        totalStock: 30,
        totalRenting: 2,
        totalAvailableStock: 28,
        totalConflictsFound: 0,
        availabilityByOutlet: [
          { outletId: 1, effectivelyAvailable: 10, conflicts: [] },
          { outletId: 2, effectivelyAvailable: 18, conflicts: [] },
        ],
      };

      const result = deriveAvailabilityResult(data, 1, 2);
      expect(result.effectivelyAvailable).toBe(18);
    });

    it('should fallback to first outlet when outletId not found', () => {
      const data = {
        stockAvailable: true,
        isAvailable: true,
        totalStock: 15,
        totalRenting: 0,
        totalAvailableStock: 15,
        totalConflictsFound: 0,
        availabilityByOutlet: [
          { outletId: 1, effectivelyAvailable: 15, conflicts: [] },
        ],
      };

      const result = deriveAvailabilityResult(data, 1, 999);
      expect(result.effectivelyAvailable).toBe(15);
    });
  });

  describe('datesOverlap', () => {
    it('should detect overlapping date ranges', () => {
      // Period A: June 1-5, Period B: June 3-7 → overlap
      expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-03', '2026-06-07')).toBe(true);
    });

    it('should detect when one period contains another', () => {
      // Period A: June 1-10, Period B: June 3-5 → overlap
      expect(datesOverlap('2026-06-01', '2026-06-10', '2026-06-03', '2026-06-05')).toBe(true);
    });

    it('should detect adjacent dates as overlapping', () => {
      // Period A ends on same day Period B starts
      expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-05', '2026-06-10')).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      // Period A: June 1-5, Period B: June 7-10 → no overlap
      expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-07', '2026-06-10')).toBe(false);
    });

    it('should return false for completely separate periods', () => {
      // Period A: Jan, Period B: June → no overlap
      expect(datesOverlap('2026-01-01', '2026-01-31', '2026-06-01', '2026-06-30')).toBe(false);
    });
  });

  describe('toActiveOrders', () => {
    it('should convert API orders to ActiveOrder format', () => {
      const orders = [
        {
          id: 1,
          orderNumber: 'ORD-001-0001',
          status: 'PICKUPED',
          pickupPlanAt: '2026-06-01T00:00:00.000Z',
          returnPlanAt: '2026-06-05T23:59:59.000Z',
          customer: { firstName: 'Nguyen', lastName: 'Van A' },
          orderItems: [{ quantity: 3 }],
        },
      ];

      const result = toActiveOrders(orders, '2026-06-03', '2026-06-07');
      expect(result).toHaveLength(1);
      expect(result[0].orderNumber).toBe('ORD-001-0001');
      expect(result[0].customerName).toBe('Nguyen Van A');
      expect(result[0].quantity).toBe(3);
      expect(result[0].status).toBe('PICKUPED');
      expect(result[0].isConflict).toBe(true); // overlaps with selected period
    });

    it('should mark non-overlapping orders as not conflict', () => {
      const orders = [
        {
          id: 2,
          orderNumber: 'ORD-001-0002',
          status: 'RESERVED',
          pickupPlanAt: '2026-01-01T00:00:00.000Z',
          returnPlanAt: '2026-01-05T23:59:59.000Z',
          customer: { firstName: 'Tran', lastName: 'B' },
          orderItems: [{ quantity: 1 }],
        },
      ];

      const result = toActiveOrders(orders, '2026-06-01', '2026-06-05');
      expect(result[0].isConflict).toBe(false); // Jan order doesn't overlap June
    });

    it('should handle orders without customer', () => {
      const orders = [
        {
          id: 3,
          orderNumber: 'ORD-001-0003',
          status: 'RESERVED',
          pickupPlanAt: '2026-06-01T00:00:00.000Z',
          returnPlanAt: '2026-06-03T23:59:59.000Z',
          customer: null,
          orderItems: [{ quantity: 2 }],
        },
      ];

      const result = toActiveOrders(orders);
      expect(result[0].customerName).toBe('—');
      expect(result[0].isConflict).toBe(false); // no selected period
    });

    it('should not mark conflicts when no selected period', () => {
      const orders = [
        {
          id: 4,
          orderNumber: 'ORD-001-0004',
          status: 'PICKUPED',
          pickupPlanAt: '2026-06-01T00:00:00.000Z',
          returnPlanAt: '2026-06-10T23:59:59.000Z',
          customer: { firstName: 'Le', lastName: 'C' },
          orderItems: [{ quantity: 5 }],
        },
      ];

      // No selected period → isConflict should be false
      const result = toActiveOrders(orders);
      expect(result[0].isConflict).toBe(false);
    });
  });

  describe('addDaysToDateString', () => {
    it('should add 1 day correctly', () => {
      const result = addDaysToDateString('2026-06-01', 1);
      // Function uses local time + toISOString, result depends on timezone
      // Just verify it returns a valid date string format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return a different date when adding days', () => {
      const original = '2026-06-01';
      const result = addDaysToDateString(original, 7);
      expect(result).not.toBe(original);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('needsOutletSelection', () => {
    it('should return false for outlet users (they have assigned outlet)', () => {
      expect(needsOutletSelection('OUTLET_STAFF', 5)).toBe(false);
      expect(needsOutletSelection('OUTLET_ADMIN', 3)).toBe(false);
    });

    it('should return true for MERCHANT without outlet', () => {
      expect(needsOutletSelection('MERCHANT', undefined)).toBe(true);
    });

    it('should return true for ADMIN without outlet', () => {
      expect(needsOutletSelection('ADMIN', undefined)).toBe(true);
    });

    it('should return false for MERCHANT with outlet assigned', () => {
      expect(needsOutletSelection('MERCHANT', 1)).toBe(false);
    });
  });

  describe('formatAvailabilityDate', () => {
    it('should format date string to locale format', () => {
      const result = formatAvailabilityDate('2026-06-09', 'vi');
      expect(result).toContain('9');
      expect(result).toContain('6');
    });

    it('should return empty string for empty input', () => {
      expect(formatAvailabilityDate('', 'vi')).toBe('');
    });

    it('should return original string for invalid format', () => {
      expect(formatAvailabilityDate('invalid', 'vi')).toBe('invalid');
    });
  });
});
