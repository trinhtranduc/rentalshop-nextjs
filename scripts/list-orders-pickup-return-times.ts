// ============================================================================
// LIST ORDERS PICKUP AND RETURN TIMES
// ============================================================================
// Liệt kê thời gian pickup và return của tất cả orders trong test cases

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

interface Order {
  testCase: string;
  orderId: number;
  orderType: string;
  status: string;
  pickupPlanAt: string;
  returnPlanAt: string | null;
  quantity: number;
  productId: number;
}

const allOrders: Order[] = [
  // Test Case 1
  {
    testCase: 'Test Case 1: Single Date Mode',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-28T17:00:00.000Z',
    quantity: 3,
    productId: 5339
  },
  {
    testCase: 'Test Case 1: Single Date Mode',
    orderId: 2,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T09:00:00.000Z',
    returnPlanAt: '2026-02-29T17:00:00.000Z',
    quantity: 2,
    productId: 5339
  },
  // Test Case 2
  {
    testCase: 'Test Case 2: Rental Period Mode',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-27T17:00:00.000Z',
    quantity: 3,
    productId: 5339
  },
  {
    testCase: 'Test Case 2: Rental Period Mode',
    orderId: 2,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T09:00:00.000Z',
    returnPlanAt: '2026-02-29T17:00:00.000Z',
    quantity: 2,
    productId: 5339
  },
  {
    testCase: 'Test Case 2: Rental Period Mode',
    orderId: 3,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-24T10:00:00.000Z',
    returnPlanAt: '2026-02-30T17:00:00.000Z',
    quantity: 1,
    productId: 5339
  },
  {
    testCase: 'Test Case 2: Rental Period Mode',
    orderId: 4,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RETURNED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-24T17:00:00.000Z',
    quantity: 5,
    productId: 5339
  },
  {
    testCase: 'Test Case 2: Rental Period Mode',
    orderId: 5,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-03-01T10:00:00.000Z',
    returnPlanAt: '2026-03-05T17:00:00.000Z',
    quantity: 4,
    productId: 5339
  },
  // Test Case 3
  {
    testCase: 'Test Case 3: Out of Stock',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-29T17:00:00.000Z',
    quantity: 6,
    productId: 5339
  },
  {
    testCase: 'Test Case 3: Out of Stock',
    orderId: 2,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T09:00:00.000Z',
    returnPlanAt: '2026-02-28T17:00:00.000Z',
    quantity: 5,
    productId: 5339
  },
  // Test Case 4
  {
    testCase: 'Test Case 4: SALE Orders',
    orderId: 1,
    orderType: ORDER_TYPE.SALE,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T10:00:00.000Z',
    returnPlanAt: null,
    quantity: 3,
    productId: 5339
  },
  {
    testCase: 'Test Case 4: SALE Orders',
    orderId: 2,
    orderType: ORDER_TYPE.SALE,
    status: ORDER_STATUS.COMPLETED,
    pickupPlanAt: '2026-02-26T10:00:00.000Z',
    returnPlanAt: null,
    quantity: 2,
    productId: 5339
  },
  // Test Case 5
  {
    testCase: 'Test Case 5: Low Stock',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-28T17:00:00.000Z',
    quantity: 1,
    productId: 1001
  },
  // Test Case 6
  {
    testCase: 'Test Case 6: Orders Outside Period',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RETURNED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-24T17:00:00.000Z',
    quantity: 3,
    productId: 5339
  },
  {
    testCase: 'Test Case 6: Orders Outside Period',
    orderId: 2,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-03-01T10:00:00.000Z',
    returnPlanAt: '2026-03-05T17:00:00.000Z',
    quantity: 2,
    productId: 5339
  },
  {
    testCase: 'Test Case 6: Orders Outside Period',
    orderId: 3,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-25T17:00:00.000Z',
    quantity: 1,
    productId: 5339
  },
  // Test Case 7
  {
    testCase: 'Test Case 7: Mixed Orders',
    orderId: 1,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-27T15:00:00.000Z',
    quantity: 2,
    productId: 5339
  },
  {
    testCase: 'Test Case 7: Mixed Orders',
    orderId: 2,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-02-27T09:00:00.000Z',
    returnPlanAt: '2026-02-29T17:00:00.000Z',
    quantity: 1,
    productId: 5339
  },
  {
    testCase: 'Test Case 7: Mixed Orders',
    orderId: 3,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RETURNED,
    pickupPlanAt: '2026-02-20T10:00:00.000Z',
    returnPlanAt: '2026-02-24T17:00:00.000Z',
    quantity: 3,
    productId: 5339
  },
  {
    testCase: 'Test Case 7: Mixed Orders',
    orderId: 4,
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.RESERVED,
    pickupPlanAt: '2026-03-01T10:00:00.000Z',
    returnPlanAt: '2026-03-05T17:00:00.000Z',
    quantity: 2,
    productId: 5339
  }
];

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0]; // YYYY-MM-DD
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
}

