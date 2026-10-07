/**
 * #594 (timezone batch B of #578) — day-based reports and exports read Vietnam civil days.
 * Day D (VN) = [D-1 17:00Z, D 16:59:59.999Z]. "Now" is 2 Oct 17:30Z = 3 Oct 00:30 in Vietnam, still 2 Oct in UTC,
 * so a route on the UTC day or the server zone answers for the wrong day. Overdue = PICKUPED and returnPlanAt
 * before the start of Vietnam today (one rule). Must give the same results under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => {
  class NextResponse {
    body: any;
    status: number;
    headers: Record<string, string>;
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    }
    static json(body: any, init?: any) {
      return { body, status: init?.status || 200 };
    }
  }
  return { NextRequest: jest.fn(), NextResponse };
});

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withReadOnlyAuth: (handler: any) => (request: any) => handler(request, ctx),
  validateMerchantAccess: jest.fn(async () => ({ valid: true, merchant: { id: 2 } })),
}));

const mockDb: any = {
  orders: {
    search: jest.fn(),
    getStats: jest.fn(),
    findManyLightweight: jest.fn(),
    searchWithItems: jest.fn(),
    getStatistics: jest.fn(),
  },
  merchants: { findById: jest.fn(), count: jest.fn() },
  outlets: { findById: jest.fn(), count: jest.fn() },
  users: { count: jest.fn() },
  products: { count: jest.fn() },
  customers: { findById: jest.fn(), getStats: jest.fn() },
  outletStock: { aggregate: jest.fn() },
};
const mockPrisma: any = { order: { findMany: jest.fn(), aggregate: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

const mockRevenueEvents = jest.fn();
jest.mock('@rentalshop/utils', () => {
  const date = jest.requireActual('../../packages/utils/src/core/date');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  const revenue = jest.requireActual('../../packages/utils/src/core/revenue-calculator');
  const excel = jest.requireActual('../../packages/utils/src/core/excel');
  const strings = jest.requireActual('../../packages/utils/src/core/string-utils');
  const schemas = jest.requireActual('../../packages/utils/src/core/validation-schemas');
  return {
    ...date,
    ...dateRange,
    ...revenue,
    ...excel,
    formatFullName: strings.formatFullName,
    getOrderRevenueEvents: (...args: any[]) => {
      mockRevenueEvents(...args);
      return revenue.getOrderRevenueEvents(...args);
    },
    ordersQuerySchema: schemas.ordersQuerySchema,
    ResponseBuilder: {
      success: (code: string, data: any) => ({ success: true, code, data }),
      error: (code: string) => ({ success: false, code }),
      validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', e }),
    },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    PerformanceMonitor: { measureQuery: (_name: string, fn: () => any) => fn() },
    parseProductImages: () => [],
  };
});
const mockTopProducts = jest.fn();
const mockTopOutlets = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  computeTopProductsByShop: (...args: any[]) => mockTopProducts(...args),
  computeTopOutletsRanking: (...args: any[]) => mockTopOutlets(...args),
  parseRankingQuery: () => ({ page: 1, limit: 5, sortBy: 'revenue' }),
  resolveAnalyticsOutletFilter: async () => ({ outletId: { in: [1] } }),
  percentChange: (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0),
  buildAnalyticsPeriodReport: jest.fn(async () => ({ series: [], growth: {}, operational: null, topProducts: [], topCustomers: [] })),
  emptyAnalyticsPeriodReport: () => ({ series: [], growth: {} }),
}));
jest.mock('../../apps/api/lib/customer-loyalty', () => ({
  fetchMerchantLoyaltyStatus: jest.fn(async () => 'disabled'),
  fetchCustomerLoyaltySnapshot: jest.fn(async () => null),
}));

import { GET as todayMetricsGET } from '../../apps/api/app/api/analytics/today-metrics/route';
import { GET as dashboardGET } from '../../apps/api/app/api/analytics/dashboard/route';
import { GET as growthGET } from '../../apps/api/app/api/analytics/growth-metrics/route';
import { GET as topProductsGET } from '../../apps/api/app/api/analytics/top-products/route';
import { GET as topOutletsGET } from '../../apps/api/app/api/analytics/top-outlets/route';
import { GET as topCustomersGET } from '../../apps/api/app/api/analytics/top-customers/route';
import { GET as overviewGET } from '../../apps/api/app/api/analytics/overview/route';
import { GET as systemGET } from '../../apps/api/app/api/analytics/system/route';
import { GET as recentOrdersGET } from '../../apps/api/app/api/analytics/recent-orders/route';
import { GET as enhancedGET } from '../../apps/api/app/api/analytics/enhanced-dashboard/route';
import { GET as customerOrdersGET } from '../../apps/api/app/api/customers/[id]/orders/route';
import { GET as merchantOrdersGET } from '../../apps/api/app/api/merchants/[id]/orders/route';
import { GET as ordersStatsGET } from '../../apps/api/app/api/orders/stats/route';
import { GET as ordersExportGET } from '../../apps/api/app/api/orders/export/route';
import { GET as calendarOrdersGET } from '../../apps/api/app/api/calendar/orders/route';
import { GET as calendarCountGET } from '../../apps/api/app/api/calendar/orders/count/route';

const merchant = { user: { id: 2, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const admin = { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} };
const req = (path: string): any => ({ url: `http://localhost${path}`, headers: { get: () => null } });

const vnDay = (from: string, to = from) => ({
  gte: new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 7 * 3600_000),
  lte: new Date(new Date(`${to}T23:59:59.999Z`).getTime() - 7 * 3600_000),
});
const VN_TODAY_START = new Date('2026-10-02T17:00:00.000Z'); // 3 Oct 00:00 VN

function at(instant: string) {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(new Date(instant));
}

beforeEach(() => {
  jest.clearAllMocks();
  at('2026-10-02T17:30:00Z');
  ctx = merchant;
  mockDb.orders.search.mockResolvedValue({ total: 0, data: [] });
  mockDb.orders.getStats.mockResolvedValue(0);
  mockDb.orders.findManyLightweight.mockResolvedValue({ data: [], total: 0 });
  mockDb.orders.searchWithItems.mockResolvedValue({ data: [], total: 0 });
  mockDb.orders.getStatistics.mockResolvedValue({ totalOrders: 0, totalRevenue: 0, statusBreakdown: {} });
  mockDb.merchants.findById.mockResolvedValue({ id: 2, outlets: [{ id: 1 }] });
  mockDb.merchants.count.mockResolvedValue(0);
  mockDb.outlets.findById.mockResolvedValue({ id: 1, name: 'Shop 1', merchantId: 2 });
  mockDb.outlets.count.mockResolvedValue(0);
  mockDb.users.count.mockResolvedValue(0);
  mockDb.products.count.mockResolvedValue(0);
  mockDb.customers.getStats.mockResolvedValue(0);
  mockDb.customers.findById.mockResolvedValue({ id: 10, firstName: 'Lan', lastName: 'Ng', merchantId: 2 });
  mockDb.outletStock.aggregate.mockResolvedValue({ _sum: {} });
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });
  mockTopProducts.mockResolvedValue({ items: [] });
  mockTopOutlets.mockResolvedValue({ items: [] });
});

afterEach(() => jest.useRealTimers());

const searchWheres = () => mockDb.orders.search.mock.calls.map((c: any[]) => c[0].where ?? c[0]);

describe('"today" is the Vietnam day (API-3, API-4, API-13)', () => {
  it('today-metrics counts orders of Vietnam today', async () => {
    await todayMetricsGET(req('/api/analytics/today-metrics'));
    expect(searchWheres()[0].createdAt).toEqual(vnDay('2026-10-03'));
  });

  it('dashboard period=today uses Vietnam today', async () => {
    await dashboardGET(req('/api/analytics/dashboard?period=today'));
    expect(mockDb.orders.getStats.mock.calls[0][0].createdAt).toEqual(vnDay('2026-10-03'));
  });

  it('enhanced-dashboard todayPickups stop at the end of the range', async () => {
    await enhancedGET(req('/api/analytics/enhanced-dashboard?startDate=2026-10-02&endDate=2026-10-02'));
    const pickups = searchWheres().find((w: any) => w.pickedUpAt);
    expect(pickups.pickedUpAt).toEqual(vnDay('2026-10-02'));
  });
});

describe('one overdue rule: PICKUPED and returnPlanAt before Vietnam today (API-12)', () => {
  it('today-metrics', async () => {
    await todayMetricsGET(req('/api/analytics/today-metrics'));
    const overdue = searchWheres().find((w: any) => w.returnPlanAt);
    expect(overdue.status).toBe('PICKUPED');
    expect(overdue.returnPlanAt).toEqual({ not: null, lt: VN_TODAY_START });
  });

  it('orders/stats', async () => {
    await ordersStatsGET(req('/api/orders/stats'));
    const overdue = searchWheres().find((w: any) => w.returnPlanAt);
    expect(overdue.status).toBe('PICKUPED');
    expect(overdue.returnPlanAt).toEqual({ not: null, lt: VN_TODAY_START });
  });

  it('calendar/orders/count late returns', async () => {
    await calendarCountGET(req('/api/calendar/orders/count?from=2026-10-01&to=2026-10-31'));
    const late = mockDb.orders.getStats.mock.calls.find((c: any[]) => c[0]?.returnPlanAt)[0];
    expect(late.status).toBe('PICKUPED');
    expect(late.returnPlanAt.lt).toEqual(VN_TODAY_START);
  });
});

describe('growth-metrics compares Vietnam months (API-5, ADM-8)', () => {
  it('a month range and the previous month', async () => {
    await growthGET(req('/api/analytics/growth-metrics?startDate=2026-10-01&endDate=2026-10-31'));
    const [current, previous] = searchWheres();
    expect(current.createdAt).toEqual(vnDay('2026-10-01', '2026-10-31'));
    expect(previous.createdAt).toEqual(vnDay('2026-09-01', '2026-09-30'));
  });

  it('a year range and the previous year', async () => {
    await growthGET(req('/api/analytics/growth-metrics?startDate=2026-01-01&endDate=2026-12-31'));
    const [current, previous] = searchWheres();
    expect(current.createdAt).toEqual(vnDay('2026-01-01', '2026-12-31'));
    expect(previous.createdAt).toEqual(vnDay('2025-01-01', '2025-12-31'));
  });

  it('default: this Vietnam month so far against the whole previous one', async () => {
    at('2026-10-31T17:30:00Z'); // 1 Nov 00:30 in Vietnam
    await growthGET(req('/api/analytics/growth-metrics'));
    const [current, previous] = searchWheres();
    expect(current.createdAt.gte).toEqual(new Date('2026-10-31T17:00:00.000Z'));
    expect(current.createdAt.lte).toEqual(new Date('2026-11-01T16:59:59.999Z'));
    expect(previous.createdAt).toEqual(vnDay('2026-10-01', '2026-10-31'));
  });
});

describe('rankings on Vietnam days (API-6 / ADM-2, API-7)', () => {
  it('top-products', async () => {
    await topProductsGET(req('/api/analytics/top-products?startDate=2026-10-02&endDate=2026-10-02'));
    const { rangeStart, rangeEnd } = mockTopProducts.mock.calls[0][1];
    expect({ gte: rangeStart, lte: rangeEnd }).toEqual(vnDay('2026-10-02'));
  });

  it('top-outlets', async () => {
    await topOutletsGET(req('/api/analytics/top-outlets?startDate=2026-10-01&endDate=2026-10-31'));
    const { rangeStart, rangeEnd } = mockTopOutlets.mock.calls[0][1];
    expect({ gte: rangeStart, lte: rangeEnd }).toEqual(vnDay('2026-10-01', '2026-10-31'));
  });

  it('top-customers with a range', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 1, customerId: 10, orderType: 'SALE', status: 'COMPLETED', totalAmount: 100, createdAt: new Date('2026-10-01T17:30:00Z') },
    ]);
    await topCustomersGET(req('/api/analytics/top-customers?startDate=2026-10-02&endDate=2026-10-02'));
    const [, start, end] = mockRevenueEvents.mock.calls[0];
    expect({ gte: start, lte: end }).toEqual(vnDay('2026-10-02'));
  });

  it('top-customers default: the last 30 Vietnam days up to the end of Vietnam today', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 1, customerId: 10, orderType: 'SALE', status: 'COMPLETED', totalAmount: 100, createdAt: new Date('2026-10-01T17:30:00Z') },
    ]);
    await topCustomersGET(req('/api/analytics/top-customers'));
    const [, start, end] = mockRevenueEvents.mock.calls[0];
    expect({ gte: start, lte: end }).toEqual(vnDay('2026-09-03', '2026-10-03'));
  });
});

describe('admin system analytics and recent orders (API-15 / ADM-3)', () => {
  it('a one-day range is the whole Vietnam day and buckets by Vietnam day', async () => {
    ctx = admin;
    const res: any = await systemGET(req('/api/analytics/system?startDate=2026-10-02&endDate=2026-10-02&groupBy=day'));
    const newMerchants = mockDb.merchants.count.mock.calls[2][0].where.createdAt;
    expect(newMerchants).toEqual(vnDay('2026-10-02'));
    expect(res.body.data.merchantTrends.map((t: any) => t.month)).toEqual(['Oct 2']);
    const trendNew = mockDb.merchants.count.mock.calls.find(
      (c: any[]) => c[0].where.createdAt?.gte && c[0].where.createdAt?.lte && c !== mockDb.merchants.count.mock.calls[2]
    )[0].where.createdAt;
    expect(trendNew).toEqual(vnDay('2026-10-02'));
  });

  it('month buckets cover each Vietnam month with its label', async () => {
    ctx = admin;
    const res: any = await systemGET(req('/api/analytics/system?startDate=2026-01-01&endDate=2026-03-31&groupBy=month'));
    expect(res.body.data.merchantTrends.map((t: any) => t.month)).toEqual(['Jan', 'Feb', 'Mar']);
    expect(mockDb.merchants.count.mock.calls[2][0].where.createdAt).toEqual(vnDay('2026-01-01', '2026-03-31'));
  });

  it('this year starts on 1 Jan in Vietnam', async () => {
    ctx = admin;
    at('2026-12-31T17:30:00Z'); // 1 Jan 2027 in Vietnam
    await systemGET(req('/api/analytics/system?startDate=2027-01-01&endDate=2027-01-01'));
    expect(mockDb.merchants.count.mock.calls[3][0].where.createdAt.gte).toEqual(new Date('2026-12-31T17:00:00.000Z'));
  });

  it('recent-orders includes the whole end day', async () => {
    await recentOrdersGET(req('/api/analytics/recent-orders?startDate=2026-10-02&endDate=2026-10-02'));
    expect(searchWheres()[0].createdAt).toEqual(vnDay('2026-10-02'));
  });
});

describe('list and aggregate agree (API-8, API-10)', () => {
  it('overview statistics get the Vietnam days of the range', async () => {
    await overviewGET(req('/api/analytics/overview?startDate=2026-10-01&endDate=2026-10-31'));
    const { startDate, endDate } = mockDb.orders.getStatistics.mock.calls[0][0];
    expect({ gte: startDate, lte: endDate }).toEqual(vnDay('2026-10-01', '2026-10-31'));
  });

  it('customers/[id]/orders: the money total uses the same Vietnam days as the list', async () => {
    await customerOrdersGET(req('/api/customers/10/orders?startDate=2026-10-02&endDate=2026-10-02'), { params: { id: '10' } });
    const filters = mockDb.orders.search.mock.calls[0][0];
    expect({ gte: filters.startDate, lte: filters.endDate }).toEqual(vnDay('2026-10-02'));
    expect(mockPrisma.order.aggregate.mock.calls[0][0].where.createdAt).toEqual(vnDay('2026-10-02'));
  });

  it('merchants/[id]/orders passes the Vietnam days', async () => {
    ctx = admin;
    await merchantOrdersGET(req('/api/merchants/2/orders?startDate=2026-10-02&endDate=2026-10-02'), { params: { id: '2' } });
    const filters = mockDb.orders.search.mock.calls[0][0];
    expect({ gte: filters.startDate, lte: filters.endDate }).toEqual(vnDay('2026-10-02'));
  });
});

describe('orders export = list (API-9 / WEB-1)', () => {
  it('rows of the Vietnam days, soft-deleted orders left out like the list', async () => {
    const res: any = await ordersExportGET(
      req('/api/orders/export?format=csv&period=custom&startDate=2026-10-02&endDate=2026-10-02&dateField=createdAt')
    );
    const where = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toEqual(vnDay('2026-10-02'));
    expect(where.deletedAt).toBeNull();
    expect(res.headers['Content-Disposition']).toContain('orders-export-2026-10-03.csv');
  });

  it('cells show Vietnam time', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { orderNumber: '123456', orderType: 'RENT', status: 'RESERVED', createdAt: new Date('2026-10-01T17:30:00Z'), pickupPlanAt: new Date('2026-10-01T17:00:00Z'), returnPlanAt: new Date('2026-10-03T16:59:59Z') },
    ]);
    const res: any = await ordersExportGET(req('/api/orders/export?format=csv&period=custom&startDate=2026-10-02&endDate=2026-10-02'));
    expect(res.body).toContain('"02/10/26 00:30:00"');
    expect(res.body).toContain('"02/10/26 00:00:00"');
    expect(res.body).toContain('"03/10/26 23:59:59"');
  });
});

describe('calendar ranges (API-14, API-16)', () => {
  it('calendar/orders meta.dateRange is the requested Vietnam days', async () => {
    mockDb.orders.searchWithItems.mockResolvedValue({ data: [], total: 0 });
    const res: any = await calendarOrdersGET(req('/api/calendar/orders?startDate=2026-10-01&endDate=2026-10-31'));
    expect(res.body.meta.dateRange).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });

  it('calendar/orders/count month without year uses the Vietnam year', async () => {
    at('2026-12-31T17:30:00Z'); // 1 Jan 2027 in Vietnam
    const res: any = await calendarCountGET(req('/api/calendar/orders/count?month=1'));
    expect(res.body.data.filters.from).toBe('2027-01-01');
    expect(res.body.data.filters.to).toBe('2027-01-31');
  });
});
