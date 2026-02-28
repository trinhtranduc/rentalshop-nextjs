// ============================================================================
// PRODUCT AVAILABILITY TEST SCRIPT
// ============================================================================
// Simple test script to verify product availability logic
// Run: tsx scripts/test-product-availability.ts

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
  
  if (order.orderType !== ORDER_TYPE.RENT) {
    return status === ORDER_STATUS.RESERVED;
  }
  
  const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
  
  if (!orderPickup) return false;
  
  const orderPickupStart = new Date(orderPickup);
  orderPickupStart.setUTCHours(0, 0, 0, 0);
  
  const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
  if (orderReturnEnd) {
    orderReturnEnd.setUTCHours(23, 59, 59, 999);
  }
  
  if (status === ORDER_STATUS.PICKUPED) {
    if (!orderReturnEnd) return true;
    return orderReturnEnd >= startOfPeriod;
  }
  
  if (status === ORDER_STATUS.RESERVED) {
    const hasOverlap = 
      (orderPickupStart <= endOfPeriod && (!orderReturnEnd || orderReturnEnd >= startOfPeriod));
    return hasOverlap;
  }
  
  if (status === ORDER_STATUS.RETURNED) {
    if (!orderReturnEnd) return false;
    return orderPickupStart <= endOfPeriod && orderReturnEnd >= startOfPeriod;
  }
  
  return false;
}

