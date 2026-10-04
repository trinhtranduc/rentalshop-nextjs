/**
 * #355 — analytics routes, the dashboard and the order list read `YYYY-MM-DD` as Vietnam civil days.
 * Orders: D 30 Sep 23:59:59 VN · C 1 Oct 00:00 VN (month edge) · A 1 Oct 23:59:59 VN · B 2 Oct 00:00 VN.
 * Must give the same results under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  orders: { search: jest.fn(), getStats: jest.fn(), findManyLightweight: jest.fn() },
  merchants: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
  products: { findById: jest.fn() },
  outletStock: { aggregate: jest.fn() },
};
const mockPrisma: any = { order: { findMany: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => {
  const date = jest.requireActual('../../packages/utils/src/core/date');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  const revenue = jest.requireActual('../../packages/utils/src/core/revenue-calculator');
  const schemas = jest.requireActual('../../packages/utils/src/core/validation-schemas');
  return {
    ...date,
    ...dateRange,
    ...revenue,
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
const mockBuildReport = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  buildAnalyticsPeriodReport: (...args: any[]) => mockBuildReport(...args),
  emptyAnalyticsPeriodReport: () => ({}),
  resolveAnalyticsOutletFilter: async () => ({ outletId: { in: [1] } }),
  checkPlanLimitIfNeeded: jest.fn(),
  createAuditHelper: () => ({}),
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
}));
jest.mock('@rentalshop/loyalty', () => ({
  calculateAmountDue: jest.fn(),
  handleLoyaltyOnOrderCreate: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn(),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));

import { GET as dashboardGET } from '../../apps/api/app/api/analytics/enhanced-dashboard/route';
import { GET as periodGET } from '../../apps/api/app/api/analytics/period/route';
import { GET as incomeGET } from '../../apps/api/app/api/analytics/income/route';
import { GET as dailyGET } from '../../apps/api/app/api/analytics/income/daily/route';
import { GET as incomeOrdersGET } from '../../apps/api/app/api/analytics/income/orders/route';
import { GET as orderAnalyticsGET } from '../../apps/api/app/api/analytics/orders/route';
import { GET as ordersGET } from '../../apps/api/app/api/orders/route';

const merchant = { user: { id: 2, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const req = (path: string): any => ({ url: `http://localhost${path}`, headers: { get: () => null } });

function sale(id: number, createdAt: string, totalAmount: number) {
  return {
    id,
    orderNumber: `ORD-1-${id}`,
    orderType: 'SALE',
    status: 'COMPLETED',
    totalAmount,
    depositAmount: 0,
    securityDeposit: 0,
    damageFee: 0,
    outletId: 1,
    customerId: null,
    customer: null,
    outlet: { id: 1, name: 'Shop 1' },
    createdAt: new Date(createdAt),
    pickedUpAt: null,
    returnedAt: null,
    pickupPlanAt: null,
    returnPlanAt: null,
    updatedAt: new Date(createdAt),
  };
}
const D = sale(4, '2026-09-30T16:59:59Z', 7);
const C = sale(3, '2026-09-30T17:00:00Z', 50);
const A = sale(1, '2026-10-01T16:59:59Z', 100);
const B = sale(2, '2026-10-01T17:00:00Z', 200);
const ORDERS = [A, B, C, D];

const vnDay = (from: string, to = from) => ({
  gte: new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 7 * 3600_000),
  lte: new Date(new Date(`${to}T23:59:59.999Z`).getTime() - 7 * 3600_000),
});

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  mockDb.orders.search.mockResolvedValue({ total: 0, data: [] });
  mockDb.orders.getStats.mockResolvedValue(0);
  mockDb.orders.findManyLightweight.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
  mockDb.merchants.findById.mockResolvedValue({ id: 2, outlets: [{ id: 1 }] });
  mockDb.outlets.findById.mockResolvedValue({ id: 1, name: 'Shop 1', merchantId: 2 });
  mockDb.outletStock.aggregate.mockResolvedValue({ _sum: {} });
  mockPrisma.order.findMany.mockImplementation(async (args: any) => (args?.select?.orderNumber ? ORDERS : []));
  mockBuildReport.mockResolvedValue({ ok: true });
});

describe('GET /api/analytics/enhanced-dashboard (#355)', () => {
  it('one Vietnam day, the previous Vietnam month, pickups from Vietnam midnight', async () => {
    const res: any = await dashboardGET(req('/api/analytics/enhanced-dashboard?startDate=2026-10-02&endDate=2026-10-02'));
    expect(res.status).toBe(200);
    const wheres = mockDb.orders.search.mock.calls.map((c: any[]) => c[0].where);
    expect(wheres[0].createdAt).toEqual(vnDay('2026-10-02'));
    // comparison: September in Vietnam
    expect(wheres[2].createdAt).toEqual(vnDay('2026-09-01', '2026-09-30'));
    const pickups = wheres.find((w: any) => w.pickedUpAt);
    expect(pickups.pickedUpAt.gte).toEqual(new Date('2026-10-01T17:00:00.000Z'));
  });

  it('a year range compares with the previous Vietnam year', async () => {
    await dashboardGET(req('/api/analytics/enhanced-dashboard?startDate=2026-01-01&endDate=2026-12-31'));
    const wheres = mockDb.orders.search.mock.calls.map((c: any[]) => c[0].where);
    expect(wheres[0].createdAt).toEqual(vnDay('2026-01-01', '2026-12-31'));
    expect(wheres[2].createdAt).toEqual(vnDay('2025-01-01', '2025-12-31'));
  });

  it('rejects an unknown time zone', async () => {
    const res: any = await dashboardGET(req('/api/analytics/enhanced-dashboard?startDate=2026-10-02&endDate=2026-10-02&timeZone=Mars/Base'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/analytics/period (#355)', () => {
  it('passes the Vietnam zone by default and a valid zone when sent', async () => {
    await periodGET(req('/api/analytics/period?startDate=2026-10-01&endDate=2026-10-31'));
    expect(mockBuildReport.mock.calls[0][2]).toEqual(
      expect.objectContaining({ startDate: '2026-10-01', endDate: '2026-10-31', groupBy: 'day', timeZone: 'Asia/Ho_Chi_Minh' })
    );
    await periodGET(req('/api/analytics/period?startDate=2026-10-01&endDate=2026-10-31&timeZone=Asia/Tokyo'));
    expect(mockBuildReport.mock.calls[1][2]).toEqual(expect.objectContaining({ timeZone: 'Asia/Tokyo' }));
  });

  it('rejects an unknown time zone', async () => {
    const res: any = await periodGET(req('/api/analytics/period?startDate=2026-10-01&endDate=2026-10-31&timeZone=Mars/Base'));
    expect(res.status).toBe(400);
    expect(mockBuildReport).not.toHaveBeenCalled();
  });
});

describe('GET /api/analytics/income (#355)', () => {
  it('groupBy=day: buckets are Vietnam days, labels keep their formats', async () => {
    const res: any = await incomeGET(req('/api/analytics/income?startDate=2026-10-01&endDate=2026-10-02&groupBy=day'));
    expect(res.status).toBe(200);
    const points = res.body.data;
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual(
      expect.objectContaining({ month: '01/10/26', date: '2026/10/01', dateISO: '2026-10-01T00:00:00.000Z', dayNumber: 1, realIncome: 150 })
    );
    expect(points[1]).toEqual(expect.objectContaining({ date: '2026/10/02', dayNumber: 2, realIncome: 200 }));
    const firstWindow = mockPrisma.order.findMany.mock.calls[0][0].where.OR[0].createdAt;
    expect(firstWindow).toEqual(vnDay('2026-10-01'));
  });

  it('groupBy=month: October is the Vietnam month', async () => {
    const res: any = await incomeGET(req('/api/analytics/income?startDate=2026-10-01&endDate=2026-10-31&groupBy=month'));
    const points = res.body.data;
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(expect.objectContaining({ month: '10/26', monthNumber: 10, year: 2026, realIncome: 350 }));
    expect(mockPrisma.order.findMany.mock.calls[0][0].where.OR[0].createdAt).toEqual(vnDay('2026-10-01', '2026-10-31'));
  });
});

describe('GET /api/analytics/income/daily (#355)', () => {
  it('one Vietnam day counts the order made at 00:00 Vietnam time', async () => {
    const res: any = await dailyGET(req('/api/analytics/income/daily?startDate=2026-10-02&endDate=2026-10-02'));
    expect(res.status).toBe(200);
    const { days, summary } = res.body.data;
    expect(days.map((d: any) => [d.date, d.dateISO, d.newOrderCount, d.totalRevenue])).toEqual([
      ['2026/10/02', '2026-10-02T00:00:00.000Z', 1, 200],
    ]);
    expect(summary.orderCounts.new).toBe(1);
  });

  it('a range keeps every order once, on its Vietnam day', async () => {
    const res: any = await dailyGET(req('/api/analytics/income/daily?startDate=2026-09-30&endDate=2026-10-02'));
    const { days, summary } = res.body.data;
    expect(days.map((d: any) => [d.date, d.totalRevenue])).toEqual([
      ['2026/09/30', 7],
      ['2026/10/01', 150],
      ['2026/10/02', 200],
    ]);
    expect(summary.totalRevenue).toBe(357);
  });
});

describe('GET /api/analytics/income/orders (#355)', () => {
  it('lists the orders of the Vietnam day', async () => {
    const res: any = await incomeOrdersGET(req('/api/analytics/income/orders?startDate=2026-10-01&endDate=2026-10-01&plan=false'));
    expect(res.status).toBe(200);
    const { days } = res.body.data;
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026/10/01');
    expect(days[0].orders.map((o: any) => o.id).sort()).toEqual([1, 3]);
  });
});

describe('GET /api/analytics/orders (#355)', () => {
  it('filters and groups by Vietnam day', async () => {
    mockDb.orders.search.mockResolvedValue({ total: 3, data: [A, B, C] });
    const res: any = await orderAnalyticsGET(req('/api/analytics/orders?startDate=2026-10-01&endDate=2026-10-02&groupBy=day'));
    expect(mockDb.orders.search.mock.calls[0][0].where.createdAt).toEqual(vnDay('2026-10-01', '2026-10-02'));
    expect(res.body.data.map((p: any) => [p.period, p.count])).toEqual([
      ['2026/10/01', 2],
      ['2026/10/02', 1],
    ]);
  });

  it('groups by Vietnam month', async () => {
    mockDb.orders.search.mockResolvedValue({ total: 2, data: [C, D] });
    const res: any = await orderAnalyticsGET(req('/api/analytics/orders?startDate=2026-09-01&endDate=2026-10-31&groupBy=month'));
    expect(res.body.data.map((p: any) => [p.period, p.count])).toEqual([
      ['2026/09', 1],
      ['2026/10', 1],
    ]);
  });
});

describe('GET /api/orders date filter (#355)', () => {
  it('a day key is the Vietnam day', async () => {
    await ordersGET(req('/api/orders?startDate=2026-10-02&endDate=2026-10-02'));
    const filters = mockDb.orders.findManyLightweight.mock.calls[0][0];
    expect([filters.startDate, filters.endDate, filters.exactDateRange]).toEqual([
      new Date('2026-10-01T17:00:00.000Z'),
      new Date('2026-10-02T16:59:59.999Z'),
      true,
    ]);
  });

  it('an ISO instant filters the Vietnam day that contains it', async () => {
    // iOS sends local midnight as an instant: 2 Oct 00:00 VN
    await ordersGET(req('/api/orders?startDate=2026-10-01T17:00:00.000Z&endDate=2026-10-02T16:59:59.000Z'));
    const filters = mockDb.orders.findManyLightweight.mock.calls[0][0];
    expect([filters.startDate, filters.endDate, filters.exactDateRange]).toEqual([
      new Date('2026-10-01T17:00:00.000Z'),
      new Date('2026-10-02T16:59:59.999Z'),
      true,
    ]);
  });

  it('a valid timeZone is used; an unknown one is rejected', async () => {
    await ordersGET(req('/api/orders?startDate=2026-10-02&endDate=2026-10-02&timeZone=Asia/Tokyo'));
    expect(mockDb.orders.findManyLightweight.mock.calls[0][0].startDate).toEqual(new Date('2026-10-01T15:00:00.000Z'));
    const res: any = await ordersGET(req('/api/orders?startDate=2026-10-02&timeZone=Mars/Base'));
    expect(res.status).toBe(400);
  });
});
