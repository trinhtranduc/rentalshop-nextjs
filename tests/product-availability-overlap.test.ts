// ============================================================================
// PRODUCT AVAILABILITY OVERLAP TESTS
// ============================================================================
// Test logic for checking product availability with orders and date ranges
// 
// Usage: Run with Jest/Vitest
//   npm test tests/product-availability-overlap.test.ts
//   or
//   yarn test tests/product-availability-overlap.test.ts

// Mock constants if not available in test environment
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
 * This is the same logic from apps/api/app/api/products/availability/route.ts
 */
function isOrderActiveInPeriod(
  order: {
    orderType: string;
    status: string;
    pickupPlanAt: Date | string | null;
    returnPlanAt: Date | string | null;
  },
  startOfPeriod: Date,
  endOfPeriod: Date
): boolean {
  const status = order.status;
  
  // Only check RENT orders for rental availability
  if (order.orderType !== ORDER_TYPE.RENT) {
    // For SALE orders, only check if they're RESERVED (not yet completed)
    return status === ORDER_STATUS.RESERVED;
  }
  
  // Get order's rental period
  const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
  
  if (!orderPickup) return false; // No pickup date = not active
  
  // Normalize order dates to UTC
  const orderPickupStart = new Date(orderPickup);
  orderPickupStart.setUTCHours(0, 0, 0, 0);
  
  const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
  if (orderReturnEnd) {
    orderReturnEnd.setUTCHours(23, 59, 59, 999);
  }
  
  // Check overlap: orders overlap if their rental periods intersect
  // Order is active if:
  // 1. Order pickup is within requested period, OR
  // 2. Order return is within requested period, OR
  // 3. Order spans across requested period (pickup before start, return after end)
  
  if (status === ORDER_STATUS.PICKUPED) {
    // Currently rented: active if return date hasn't passed start of requested period
    if (!orderReturnEnd) return true; // No return date = still active
    return orderReturnEnd >= startOfPeriod;
  }
  
  if (status === ORDER_STATUS.RESERVED) {
    // Reserved: active if rental period overlaps with requested period
    const hasOverlap = 
      (orderPickupStart <= endOfPeriod && (!orderReturnEnd || orderReturnEnd >= startOfPeriod));
    return hasOverlap;
  }
  
  if (status === ORDER_STATUS.RETURNED) {
    // Returned: was active if rental period overlapped with requested period
    if (!orderReturnEnd) return false;
    return orderPickupStart <= endOfPeriod && orderReturnEnd >= startOfPeriod;
  }
  
  return false;
}

/**
 * Calculate availability for a product given orders and date range
 */