/**
 * Calculate availability for a product
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
  const activeOrders = orders.filter(order => {
    const hasProduct = order.orderItems.some(item => item.productId === productId);
    if (!hasProduct) return false;
    return isOrderActiveInPeriod(order, startOfPeriod, endOfPeriod);
  });

  let totalRented = 0;
  let totalReserved = 0;

  activeOrders.forEach(order => {
    order.orderItems.forEach(item => {
      if (item.productId !== productId) return;

      if (order.orderType === ORDER_TYPE.RENT) {
        if (order.status === ORDER_STATUS.PICKUPED) {
          totalRented += item.quantity;
        } else if (order.status === ORDER_STATUS.RESERVED) {
          totalReserved += item.quantity;
        }
      }
      
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

console.log('🧪 PRODUCT AVAILABILITY TEST CASES\n');
console.log('='.repeat(60));

const productId = 5339;
const totalStock = 10;

// Test Case 1: Single Date
console.log('\n📅 TEST CASE 1: Single Date Mode');
console.log('-'.repeat(60));
const checkDate = '2026-02-27';
const startOfPeriod1 = new Date(checkDate + 'T00:00:00.000Z');
const endOfPeriod1 = new Date(checkDate + 'T23:59:59.999Z');

const orders1 = [
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

const result1 = calculateProductAvailability(
  totalStock,
  orders1,
  productId,
  startOfPeriod1,
  endOfPeriod1
);

console.log(`Date: ${checkDate}`);
console.log(`Total Stock: ${result1.totalStock}`);
console.log(`Total Rented: ${result1.totalRented} (Order 1: PICKUPED)`);
console.log(`Total Reserved: ${result1.totalReserved} (Order 2: RESERVED)`);
console.log(`Total Available: ${result1.totalAvailable}`);
console.log(`Is Available: ${result1.isAvailable}`);
console.log(`Active Orders: ${result1.activeOrders.length}`);

const test1Pass = result1.totalRented === 3 && result1.totalReserved === 2 && result1.totalAvailable === 5;
console.log(`✅ Test 1: ${test1Pass ? 'PASS' : 'FAIL'}`);

// Test Case 2: Rental Period
console.log('\n📅 TEST CASE 2: Rental Period Mode');
console.log('-'.repeat(60));
const pickupDate = '2026-02-26';
const returnDate = '2026-02-28';
const startOfPeriod2 = new Date(pickupDate + 'T00:00:00.000Z');
const endOfPeriod2 = new Date(returnDate + 'T23:59:59.999Z');

const orders2 = [
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-27T17:00:00.000Z',
    orderItems: [{ productId, quantity: 3 }]
  },
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T09:00:00.000Z',
    returnPlanAt: '2026-02-29T17:00:00.000Z',
    orderItems: [{ productId, quantity: 2 }]
  },
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-24T10:00:00.000Z',
    returnPlanAt: '2026-02-30T17:00:00.000Z',
    orderItems: [{ productId, quantity: 1 }]
  },
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RETURNED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-24T17:00:00.000Z',
    orderItems: [{ productId, quantity: 5 }]
  },
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-03-01T10:00:00.000Z',
    returnPlanAt: '2026-03-05T17:00:00.000Z',
    orderItems: [{ productId, quantity: 4 }]
  }
];

const result2 = calculateProductAvailability(
  totalStock,
  orders2,
  productId,
  startOfPeriod2,
  endOfPeriod2
);

console.log(`Pickup Date: ${pickupDate}`);
console.log(`Return Date: ${returnDate}`);
console.log(`Total Stock: ${result2.totalStock}`);
console.log(`Total Rented: ${result2.totalRented} (Order 1: PICKUPED)`);
console.log(`Total Reserved: ${result2.totalReserved} (Order 2: 2 + Order 3: 1)`);
console.log(`Total Available: ${result2.totalAvailable}`);
console.log(`Is Available: ${result2.isAvailable}`);
console.log(`Active Orders: ${result2.activeOrders.length} (Order 1, 2, 3 overlap)`);

const test2Pass = result2.totalRented === 3 && result2.totalReserved === 3 && result2.totalAvailable === 4 && result2.activeOrders.length === 3;
console.log(`✅ Test 2: ${test2Pass ? 'PASS' : 'FAIL'}`);

// Test Case 3: Out of Stock
console.log('\n📅 TEST CASE 3: Out of Stock Scenario');
console.log('-'.repeat(60));
const orders3 = [
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

const result3 = calculateProductAvailability(
  totalStock,
  orders3,
  productId,
  startOfPeriod2,
  endOfPeriod2
);

console.log(`Total Rented: ${result3.totalRented}`);
console.log(`Total Reserved: ${result3.totalReserved}`);
console.log(`Total Available: ${result3.totalAvailable}`);
console.log(`Is Available: ${result3.isAvailable}`);

const test3Pass = result3.totalRented === 6 && result3.totalReserved === 5 && result3.totalAvailable === 0 && !result3.isAvailable;
console.log(`✅ Test 3: ${test3Pass ? 'PASS' : 'FAIL'}`);

// Test Case 4: SALE Orders
console.log('\n📅 TEST CASE 4: SALE Orders');
console.log('-'.repeat(60));
const orders4 = [
  {
    orderType: ORDER_TYPE.SALE,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T10:00:00.000Z',
    returnPlanAt: null,
    orderItems: [{ productId, quantity: 3 }]
  },
  {
    orderType: ORDER_TYPE.SALE,
    status: ORDER_STATUS.COMPLETED,
    pickupPlanAt: '2026-02-26T10:00:00.000Z',
    returnPlanAt: null,
    orderItems: [{ productId, quantity: 2 }]
  }
];

const result4 = calculateProductAvailability(
  totalStock,
  orders4,
  productId,
  startOfPeriod2,
  endOfPeriod2
);

console.log(`Total Rented: ${result4.totalRented} (SALE orders don't count as rented)`);
console.log(`Total Reserved: ${result4.totalReserved} (Only RESERVED SALE counts)`);
console.log(`Total Available: ${result4.totalAvailable}`);

const test4Pass = result4.totalRented === 0 && result4.totalReserved === 3 && result4.totalAvailable === 7;
console.log(`✅ Test 4: ${test4Pass ? 'PASS' : 'FAIL'}`);

// Test Case 5: Low Stock - Product có 2, đã đặt 1, còn 1 available
console.log('\n📅 TEST CASE 5: Low Stock (2 total, 1 ordered, 1 available)');
console.log('-'.repeat(60));
const lowStockProductId = 1001;
const lowStockTotal = 2; // Chỉ có 2 sản phẩm
const checkDate5 = '2026-02-27';
const startOfPeriod5 = new Date(checkDate5 + 'T00:00:00.000Z');
const endOfPeriod5 = new Date(checkDate5 + 'T23:59:59.999Z');

const orders5 = [
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-28T17:00:00.000Z',
    orderItems: [{ productId: lowStockProductId, quantity: 1 }] // Đã đặt 1
  }
];

const result5 = calculateProductAvailability(
  lowStockTotal,
  orders5,
  lowStockProductId,
  startOfPeriod5,
  endOfPeriod5
);

console.log(`Product ID: ${lowStockProductId}`);
console.log(`Total Stock: ${result5.totalStock}`);
console.log(`Total Rented: ${result5.totalRented} (Order 1: PICKUPED với 1 sản phẩm)`);
console.log(`Total Reserved: ${result5.totalReserved}`);
console.log(`Total Available: ${result5.totalAvailable} (2 - 1 = 1)`);
console.log(`Is Available: ${result5.isAvailable}`);

const test5Pass = result5.totalStock === 2 && result5.totalRented === 1 && result5.totalReserved === 0 && result5.totalAvailable === 1 && result5.isAvailable === true;
console.log(`✅ Test 5: ${test5Pass ? 'PASS' : 'FAIL'}`);

// Test Case 6: Orders Outside Period - Orders không overlap với period được check
console.log('\n📅 TEST CASE 6: Orders Outside Period (không được tính)');
console.log('-'.repeat(60));
const checkDate6 = '2026-02-27';
const startOfPeriod6 = new Date(checkDate6 + 'T00:00:00.000Z');
const endOfPeriod6 = new Date(checkDate6 + 'T23:59:59.999Z');

const orders6 = [
  // Order 1: Trước period (đã trả trước khi period bắt đầu)
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RETURNED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-24T17:00:00.000Z', // Trả trước 2026-02-27
    orderItems: [{ productId, quantity: 3 }]
  },
  // Order 2: Sau period (bắt đầu sau khi period kết thúc)
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-03-01T10:00:00.000Z', // Bắt đầu sau 2026-02-27
    returnPlanAt: '2026-03-05T17:00:00.000Z',
    orderItems: [{ productId, quantity: 2 }]
  },
  // Order 3: Trả trước period (PICKUPED nhưng đã trả trước period)
  {
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-25T17:00:00.000Z', // Trả trước 2026-02-27
    orderItems: [{ productId, quantity: 1 }]
  }
];

const result6 = calculateProductAvailability(
  totalStock,
  orders6,
  productId,
  startOfPeriod6,
  endOfPeriod6
);

console.log(`Check Date: ${checkDate6}`);
console.log(`Total Stock: ${result6.totalStock}`);
console.log(`Total Rented: ${result6.totalRented} (Không có order nào overlap)`);
console.log(`Total Reserved: ${result6.totalReserved} (Không có order nào overlap)`);
console.log(`Total Available: ${result6.totalAvailable} (10 - 0 - 0 = 10, tất cả available)`);
console.log(`Is Available: ${result6.isAvailable}`);
console.log(`Active Orders: ${result6.activeOrders.length} (Không có order nào overlap với period)`);

const test6Pass = result6.totalRented === 0 && result6.totalReserved === 0 && result6.totalAvailable === 10 && result6.isAvailable === true && result6.activeOrders.length === 0;
console.log(`✅ Test 6: ${test6Pass ? 'PASS' : 'FAIL'}`);

// Test Case 7: Mixed - Một số orders overlap, một số không
console.log('\n📅 TEST CASE 7: Mixed Orders (một số overlap, một số không)');
console.log('-'.repeat(60));
const checkDate7 = '2026-02-27';
const startOfPeriod7 = new Date(checkDate7 + 'T00:00:00.000Z');
const endOfPeriod7 = new Date(checkDate7 + 'T23:59:59.999Z');

const orders7 = [
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

const result7 = calculateProductAvailability(
  totalStock,
  orders7,
  productId,
  startOfPeriod7,
  endOfPeriod7
);

console.log(`Check Date: ${checkDate7}`);
console.log(`Total Stock: ${result7.totalStock}`);
console.log(`Total Rented: ${result7.totalRented} (Order 1: 2)`);
console.log(`Total Reserved: ${result7.totalReserved} (Order 2: 1)`);
console.log(`Total Available: ${result7.totalAvailable} (10 - 2 - 1 = 7)`);
console.log(`Is Available: ${result7.isAvailable}`);
console.log(`Active Orders: ${result7.activeOrders.length} (Order 1 và 2 overlap, Order 3 và 4 không)`);

const test7Pass = result7.totalRented === 2 && result7.totalReserved === 1 && result7.totalAvailable === 7 && result7.isAvailable === true && result7.activeOrders.length === 2;
console.log(`✅ Test 7: ${test7Pass ? 'PASS' : 'FAIL'}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass && test7Pass;
console.log(`Test 1 (Single Date): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 2 (Rental Period): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 3 (Out of Stock): ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 4 (SALE Orders): ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 5 (Low Stock): ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 6 (Orders Outside Period): ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 7 (Mixed Orders): ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`\n${allTestsPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
