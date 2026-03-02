// ============================================================================
// PRODUCT AVAILABILITY DATE CONVERSION & LOGIC TESTS
// ============================================================================
// Test date conversion (local date → UTC datetime) and product availability logic
// 
// Usage: Run with Jest/Vitest
//   npm test tests/product-availability-date-conversion.test.ts
//   or
//   yarn test tests/product-availability-date-conversion.test.ts

import { convertLocalDateToUTCDatetime, getLocalDateKey } from '@rentalshop/utils';

// Mock constants
const ORDER_STATUS = {
  RESERVED: 'RESERVED',
  PICKUPED: 'PICKUPED',
  RETURNED: 'RETURNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const ORDER_TYPE = {
  RENT: 'RENT',
  SALE: 'SALE'
};

/**
 * Helper function: Check if order overlaps with requested rental period
 * This matches the logic from apps/api/app/api/products/availability/route.ts
 */
function isOrderActiveInPeriod(
  order: {
    orderType: string;
    status: string;
    pickupPlanAt: Date | string | null;
    returnPlanAt: Date | string | null;
  },
  requestedDateKey: string, // YYYY-MM-DD format
  startOfPeriod: Date,
  endOfPeriod: Date
): boolean {
  const status = order.status;
  
  // Only check RENT orders for rental availability
  if (order.orderType !== ORDER_TYPE.RENT) {
    return status === ORDER_STATUS.RESERVED;
  }
  
  // Get order's rental period
  const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
  
  if (!orderPickup) return false;
  
  // ✅ Use getLocalDateKey to get local date for comparison
  const orderPickupDateKey = getLocalDateKey(orderPickup);
  
  // Normalize return date to end of day UTC for comparison
  const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
  if (orderReturnEnd) {
    orderReturnEnd.setUTCHours(23, 59, 59, 999);
  }
  
  if (status === ORDER_STATUS.PICKUPED) {
    if (!orderReturnEnd) {
      return orderPickupDateKey === requestedDateKey;
    }
    return orderPickupDateKey === requestedDateKey || 
           (orderPickup <= endOfPeriod && orderReturnEnd >= startOfPeriod);
  }
  
  if (status === ORDER_STATUS.RESERVED) {
    return orderPickupDateKey === requestedDateKey || 
           (orderPickup <= endOfPeriod && (!orderReturnEnd || orderReturnEnd >= startOfPeriod));
  }
  
  if (status === ORDER_STATUS.RETURNED) {
    return false;
  }
  
  return false;
}

// ============================================================================
// DATE CONVERSION TESTS
// ============================================================================

describe('Date Conversion Tests', () => {
  describe('convertLocalDateToUTCDatetime', () => {
    it('should convert pickup date correctly (start of day)', () => {
      // User selects: 27/03/2026
      // Expected: 2026-03-26T17:00:00.000Z (26/03 17:00 UTC = 27/03 00:00 UTC+7)
      const result = convertLocalDateToUTCDatetime('2026-03-27');
      expect(result).toBe('2026-03-26T17:00:00.000Z');
    });

    it('should convert return date correctly (end of day)', () => {
      // User selects: 30/03/2026
      // Mobile app should send: 2026-03-30T16:59:59.000Z (30/03 16:59:59 UTC = 30/03 23:59:59 UTC+7)
      // But convertLocalDateToUTCDatetime converts to start of day: 2026-03-29T17:00:00.000Z
      // This is expected behavior for pickup date, but return date needs special handling
      const result = convertLocalDateToUTCDatetime('2026-03-30');
      expect(result).toBe('2026-03-29T17:00:00.000Z');
      
      // Note: Mobile app should handle return date differently (end of day)
      // Return date: 30/03 → should be 2026-03-30T16:59:59.000Z
    });

    it('should handle various dates correctly', () => {
      expect(convertLocalDateToUTCDatetime('2026-03-10')).toBe('2026-03-09T17:00:00.000Z');
      expect(convertLocalDateToUTCDatetime('2026-03-11')).toBe('2026-03-10T17:00:00.000Z');
      expect(convertLocalDateToUTCDatetime('2026-03-25')).toBe('2026-03-24T17:00:00.000Z');
    });
  });

  describe('getLocalDateKey', () => {
    it('should convert UTC datetime to local date correctly', () => {
      // Pickup: 2026-03-26T17:00:00.000Z = 27/03 00:00 UTC+7
      expect(getLocalDateKey('2026-03-26T17:00:00.000Z')).toBe('2026-03-27');
      
      // Return: 2026-03-30T16:59:59.000Z = 30/03 23:59:59 UTC+7
      expect(getLocalDateKey('2026-03-30T16:59:59.000Z')).toBe('2026-03-30');
      
      // Pickup: 2026-03-10T17:00:00.000Z = 11/03 00:00 UTC+7
      expect(getLocalDateKey('2026-03-10T17:00:00.000Z')).toBe('2026-03-11');
    });
  });
});

// ============================================================================
// PRODUCT AVAILABILITY LOGIC TESTS
// ============================================================================