function calculateProductAvailability(
  totalStock: number,
  orders: Array<{
    orderType: string;
    status: string;
    pickupPlanAt: Date | string | null;
    returnPlanAt: Date | string | null;
    orderItems: Array<{
      productId: number;
      quantity: number;
    }>;
  }>,
  productId: number,
  startOfPeriod: Date,
  endOfPeriod: Date
): {
  totalStock: number;
  totalRented: number;
  totalReserved: number;
  totalAvailable: number;
  isAvailable: boolean;
  activeOrders: any[];
} {
  // Filter orders that are active in the period
  const activeOrders = orders.filter(order => {
    // Check if order has this product
    const hasProduct = order.orderItems.some(item => item.productId === productId);
    if (!hasProduct) return false;
    
    return isOrderActiveInPeriod(order, startOfPeriod, endOfPeriod);
  });

  // Calculate quantities
  let totalRented = 0;
  let totalReserved = 0;

  activeOrders.forEach(order => {
    order.orderItems.forEach(item => {
      if (item.productId !== productId) return;

      // RENT orders: PICKUPED = rented, RESERVED = reserved
      if (order.orderType === ORDER_TYPE.RENT) {
        if (order.status === ORDER_STATUS.PICKUPED) {
          totalRented += item.quantity;
        } else if (order.status === ORDER_STATUS.RESERVED) {
          totalReserved += item.quantity;
        }
      }
      
      // SALE orders: Only RESERVED counts (COMPLETED/PICKUPED already reduced stock)
      if (order.orderType === ORDER_TYPE.SALE && order.status === ORDER_STATUS.RESERVED) {
        totalReserved += item.quantity;
      }
    });
  });

  const totalAvailable = Math.max(0, totalStock - totalRented - totalReserved);

  return {
    totalStock,
    totalRented,
    totalReserved,
    totalAvailable,
    isAvailable: totalAvailable > 0,
    activeOrders
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

describe('Product Availability Overlap Tests', () => {
  const productId = 5339;
  const totalStock = 10; // Product có 10 sản phẩm

  // Test Case 1: Single date check
  describe('Single Date Mode', () => {
    it('should check availability for a specific date', () => {
      const checkDate = '2026-02-27';
      const startOfPeriod = new Date(checkDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(checkDate + 'T23:59:59.999Z');

      // Orders existing in database
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 3 }]
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z',
          returnPlanAt: '2026-02-29T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      console.log('📊 Single Date Test Result:', {
        date: checkDate,
        totalStock: result.totalStock,
        totalRented: result.totalRented, // 3 (PICKUPED order)
        totalReserved: result.totalReserved, // 2 (RESERVED order)
        totalAvailable: result.totalAvailable, // 10 - 3 - 2 = 5
        isAvailable: result.isAvailable,
        activeOrdersCount: result.activeOrders.length
      });

      expect(result.totalStock).toBe(10);
      expect(result.totalRented).toBe(3); // Order 1: PICKUPED với 3 sản phẩm
      expect(result.totalReserved).toBe(2); // Order 2: RESERVED với 2 sản phẩm
      expect(result.totalAvailable).toBe(5); // 10 - 3 - 2 = 5
      expect(result.isAvailable).toBe(true);
    });
  });

  // Test Case 2: Rental period check
  describe('Rental Period Mode', () => {
    it('should check availability for rental period (pickupDate to returnDate)', () => {
      const pickupDate = '2026-02-26';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      // Orders existing in database
      const orders = [
        // Order 1: Đang được thuê, overlap với period
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z', // Bắt đầu trước period
          returnPlanAt: '2026-02-27T17:00:00.000Z', // Kết thúc trong period
          orderItems: [{ productId, quantity: 3 }]
        },
        // Order 2: Đã đặt, overlap với period
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z', // Trong period
          returnPlanAt: '2026-02-29T17:00:00.000Z', // Sau period
          orderItems: [{ productId, quantity: 2 }]
        },
        // Order 3: Span across period
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-24T10:00:00.000Z', // Trước period
          returnPlanAt: '2026-02-30T17:00:00.000Z', // Sau period
          orderItems: [{ productId, quantity: 1 }]
        },
        // Order 4: Không overlap (trước period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-24T17:00:00.000Z',
          orderItems: [{ productId, quantity: 5 }]
        },
        // Order 5: Không overlap (sau period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-01T10:00:00.000Z',
          returnPlanAt: '2026-03-05T17:00:00.000Z',
          orderItems: [{ productId, quantity: 4 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      console.log('📊 Rental Period Test Result:', {
        pickupDate,
        returnDate,
        totalStock: result.totalStock,
        totalRented: result.totalRented, // 3 (Order 1: PICKUPED)
        totalReserved: result.totalReserved, // 3 (Order 2: 2 + Order 3: 1)
        totalAvailable: result.totalAvailable, // 10 - 3 - 3 = 4
        isAvailable: result.isAvailable,
        activeOrdersCount: result.activeOrders.length // Should be 3 (Order 1, 2, 3)
      });

      expect(result.totalStock).toBe(10);
      expect(result.totalRented).toBe(3); // Order 1: PICKUPED với 3 sản phẩm
      expect(result.totalReserved).toBe(3); // Order 2: 2 + Order 3: 1 = 3
      expect(result.totalAvailable).toBe(4); // 10 - 3 - 3 = 4
      expect(result.isAvailable).toBe(true);
      expect(result.activeOrders.length).toBe(3); // Order 1, 2, 3 overlap
    });

    it('should handle orders that start before and end during period', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z', // Trước period
          returnPlanAt: '2026-02-27T15:00:00.000Z', // Trong period
          orderItems: [{ productId, quantity: 5 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalRented).toBe(5);
      expect(result.totalAvailable).toBe(5);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should handle orders that start during and end after period', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-28T10:00:00.000Z', // Trong period
          returnPlanAt: '2026-03-02T17:00:00.000Z', // Sau period
          orderItems: [{ productId, quantity: 4 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalReserved).toBe(4);
      expect(result.totalAvailable).toBe(6);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should handle orders that span entire period', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z', // Trước period
          returnPlanAt: '2026-03-05T17:00:00.000Z', // Sau period
          orderItems: [{ productId, quantity: 7 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalRented).toBe(7);
      expect(result.totalAvailable).toBe(3);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should handle out of stock scenario', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-29T17:00:00.000Z',
          orderItems: [{ productId, quantity: 6 }]
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 5 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      console.log('📊 Out of Stock Test Result:', result);

      expect(result.totalRented).toBe(6);
      expect(result.totalReserved).toBe(5);
      expect(result.totalAvailable).toBe(0); // 10 - 6 - 5 = -1, max(0, -1) = 0
      expect(result.isAvailable).toBe(false);
    });

    it('should handle SALE orders correctly', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.RESERVED, // SALE RESERVED counts
          pickupPlanAt: '2026-02-27T10:00:00.000Z',
          returnPlanAt: null,
          orderItems: [{ productId, quantity: 3 }]
        },
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED, // SALE COMPLETED doesn't count (already reduced stock)
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: null,
          orderItems: [{ productId, quantity: 2 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalRented).toBe(0); // SALE orders don't count as rented
      expect(result.totalReserved).toBe(3); // Only RESERVED SALE counts
      expect(result.totalAvailable).toBe(7); // 10 - 0 - 3 = 7
    });
  });

  // Test Case 3: Edge cases
  describe('Edge Cases', () => {
    it('should handle same-day rental', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-27'; // Same day
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-27T10:00:00.000Z',
          returnPlanAt: '2026-02-27T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalRented).toBe(2);
      expect(result.totalAvailable).toBe(8);
    });

    it('should handle orders without return date', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: null, // No return date
          orderItems: [{ productId, quantity: 3 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // PICKUPED without return date = still active
      expect(result.totalRented).toBe(3);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should handle RETURNED orders correctly', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-27T15:00:00.000Z', // Returned trong period
          orderItems: [{ productId, quantity: 2 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // RETURNED orders don't count (already returned)
      expect(result.totalRented).toBe(0);
      expect(result.totalReserved).toBe(0);
      expect(result.totalAvailable).toBe(10);
    });
  });
});
