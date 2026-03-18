// ============================================================================
// DASHBOARD OVERVIEW API - RESPONSE SHAPE & LOGIC TESTS
// ============================================================================
// Tests for GET /api/analytics/dashboard response structure and field consistency.
// Route: apps/api/app/api/analytics/dashboard/route.ts
// Validates: overview, orderStatusCounts, todayOrders và logic completionRate.

/** Statuses and types used in dashboard */
const STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];
const ORDER_TYPES = ['RENT', 'SALE'];

/**
 * 5 detail mock orders – tự update theo nhu cầu.
 * Shape: dùng cho buildDashboardData({ recentOrders: MOCK_ORDERS_DETAIL }) hoặc test khác.
 */
const MOCK_ORDERS_DETAIL = [
  {
    id: 1,
    orderNumber: 'ORD-001-0001',
    status: 'RESERVED',
    orderType: 'RENT',
    totalAmount: 300000,
    depositAmount: 100000,
    securityDeposit: 200000,
    customer: { firstName: 'Nguyễn', lastName: 'Văn A' },
    outlet: { name: 'Chi nhánh Quận 1' },
    createdAt: new Date(Date.UTC(2026, 2, 14, 9, 0, 0, 0)),
    pickupPlanAt: new Date(Date.UTC(2026, 2, 14, 14, 0, 0, 0)),
    returnPlanAt: new Date(Date.UTC(2026, 2, 16, 10, 0, 0, 0)),
    orderItems: [{ product: { name: 'Máy khoan Bosch' } }, { product: { name: 'Bộ mũi khoan' } }]
  },
  {
    id: 2,
    orderNumber: 'ORD-001-0002',
    status: 'PICKUPED',
    orderType: 'RENT',
    totalAmount: 500000,
    depositAmount: 150000,
    securityDeposit: 350000,
    customer: { firstName: 'Trần', lastName: 'Thị B' },
    outlet: { name: 'Chi nhánh Quận 7' },
    createdAt: new Date(Date.UTC(2026, 2, 13, 10, 30, 0, 0)),
    pickupPlanAt: new Date(Date.UTC(2026, 2, 14, 8, 0, 0, 0)),
    returnPlanAt: new Date(Date.UTC(2026, 2, 18, 17, 0, 0, 0)),
    orderItems: [{ product: { name: 'Máy hàn điện' } }]
  },
  {
    id: 3,
    orderNumber: 'ORD-001-0003',
    status: 'RETURNED',
    orderType: 'RENT',
    totalAmount: 200000,
    depositAmount: 50000,
    securityDeposit: 150000,
    damageFee: 0,
    customer: { firstName: 'Lê', lastName: 'Văn C' },
    outlet: { name: 'Chi nhánh Quận 1' },
    createdAt: new Date(Date.UTC(2026, 2, 10, 11, 0, 0, 0)),
    pickupPlanAt: new Date(Date.UTC(2026, 2, 10, 14, 0, 0, 0)),
    returnPlanAt: new Date(Date.UTC(2026, 2, 12, 9, 0, 0, 0)),
    orderItems: [{ product: { name: 'Thang nhôm 4 bậc' } }, { product: { name: 'Xe đẩy hàng' } }]
  },
  {
    id: 4,
    orderNumber: 'ORD-001-0004',
    status: 'COMPLETED',
    orderType: 'SALE',
    totalAmount: 1200000,
    depositAmount: 0,
    securityDeposit: 0,
    customer: { firstName: 'Phạm', lastName: 'Thị D' },
    outlet: { name: 'Chi nhánh Quận 3' },
    createdAt: new Date(Date.UTC(2026, 2, 14, 8, 0, 0, 0)),
    pickupPlanAt: null,
    returnPlanAt: null,
    orderItems: [{ product: { name: 'Máy phát điện' } }, { product: { name: 'Dây cáp 50m' } }, { product: { name: 'Bình xịt 2L' } }]
  },
  {
    id: 5,
    orderNumber: 'ORD-001-0005',
    status: 'CANCELLED',
    orderType: 'RENT',
    totalAmount: 180000,
    depositAmount: 50000,
    securityDeposit: 130000,
    customer: null,
    outlet: { name: 'Chi nhánh Quận 7' },
    createdAt: new Date(Date.UTC(2026, 2, 14, 7, 0, 0, 0)),
    pickupPlanAt: new Date(Date.UTC(2026, 2, 14, 12, 0, 0, 0)),
    returnPlanAt: null,
    orderItems: [{ product: { name: 'Búa đục bê tông' } }]
  }
];