describe('Product Availability Logic Tests', () => {
  describe('isOrderActiveInPeriod - Single Date Mode', () => {
    it('should NOT count order from 11/03 when checking 10/03', () => {
      // Order: pickup 11/03 = 2026-03-10T17:00:00.000Z
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-10T17:00:00.000Z', // 11/03 00:00 UTC+7
        returnPlanAt: '2026-03-14T16:59:59.000Z' // 15/03 23:59:59 UTC+7
      };
      
      // Request: 10/03
      const requestedDateKey = '2026-03-10';
      const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(false); // Should NOT be active
    });

    it('should count order from 10/03 when checking 10/03', () => {
      // Order: pickup 10/03 = 2026-03-09T17:00:00.000Z
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03 00:00 UTC+7
        returnPlanAt: '2026-03-12T16:59:59.000Z' // 13/03 23:59:59 UTC+7
      };
      
      // Request: 10/03
      const requestedDateKey = '2026-03-10';
      const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(true); // Should be active
    });

    it('should count order that spans across requested date', () => {
      // Order: pickup 09/03, return 11/03
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-08T17:00:00.000Z', // 09/03 00:00 UTC+7
        returnPlanAt: '2026-03-10T16:59:59.000Z' // 11/03 23:59:59 UTC+7
      };
      
      // Request: 10/03 (order spans across this date)
      const requestedDateKey = '2026-03-10';
      const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(true); // Should be active (spans across)
    });

    it('should NOT count RETURNED orders', () => {
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RETURNED,
        pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03 00:00 UTC+7
        returnPlanAt: '2026-03-10T16:59:59.000Z' // 11/03 23:59:59 UTC+7
      };
      
      const requestedDateKey = '2026-03-10';
      const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(false); // Should NOT be active (already returned)
    });

    it('should count PICKUPED orders correctly', () => {
      // Order: pickup 10/03, currently being rented
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.PICKUPED,
        pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03 00:00 UTC+7
        returnPlanAt: '2026-03-12T16:59:59.000Z' // 13/03 23:59:59 UTC+7
      };
      
      // Request: 10/03
      const requestedDateKey = '2026-03-10';
      const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(true); // Should be active (currently rented)
    });
  });

  describe('isOrderActiveInPeriod - Rental Period Mode', () => {
    it('should count order if pickup date matches pickupDate in period', () => {
      // Order: pickup 27/03, return 30/03
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-26T17:00:00.000Z', // 27/03 00:00 UTC+7
        returnPlanAt: '2026-03-30T16:59:59.000Z' // 30/03 23:59:59 UTC+7
      };
      
      // Request: pickupDate 27/03, returnDate 30/03
      const requestedDateKey = '2026-03-27'; // Use pickupDate for comparison
      const startOfPeriod = new Date('2026-03-27T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-30T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(true); // Should be active (pickup date matches)
    });

    it('should count order if return date is within requested period', () => {
      // Order: pickup 25/03, return 28/03
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-24T17:00:00.000Z', // 25/03 00:00 UTC+7
        returnPlanAt: '2026-03-28T16:59:59.000Z' // 28/03 23:59:59 UTC+7
      };
      
      // Request: pickupDate 27/03, returnDate 30/03 (order return 28/03 is within period)
      const requestedDateKey = '2026-03-27';
      const startOfPeriod = new Date('2026-03-27T00:00:00.000Z');
      const endOfPeriod = new Date('2026-03-30T23:59:59.999Z');
      
      const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
      
      expect(isActive).toBe(true); // Should be active (return date within period)
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - Real-world Scenarios
// ============================================================================

describe('Integration Tests - Real-world Scenarios', () => {
  it('should handle mobile app date format correctly', () => {
    // Mobile app sends:
    // pickupPlanAt: "2026-03-26T17:00:00.000Z" (user selected 27/03)
    // returnPlanAt: "2026-03-30T16:59:59.000Z" (user selected 30/03)
    
    const order = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.RESERVED,
      pickupPlanAt: '2026-03-26T17:00:00.000Z',
      returnPlanAt: '2026-03-30T16:59:59.000Z'
    };
    
    // Check availability for 27/03
    const requestedDateKey = '2026-03-27';
    const startOfPeriod = new Date('2026-03-27T00:00:00.000Z');
    const endOfPeriod = new Date('2026-03-27T23:59:59.999Z');
    
    const isActive = isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod);
    
    expect(isActive).toBe(true); // Should be active (pickup date matches)
    
    // Check availability for 26/03 (day before pickup)
    const requestedDateKey2 = '2026-03-26';
    const startOfPeriod2 = new Date('2026-03-26T00:00:00.000Z');
    const endOfPeriod2 = new Date('2026-03-26T23:59:59.999Z');
    
    const isActive2 = isOrderActiveInPeriod(order, requestedDateKey2, startOfPeriod2, endOfPeriod2);
    
    expect(isActive2).toBe(false); // Should NOT be active (pickup is next day)
  });

  it('should handle multiple orders correctly', () => {
    const orders = [
      {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03
        returnPlanAt: '2026-03-12T16:59:59.000Z' // 13/03
      },
      {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: '2026-03-10T17:00:00.000Z', // 11/03
        returnPlanAt: '2026-03-14T16:59:59.000Z' // 15/03
      },
      {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RETURNED,
        pickupPlanAt: '2026-03-08T17:00:00.000Z', // 09/03
        returnPlanAt: '2026-03-09T16:59:59.000Z' // 10/03
      }
    ];
    
    // Check availability for 10/03
    const requestedDateKey = '2026-03-10';
    const startOfPeriod = new Date('2026-03-10T00:00:00.000Z');
    const endOfPeriod = new Date('2026-03-10T23:59:59.999Z');
    
    const activeOrders = orders.filter(order => 
      isOrderActiveInPeriod(order, requestedDateKey, startOfPeriod, endOfPeriod)
    );
    
    // Should only count order 1 (pickup 10/03) and order 2 (return 11/03 spans across)
    // Order 3 is RETURNED, so should not count
    expect(activeOrders.length).toBe(1); // Only order 1 (pickup 10/03)
    expect(activeOrders[0].pickupPlanAt).toBe('2026-03-09T17:00:00.000Z');
  });
});