function calculateDays(start: string, end: string | null): number {
  if (!end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Calculate available quantity after each order
function calculateAvailableAfterOrder(
  totalStock: number,
  orders: Order[],
  currentOrderIndex: number,
  productId: number,
  checkDate?: string,
  pickupDate?: string,
  returnDate?: string
): number {
  // Determine period to check
  let startOfPeriod: Date;
  let endOfPeriod: Date;
  
  if (checkDate) {
    startOfPeriod = new Date(checkDate + 'T00:00:00.000Z');
    endOfPeriod = new Date(checkDate + 'T23:59:59.999Z');
  } else if (pickupDate && returnDate) {
    startOfPeriod = new Date(pickupDate + 'T00:00:00.000Z');
    endOfPeriod = new Date(returnDate + 'T23:59:59.999Z');
  } else {
    return totalStock;
  }

  // Check if order overlaps with period
  function isOrderActiveInPeriod(order: Order): boolean {
    if (order.productId !== productId) return false;
    
    const orderPickup = new Date(order.pickupPlanAt);
    orderPickup.setUTCHours(0, 0, 0, 0);
    
    const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
    if (orderReturn) {
      orderReturn.setUTCHours(23, 59, 59, 999);
    }

    if (order.status === ORDER_STATUS.PICKUPED) {
      if (!orderReturn) return true;
      return orderReturn >= startOfPeriod;
    }

    if (order.status === ORDER_STATUS.RESERVED) {
      return orderPickup <= endOfPeriod && (!orderReturn || orderReturn >= startOfPeriod);
    }

    if (order.status === ORDER_STATUS.RETURNED) {
      if (!orderReturn) return false;
      return orderPickup <= endOfPeriod && orderReturn >= startOfPeriod;
    }

    return false;
  }

  // Calculate total rented and reserved up to current order
  let totalRented = 0;
  let totalReserved = 0;

  for (let i = 0; i <= currentOrderIndex; i++) {
    const order = orders[i];
    if (!isOrderActiveInPeriod(order)) continue;

    if (order.orderType === ORDER_TYPE.RENT) {
      if (order.status === ORDER_STATUS.PICKUPED) {
        totalRented += order.quantity;
      } else if (order.status === ORDER_STATUS.RESERVED) {
        totalReserved += order.quantity;
      }
    } else if (order.orderType === ORDER_TYPE.SALE && order.status === ORDER_STATUS.RESERVED) {
      totalReserved += order.quantity;
    }
  }

  return Math.max(0, totalStock - totalRented - totalReserved);
}

console.log('📋 ORDERS PICKUP AND RETURN TIMES');
console.log('='.repeat(120));
console.log('\n');

// Group by test case
const groupedByTestCase = allOrders.reduce((acc, order) => {
  if (!acc[order.testCase]) {
    acc[order.testCase] = [];
  }
  acc[order.testCase].push(order);
  return acc;
}, {} as Record<string, Order[]>);

// Test case configurations
const testCaseConfigs: Record<string, { totalStock: number; checkDate?: string; pickupDate?: string; returnDate?: string }> = {
  'Test Case 1: Single Date Mode': { totalStock: 10, checkDate: '2026-02-27' },
  'Test Case 2: Rental Period Mode': { totalStock: 10, pickupDate: '2026-02-26', returnDate: '2026-02-28' },
  'Test Case 3: Out of Stock': { totalStock: 10, pickupDate: '2026-02-26', returnDate: '2026-02-28' },
  'Test Case 4: SALE Orders': { totalStock: 10, pickupDate: '2026-02-27', returnDate: '2026-02-28' },
  'Test Case 5: Low Stock': { totalStock: 2, checkDate: '2026-02-27' },
  'Test Case 6: Orders Outside Period': { totalStock: 10, checkDate: '2026-02-27' },
  'Test Case 7: Mixed Orders': { totalStock: 10, checkDate: '2026-02-27' }
};

Object.entries(groupedByTestCase).forEach(([testCase, orders]) => {
  const config = testCaseConfigs[testCase];
  if (!config) return;

  console.log(`\n${testCase}`);
  console.log(`📦 Total Stock: ${config.totalStock}`);
  if (config.checkDate) {
    console.log(`📅 Check Date: ${config.checkDate}`);
  } else if (config.pickupDate && config.returnDate) {
    console.log(`📅 Rental Period: ${config.pickupDate} → ${config.returnDate}`);
  }
  console.log('-'.repeat(130));
  console.log(
    'Order ID'.padEnd(10) +
    'Type'.padEnd(8) +
    'Status'.padEnd(12) +
    'Pickup Date'.padEnd(15) +
    'Pickup Time'.padEnd(15) +
    'Return Date'.padEnd(15) +
    'Return Time'.padEnd(15) +
    'Duration'.padEnd(12) +
    'Qty'.padEnd(6) +
    'Available'.padEnd(12) +
    'Product ID'
  );
  console.log('-'.repeat(130));

  orders.forEach((order, index) => {
    const pickupDate = formatDate(order.pickupPlanAt);
    const pickupTime = formatTime(order.pickupPlanAt);
    const returnDate = order.returnPlanAt ? formatDate(order.returnPlanAt) : 'N/A';
    const returnTime = order.returnPlanAt ? formatTime(order.returnPlanAt) : 'N/A';
    const duration = order.returnPlanAt ? `${calculateDays(order.pickupPlanAt, order.returnPlanAt)} days` : 'N/A';
    
    // Calculate available after this order
    const available = calculateAvailableAfterOrder(
      config.totalStock,
      orders,
      index,
      order.productId,
      config.checkDate,
      config.pickupDate,
      config.returnDate
    );

    console.log(
      `Order ${order.orderId}`.padEnd(10) +
      order.orderType.padEnd(8) +
      order.status.padEnd(12) +
      pickupDate.padEnd(15) +
      pickupTime.padEnd(15) +
      returnDate.padEnd(15) +
      returnTime.padEnd(15) +
      duration.padEnd(12) +
      order.quantity.toString().padEnd(6) +
      available.toString().padEnd(12) +
      order.productId.toString()
    );
  });
  
  // Show final available
  const finalAvailable = calculateAvailableAfterOrder(
    config.totalStock,
    orders,
    orders.length - 1,
    orders[0]?.productId || 0,
    config.checkDate,
    config.pickupDate,
    config.returnDate
  );
  console.log('-'.repeat(130));
  console.log(`Final Available: ${finalAvailable} / ${config.totalStock}`);
});

console.log('\n' + '='.repeat(120));
console.log(`\n📊 SUMMARY`);
console.log(`Total Orders: ${allOrders.length}`);
console.log(`Total Test Cases: ${Object.keys(groupedByTestCase).length}`);