/**
 * Generate many mock orders for todayOrders (recent orders).
 * @param {number} count - Number of orders to generate
 * @param {object} overrides - Optional overrides per order: { status, orderType, customer, outlet, productNames }
 */
function generateMockOrders(count, overrides = {}) {
  const orders = [];
  const outlets = ['Outlet A', 'Outlet B', 'Outlet C', 'Branch 1', 'Branch 2'];
  const customers = [
    { firstName: 'John', lastName: 'Doe' },
    { firstName: 'Jane', lastName: 'Smith' },
    { firstName: 'Bob', lastName: 'Wilson' },
    null
  ];
  const products = ['Máy khoan', 'Máy hàn', 'Xe nâng', 'Thang nhôm', 'Bình xịt'];

  for (let i = 1; i <= count; i++) {
    const status = overrides.status ?? STATUSES[i % STATUSES.length];
    const orderType = overrides.orderType ?? ORDER_TYPES[i % ORDER_TYPES.length];
    const customer = overrides.customer !== undefined ? overrides.customer : customers[i % customers.length];
    const outletName = overrides.outlet ?? outlets[i % outlets.length];
    const productCount = 1 + (i % 3);
    const orderItems = Array.from({ length: productCount }, (_, j) => ({
      product: { name: products[(i + j) % products.length] }
    }));

    const hour = 8 + (i % 12);
    const pickupHour = 10 + (i % 8);
    const returnHour = 14 + (i % 6);
    orders.push({
      id: 1000 + i,
      orderNumber: `ORD-${String(Math.floor(i / 1000) + 1).padStart(3, '0')}-${String(i).padStart(4, '0')}`,
      status,
      orderType,
      totalAmount: 50000 + i * 10000,
      customer,
      outlet: outletName ? { name: outletName } : null,
      createdAt: new Date(Date.UTC(2026, 2, 14, hour, 0, 0, 0)),
      pickupPlanAt: orderType === 'RENT' ? new Date(Date.UTC(2026, 2, 14, pickupHour, 0, 0, 0)) : null,
      returnPlanAt: orderType === 'RENT' && status !== 'CANCELLED' ? new Date(Date.UTC(2026, 2, 15, returnHour, 0, 0, 0)) : null,
      orderItems
    });
  }
  return orders;
}

/**
 * Build dashboard data the same way as the route (for unit testing).
 * Used to assert response shape and consistency without calling the API.
 */
function buildDashboardData({
  totalOrders = 0,
  totalRevenue = 0,
  activeOrders = 0,
  reservedOrders = 0,
  completedOrders = 0,
  cancelledOrders = 0,
  returnedOrders = 0,
  recentOrders = []
}) {
  const completionRate = totalOrders > 0
    ? ((totalOrders - activeOrders) / totalOrders * 100).toFixed(1)
    : 0;

  const formatFullName = (firstName, lastName) => {
    if (!firstName && !lastName) return null;
    return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
  };

  return {
    overview: {
      totalOrders,
      totalRevenue,
      activeOrders,
      completionRate: typeof completionRate === 'string' ? completionRate : String(completionRate)
    },
    orderStatusCounts: {
      reserved: reservedOrders,
      pickup: activeOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      returned: returnedOrders
    },
    todayOrders: recentOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      customerName: order.customer ? (formatFullName(order.customer.firstName, order.customer.lastName) || 'Guest') : 'Guest',
      outletName: order.outlet?.name || 'Unknown',
      createdAt: order.createdAt?.toISOString?.() ?? order.createdAt ?? null,
      pickupPlanAt: order.pickupPlanAt?.toISOString?.() ?? order.pickupPlanAt ?? null,
      returnPlanAt: order.returnPlanAt?.toISOString?.() ?? order.returnPlanAt ?? null,
      productNames: (order.orderItems || []).map(item => item.product?.name).filter(Boolean).join(', ') || 'N/A'
    }))
  };
}

