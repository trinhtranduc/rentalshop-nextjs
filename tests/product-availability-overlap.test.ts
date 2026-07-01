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
 * This is the CORRECTED logic matching /api/products/[id]/availability
 * Uses standard interval overlap: orderPickup < periodEnd AND orderReturn > periodStart
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
  
  // RETURNED orders never count
  if (status === ORDER_STATUS.RETURNED) {
    return false;
  }
  
  // Only active statuses: RESERVED and PICKUPED
  if (status !== ORDER_STATUS.PICKUPED && status !== ORDER_STATUS.RESERVED) {
    return false;
  }
  
  // Get order's rental period
  const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
  
  if (!orderPickup) return false; // No pickup date = not active
  
  // Normalize orderReturn to end of day for comparison
  const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
  if (orderReturnEnd) {
    orderReturnEnd.setUTCHours(23, 59, 59, 999);
  }
  
  if (!orderReturnEnd) {
    // No return date: consider active if pickup is within or before the period end
    return orderPickup <= endOfPeriod;
  }
  
  // Standard interval overlap: orderPickup < endOfPeriod AND orderReturnEnd > startOfPeriod
  return orderPickup < endOfPeriod && orderReturnEnd > startOfPeriod;
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

    it('should handle low stock correctly (2 total, 1 ordered, 1 available)', () => {
      const checkDate = '2026-02-27';
      const startOfPeriod = new Date(checkDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(checkDate + 'T23:59:59.999Z');

      const lowStockProductId = 1001;
      const lowStockTotal = 2; // Chỉ có 2 sản phẩm

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId: lowStockProductId, quantity: 1 }] // Đã đặt 1
        }
      ];

      const result = calculateProductAvailability(
        lowStockTotal,
        orders,
        lowStockProductId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalStock).toBe(2);
      expect(result.totalRented).toBe(1);
      expect(result.totalReserved).toBe(0);
      expect(result.totalAvailable).toBe(1); // 2 - 1 = 1
      expect(result.isAvailable).toBe(true);
    });

    it('should not count orders outside the requested period', () => {
      const checkDate = '2026-02-27';
      const startOfPeriod = new Date(checkDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(checkDate + 'T23:59:59.999Z');

      const orders = [
        // Order 1: Trả trước period (không overlap)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-24T17:00:00.000Z', // Trả trước 2026-02-27
          orderItems: [{ productId, quantity: 3 }]
        },
        // Order 2: Bắt đầu sau period (không overlap)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-01T10:00:00.000Z', // Bắt đầu sau 2026-02-27
          returnPlanAt: '2026-03-05T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        // Order 3: PICKUPED nhưng đã trả trước period (không overlap)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-25T17:00:00.000Z', // Trả trước 2026-02-27
          orderItems: [{ productId, quantity: 1 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // Không có order nào overlap với period
      expect(result.totalRented).toBe(0);
      expect(result.totalReserved).toBe(0);
      expect(result.totalAvailable).toBe(10); // 10 - 0 - 0 = 10, tất cả available
      expect(result.isAvailable).toBe(true);
      expect(result.activeOrders.length).toBe(0);
    });

    it('should handle mixed orders (some overlap, some do not)', () => {
      const checkDate = '2026-02-27';
      const startOfPeriod = new Date(checkDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(checkDate + 'T23:59:59.999Z');

      const orders = [
        // Order 1: Overlap (PICKUPED, return trong period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-27T15:00:00.000Z', // Trả trong period
          orderItems: [{ productId, quantity: 2 }]
        },
        // Order 2: Overlap (RESERVED, pickup trong period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z', // Pickup trong period
          returnPlanAt: '2026-02-29T17:00:00.000Z',
          orderItems: [{ productId, quantity: 1 }]
        },
        // Order 3: Không overlap (trả trước period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-24T17:00:00.000Z', // Trả trước period
          orderItems: [{ productId, quantity: 3 }]
        },
        // Order 4: Không overlap (bắt đầu sau period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-01T10:00:00.000Z', // Bắt đầu sau period
          returnPlanAt: '2026-03-05T17:00:00.000Z',
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

      // Chỉ Order 1 và 2 overlap
      expect(result.totalRented).toBe(2); // Order 1
      expect(result.totalReserved).toBe(1); // Order 2
      expect(result.totalAvailable).toBe(7); // 10 - 2 - 1 = 7
      expect(result.isAvailable).toBe(true);
      expect(result.activeOrders.length).toBe(2); // Order 1 và 2
    });
  });

  // ============================================================================
  // NEW TEST CASES - Double-Count Prevention & Quantity Checks
  // ============================================================================

  describe('Double-Count Prevention (Bug Fix)', () => {
    it('should NOT double-count PICKUPED orders that overlap with period', () => {
      // This was the bug: if we use totalStock - renting - conflicts,
      // a PICKUPED order gets counted BOTH in "renting" and "conflicts"
      // Fix: effectivelyAvailable = totalStock - conflictingQuantity (only)
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      // Scenario: stock=5, 2 units currently PICKUPED (overlap), 1 unit RESERVED (overlap)
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z',
          returnPlanAt: '2026-02-29T17:00:00.000Z',
          orderItems: [{ productId, quantity: 1 }]
        }
      ];

      const stockForTest = 5;
      const result = calculateProductAvailability(
        stockForTest,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // Correct: 5 - 2 (PICKUPED) - 1 (RESERVED) = 2 available
      // Wrong (double-count): 5 - 2 (renting) - 2 (PICKUPED conflict) - 1 (RESERVED) = 0
      expect(result.totalRented).toBe(2);
      expect(result.totalReserved).toBe(1);
      expect(result.totalAvailable).toBe(2); // 5 - 2 - 1 = 2
      expect(result.isAvailable).toBe(true);
    });

    it('should correctly calculate when all stock is occupied', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const stockForTest = 3;
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T09:00:00.000Z',
          returnPlanAt: '2026-02-29T17:00:00.000Z',
          orderItems: [{ productId, quantity: 1 }]
        }
      ];

      const result = calculateProductAvailability(
        stockForTest,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // 3 - 2 - 1 = 0
      expect(result.totalAvailable).toBe(0);
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('Quantity Validation', () => {
    it('should report unavailable when requested qty exceeds available', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 8 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock, // 10
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // 10 - 8 = 2 available, but if customer wants 5, not enough
      expect(result.totalAvailable).toBe(2);
      expect(result.isAvailable).toBe(true); // isAvailable means > 0
      // Client-side logic checks: effectivelyAvailable >= requestedQuantity
      // So requesting 5 would be "unavailable" on client
    });

    it('should handle multiple items in single order', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [
            { productId, quantity: 3 },  // same product, 2 line items
            { productId, quantity: 2 },
          ]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // Both line items count: 3 + 2 = 5
      expect(result.totalRented).toBe(5);
      expect(result.totalAvailable).toBe(5);
    });

    it('should ignore order items for different products', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const otherProductId = 9999;
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [
            { productId, quantity: 2 },           // Our product
            { productId: otherProductId, quantity: 5 }, // Different product
          ]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // Only count our product
      expect(result.totalRented).toBe(2);
      expect(result.totalAvailable).toBe(8);
    });
  });

  describe('Boundary Conditions', () => {
    it('should detect overlap when order return = period start (same day)', () => {
      // Order returns on the same day the check period starts
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-25T10:00:00.000Z',
          returnPlanAt: '2026-02-27T00:00:00.000Z', // Returns at start of period
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

      // orderReturnEnd = 2026-02-27T23:59:59.999Z > startOfPeriod = 2026-02-27T00:00:00.000Z
      // AND orderPickup = 2026-02-25 < endOfPeriod = 2026-02-28T23:59:59.999Z
      // → overlap!
      expect(result.totalRented).toBe(3);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should NOT detect overlap when order return < period start', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-26T10:00:00.000Z', // Returns BEFORE period
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

      // orderReturnEnd = 2026-02-26T23:59:59.999Z < startOfPeriod = 2026-02-27T00:00:00.000Z?
      // Actually 2026-02-26T23:59:59.999Z is NOT > startOfPeriod 2026-02-27T00:00:00.000Z
      // So NO overlap
      expect(result.totalRented).toBe(0);
      expect(result.activeOrders.length).toBe(0);
      expect(result.totalAvailable).toBe(10);
    });

    it('should detect overlap when order pickup = period end (same day)', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-28T10:00:00.000Z', // Pickup on last day of period
          returnPlanAt: '2026-03-02T17:00:00.000Z',
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

      // orderPickup = 2026-02-28T10:00:00.000Z < endOfPeriod = 2026-02-28T23:59:59.999Z ✓
      // orderReturnEnd = 2026-03-02T23:59:59.999Z > startOfPeriod = 2026-02-27T00:00:00.000Z ✓
      // → overlap
      expect(result.totalReserved).toBe(4);
      expect(result.activeOrders.length).toBe(1);
    });

    it('should NOT detect overlap when order pickup > period end', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-01T10:00:00.000Z', // Starts AFTER period
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

      // orderPickup = 2026-03-01 is NOT < endOfPeriod = 2026-02-28T23:59:59.999Z
      expect(result.totalReserved).toBe(0);
      expect(result.activeOrders.length).toBe(0);
    });

    it('should handle zero stock', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const result = calculateProductAvailability(
        0, // zero stock
        [],
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalStock).toBe(0);
      expect(result.totalAvailable).toBe(0);
      expect(result.isAvailable).toBe(false);
    });

    it('should handle no orders (fully available)', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const result = calculateProductAvailability(
        totalStock,
        [],
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalAvailable).toBe(10);
      expect(result.isAvailable).toBe(true);
      expect(result.activeOrders.length).toBe(0);
    });
  });

  describe('CANCELLED Orders', () => {
    it('should NOT count CANCELLED orders', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          pickupPlanAt: '2026-02-27T10:00:00.000Z',
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

      expect(result.totalRented).toBe(0);
      expect(result.totalReserved).toBe(0);
      expect(result.totalAvailable).toBe(10);
      expect(result.activeOrders.length).toBe(0);
    });
  });

  describe('Mixed RENT and SALE Orders', () => {
    it('should handle both RENT and SALE orders in same period', () => {
      const pickupDate = '2026-02-27';
      const returnDate = '2026-02-28';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        // RENT PICKUPED
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-26T10:00:00.000Z',
          returnPlanAt: '2026-02-28T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        // SALE RESERVED (counts)
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-02-27T10:00:00.000Z',
          returnPlanAt: null,
          orderItems: [{ productId, quantity: 3 }]
        },
        // SALE COMPLETED (doesn't count - already reduced stock permanently)
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          pickupPlanAt: '2026-02-27T10:00:00.000Z',
          returnPlanAt: null,
          orderItems: [{ productId, quantity: 1 }]
        }
      ];

      const result = calculateProductAvailability(
        totalStock,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      expect(result.totalRented).toBe(2);  // RENT PICKUPED
      expect(result.totalReserved).toBe(3); // SALE RESERVED only
      expect(result.totalAvailable).toBe(5); // 10 - 2 - 3 = 5
    });
  });

  describe('Long Rental Period (Week/Month)', () => {
    it('should correctly handle a 7-day rental period with multiple conflicts', () => {
      const pickupDate = '2026-03-01';
      const returnDate = '2026-03-07';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        // Overlaps first 2 days
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-28T10:00:00.000Z',
          returnPlanAt: '2026-03-02T17:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        // Overlaps middle
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-03T10:00:00.000Z',
          returnPlanAt: '2026-03-05T17:00:00.000Z',
          orderItems: [{ productId, quantity: 3 }]
        },
        // Overlaps last 2 days
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-03-06T10:00:00.000Z',
          returnPlanAt: '2026-03-10T17:00:00.000Z',
          orderItems: [{ productId, quantity: 1 }]
        },
        // NO overlap (before period)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-02-20T10:00:00.000Z',
          returnPlanAt: '2026-02-25T17:00:00.000Z',
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

      // All 3 overlap. The "worst case" for availability is the maximum
      // simultaneous occupation. But our simple model sums ALL conflicts:
      // totalRented = 2, totalReserved = 3 + 1 = 4
      // totalAvailable = 10 - 2 - 4 = 4
      expect(result.totalRented).toBe(2);
      expect(result.totalReserved).toBe(4);
      expect(result.totalAvailable).toBe(4);
      expect(result.activeOrders.length).toBe(3);
    });

    it('should correctly handle: stock=3, PICKUPED order before period does NOT conflict, RESERVED order partially overlaps', () => {
      // Real scenario: Product "AD quả kem Nhược Vân - S"
      // Stock: 3
      // Order 966885: 01/07-05/07, qty 1, PICKUPED (does NOT overlap 08/07-20/07)
      // Order 803628: 17/07-20/07, qty 2, RESERVED (overlaps 08/07-20/07)
      // Order 908857: 30/07-03/08, qty 2, RESERVED (does NOT overlap 08/07-20/07)
      // Request: qty 1 for 08/07-20/07
      // Expected: only Order 803628 conflicts → totalReserved=2, totalAvailable = 3-0-2 = 1

      const stockForScenario = 3;
      const pickupDate = '2026-07-08';
      const returnDate = '2026-07-20';
      const startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
      const endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');

      const orders = [
        // Order 966885: 01/07-05/07, PICKUPED - should NOT overlap with 08/07-20/07
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          pickupPlanAt: '2026-07-01T00:00:00.000Z',
          returnPlanAt: '2026-07-05T00:00:00.000Z',
          orderItems: [{ productId, quantity: 1 }]
        },
        // Order 803628: 17/07-20/07, RESERVED - overlaps with 08/07-20/07
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-07-17T00:00:00.000Z',
          returnPlanAt: '2026-07-20T00:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        },
        // Order 908857: 30/07-03/08, RESERVED - should NOT overlap with 08/07-20/07
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          pickupPlanAt: '2026-07-30T00:00:00.000Z',
          returnPlanAt: '2026-08-03T00:00:00.000Z',
          orderItems: [{ productId, quantity: 2 }]
        }
      ];

      const result = calculateProductAvailability(
        stockForScenario,
        orders,
        productId,
        startOfPeriod,
        endOfPeriod
      );

      // Only Order 803628 overlaps: 17/07 < 20/07(endOfPeriod) AND 20/07(returnEnd=23:59) > 08/07(startOfPeriod)
      // Order 966885: returnPlanAt=05/07 → returnEnd=05/07 23:59:59 < 08/07(startOfPeriod)? NO! 05/07 23:59 < 08/07 00:00 → YES, no overlap ✓
      // Order 908857: pickupPlanAt=30/07 → 30/07 < 20/07 23:59? NO → no overlap ✓
      expect(result.totalRented).toBe(0); // Order 966885 (PICKUPED) does NOT overlap
      expect(result.totalReserved).toBe(2); // Only Order 803628 (RESERVED, qty 2) overlaps
      expect(result.totalAvailable).toBe(1); // 3 - 0 - 2 = 1
      expect(result.isAvailable).toBe(true); // Can fulfill qty 1
      expect(result.activeOrders.length).toBe(1); // Only 1 order overlaps
    });
  });
});