describe('Dashboard Overview API - Response structure', () => {
  describe('data.overview', () => {
    it('should return overview with required fields and correct types', () => {
      const data = buildDashboardData({ totalOrders: 10, activeOrders: 3 });
      expect(data.overview).toBeDefined();
      expect(typeof data.overview.totalOrders).toBe('number');
      expect(typeof data.overview.totalRevenue).toBe('number');
      expect(typeof data.overview.activeOrders).toBe('number');
      expect(data.overview.completionRate).toBeDefined();
      expect(['string', 'number']).toContain(typeof data.overview.completionRate);
    });

    it('overview.totalOrders should be non-negative', () => {
      const data = buildDashboardData({ totalOrders: 5 });
      expect(data.overview.totalOrders).toBeGreaterThanOrEqual(0);
    });

    it('overview.totalRevenue should be non-negative', () => {
      const data = buildDashboardData({ totalRevenue: 1000 });
      expect(data.overview.totalRevenue).toBeGreaterThanOrEqual(0);
    });

    it('overview.completionRate should be string when totalOrders > 0', () => {
      const data = buildDashboardData({ totalOrders: 10, activeOrders: 2 });
      expect(typeof data.overview.completionRate).toBe('string');
      expect(parseFloat(data.overview.completionRate)).toBe(80); // (10-2)/10*100
    });

    it('overview.completionRate should be 0 when totalOrders is 0', () => {
      const data = buildDashboardData({ totalOrders: 0 });
      expect(Number(data.overview.completionRate)).toBe(0);
    });
  });

  describe('data.orderStatusCounts', () => {
    it('should return orderStatusCounts with required keys', () => {
      const data = buildDashboardData({
        reservedOrders: 1,
        activeOrders: 2,
        completedOrders: 3,
        cancelledOrders: 0,
        returnedOrders: 1
      });
      expect(data.orderStatusCounts).toMatchObject({
        reserved: 1,
        pickup: 2,
        completed: 3,
        cancelled: 0,
        returned: 1
      });
    });

    it('orderStatusCounts.pickup should equal overview.activeOrders', () => {
      const activeOrders = 5;
      const data = buildDashboardData({
        totalOrders: 20,
        activeOrders,
        reservedOrders: 2,
        completedOrders: 10,
        cancelledOrders: 1,
        returnedOrders: 2
      });
      expect(data.orderStatusCounts.pickup).toBe(activeOrders);
      expect(data.orderStatusCounts.pickup).toBe(data.overview.activeOrders);
    });

    it('all orderStatusCounts values should be numbers >= 0', () => {
      const data = buildDashboardData({
        reservedOrders: 1,
        activeOrders: 2,
        completedOrders: 3,
        cancelledOrders: 0,
        returnedOrders: 1
      });
      Object.values(data.orderStatusCounts).forEach(v => {
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('data.todayOrders', () => {
    it('should return todayOrders as array', () => {
      const data = buildDashboardData({ recentOrders: [] });
      expect(Array.isArray(data.todayOrders)).toBe(true);
    });

    it('each todayOrders item should have required fields', () => {
      const recentOrders = [
        {
          id: 1,
          orderNumber: 'ORD-001-0001',
          status: 'RESERVED',
          orderType: 'RENT',
          totalAmount: 100000,
          customer: { firstName: 'John', lastName: 'Doe' },
          outlet: { name: 'Outlet A' },
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          pickupPlanAt: new Date('2026-03-14T14:00:00.000Z'),
          returnPlanAt: null,
          orderItems: [{ product: { name: 'Product X' } }]
        }
      ];
      const data = buildDashboardData({ recentOrders });
      expect(data.todayOrders).toHaveLength(1);
      const item = data.todayOrders[0];
      expect(item).toHaveProperty('id', 1);
      expect(item).toHaveProperty('orderNumber', 'ORD-001-0001');
      expect(item).toHaveProperty('status', 'RESERVED');
      expect(item).toHaveProperty('orderType', 'RENT');
      expect(item).toHaveProperty('totalAmount', 100000);
      expect(item).toHaveProperty('customerName');
      expect(item).toHaveProperty('outletName');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('pickupPlanAt');
      expect(item).toHaveProperty('returnPlanAt');
      expect(item).toHaveProperty('productNames');
    });

    it('customerName should be "Guest" when no customer', () => {
      const recentOrders = [
        {
          id: 2,
          orderNumber: 'ORD-002-0001',
          status: 'RESERVED',
          orderType: 'RENT',
          totalAmount: 50000,
          customer: null,
          outlet: { name: 'Outlet B' },
          createdAt: new Date(),
          pickupPlanAt: null,
          returnPlanAt: null,
          orderItems: []
        }
      ];
      const data = buildDashboardData({ recentOrders });
      expect(data.todayOrders[0].customerName).toBe('Guest');
    });

    it('outletName should be "Unknown" when no outlet', () => {
      const recentOrders = [
        {
          id: 3,
          orderNumber: 'ORD-003-0001',
          status: 'RESERVED',
          orderType: 'RENT',
          totalAmount: 0,
          customer: null,
          outlet: null,
          createdAt: new Date(),
          pickupPlanAt: null,
          returnPlanAt: null,
          orderItems: []
        }
      ];
      const data = buildDashboardData({ recentOrders });
      expect(data.todayOrders[0].outletName).toBe('Unknown');
    });

    it('should handle many todayOrders (e.g. 20 orders) with correct length and shape', () => {
      const recentOrders = generateMockOrders(20);
      const data = buildDashboardData({ recentOrders });
      expect(data.todayOrders).toHaveLength(20);
      data.todayOrders.forEach((item, idx) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('orderNumber');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('orderType');
        expect(item).toHaveProperty('totalAmount');
        expect(item).toHaveProperty('customerName');
        expect(item).toHaveProperty('outletName');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('pickupPlanAt');
        expect(item).toHaveProperty('returnPlanAt');
        expect(item).toHaveProperty('productNames');
        expect(STATUSES).toContain(item.status);
        expect(ORDER_TYPES).toContain(item.orderType);
      });
    });

    it('many todayOrders: orderNumbers should be unique', () => {
      const recentOrders = generateMockOrders(25);
      const data = buildDashboardData({ recentOrders });
      const orderNumbers = data.todayOrders.map(o => o.orderNumber);
      const unique = new Set(orderNumbers);
      expect(unique.size).toBe(25);
    });

    it('many todayOrders: customerName and outletName should be populated from mock', () => {
      const recentOrders = generateMockOrders(15);
      const data = buildDashboardData({ recentOrders });
      const withCustomer = data.todayOrders.filter(o => o.customerName !== 'Guest');
      const withOutlet = data.todayOrders.filter(o => o.outletName !== 'Unknown');
      expect(withCustomer.length).toBeGreaterThan(0);
      expect(withOutlet.length).toBe(15);
    });

    it('MOCK_ORDERS_DETAIL (5 orders): build and assert shape', () => {
      const data = buildDashboardData({ recentOrders: MOCK_ORDERS_DETAIL });
      expect(data.todayOrders).toHaveLength(5);
      expect(data.todayOrders[0].orderNumber).toBe('ORD-001-0001');
      expect(data.todayOrders[0].customerName).toContain('Nguyễn');
      expect(data.todayOrders[4].customerName).toBe('Guest');
      expect(data.todayOrders[4].status).toBe('CANCELLED');
    });
  });

  describe('Overview & orderStatusCounts with many orders', () => {
    it('overview and orderStatusCounts should be consistent with large counts', () => {
      const reservedOrders = 12;
      const activeOrders = 8;
      const completedOrders = 25;
      const cancelledOrders = 3;
      const returnedOrders = 7;
      const totalOrders = reservedOrders + activeOrders + completedOrders + cancelledOrders + returnedOrders;
      const totalRevenue = 15000000;

      const data = buildDashboardData({
        totalOrders,
        totalRevenue,
        activeOrders,
        reservedOrders,
        completedOrders,
        cancelledOrders,
        returnedOrders
      });

      expect(data.overview.totalOrders).toBe(totalOrders);
      expect(data.overview.totalRevenue).toBe(totalRevenue);
      expect(data.overview.activeOrders).toBe(activeOrders);
      expect(data.orderStatusCounts.reserved).toBe(reservedOrders);
      expect(data.orderStatusCounts.pickup).toBe(activeOrders);
      expect(data.orderStatusCounts.completed).toBe(completedOrders);
      expect(data.orderStatusCounts.cancelled).toBe(cancelledOrders);
      expect(data.orderStatusCounts.returned).toBe(returnedOrders);
      const expectedCompletion = ((totalOrders - activeOrders) / totalOrders * 100).toFixed(1);
      expect(parseFloat(data.overview.completionRate)).toBe(parseFloat(expectedCompletion));
    });

    it('completionRate should be correct with 100 totalOrders and 20 active', () => {
      const data = buildDashboardData({ totalOrders: 100, activeOrders: 20 });
      expect(parseFloat(data.overview.completionRate)).toBe(80); // 80%
    });
  });

  describe('Full response shape (ResponseBuilder.success)', () => {
    it('wrapped response should have success, code, message, data', () => {
      const dashboardData = buildDashboardData({ totalOrders: 0 });
      const response = {
        success: true,
        code: 'DASHBOARD_DATA_SUCCESS',
        message: 'DASHBOARD_DATA_SUCCESS',
        data: dashboardData
      };
      expect(response.success).toBe(true);
      expect(response.code).toBe('DASHBOARD_DATA_SUCCESS');
      expect(response.message).toBeDefined();
      expect(response.data).toHaveProperty('overview');
      expect(response.data).toHaveProperty('orderStatusCounts');
      expect(response.data).toHaveProperty('todayOrders');
    });
  });
});
