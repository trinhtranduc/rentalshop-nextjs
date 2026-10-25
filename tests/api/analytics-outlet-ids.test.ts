/**
 * #827 — optional `outletIds=1,3` on the analytics routes the Tổng quan page reads.
 * MERCHANT: narrows to those outlets; an outlet of another shop → 403 CROSS_MERCHANT_ACCESS_DENIED; malformed → 400.
 * Outlet roles: the param is ignored, they stay on their own outlet. No param: as before (every outlet of the shop).
 * GET /api/analytics/period also takes `byOutlet=1` (rows for the outlets in scope).
 */
jest.mock('next/server', () => {
  const json = (body: any, init?: any) => ({ body, status: init?.status || 200 });
  function NextResponse(this: any, body: any, init?: any) {
    return { body, status: init?.status || 200 };
  }
  (NextResponse as any).json = json;
  return { NextRequest: jest.fn(), NextResponse };
});

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  orders: { search: jest.fn(), getStats: jest.fn(), getStatistics: jest.fn() },
  merchants: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
  customers: { findById: jest.fn() },
};
const mockPrisma: any = { order: { findMany: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => {
  const date = jest.requireActual('../../packages/utils/src/core/date');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  const revenue = jest.requireActual('../../packages/utils/src/core/revenue-calculator');
  const revenueMapping = jest.requireActual('../../packages/utils/src/core/revenue-mapping');
  return {
    ...date,
    ...dateRange,
    ...revenue,
    ...revenueMapping,
    ResponseBuilder: {
      success: (code: string, data: any) => ({ success: true, code, data }),
      error: (code: string) => ({ success: false, code }),
    },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    parseProductImages: () => [],
  };
});

const mockBuildReport = jest.fn();
const mockTopProducts = jest.fn();
jest.mock('@rentalshop/utils/server', () => {
  const report = jest.requireActual('../../packages/utils/src/analytics/period-report');
  return {
    buildAnalyticsPeriodReport: (...args: any[]) => mockBuildReport(...args),
    emptyAnalyticsPeriodReport: report.emptyAnalyticsPeriodReport,
    resolveAnalyticsOutletFilter: report.resolveAnalyticsOutletFilter,
    computeTopProductsByShop: (...args: any[]) => mockTopProducts(...args),
    parseRankingQuery: report.parseRankingQuery,
  };
});

import { GET as periodGET } from '../../apps/api/app/api/analytics/period/route';
import { GET as overviewGET } from '../../apps/api/app/api/analytics/overview/route';
import { GET as topProductsGET } from '../../apps/api/app/api/analytics/top-products/route';
import { GET as topCustomersGET } from '../../apps/api/app/api/analytics/top-customers/route';
import { GET as incomeOrdersGET } from '../../apps/api/app/api/analytics/income/orders/route';

const merchant = { user: { id: 2, role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN' }, userScope: { merchantId: 2, outletId: 4 } };
const req = (path: string): any => ({ url: `http://localhost${path}`, headers: { get: () => null } });
const DAYS = 'startDate=2026-10-06&endDate=2026-10-06';

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.merchants.findById.mockResolvedValue({ id: 2, outlets: [{ id: 2, isActive: true }, { id: 4, isActive: true }, { id: 7, isActive: false }] });
  mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, name: `Outlet ${id}` }));
  mockDb.orders.getStatistics.mockResolvedValue({ totalOrders: 0, totalRevenue: 0, statusBreakdown: {} });
  mockBuildReport.mockResolvedValue({ series: [], growth: {}, operational: null, topProducts: [], topCustomers: [] });
  mockTopProducts.mockResolvedValue({ items: [], page: 1, limit: 5, total: 0, totalPages: 1 });
  mockPrisma.order.findMany.mockResolvedValue([]);
});

const reportParams = () => mockBuildReport.mock.calls[0][2];

describe('GET /api/analytics/period', () => {
  it('no outletIds: every outlet of the shop, no byOutlet', async () => {
    ctx = merchant;
    const res: any = await periodGET(req(`/api/analytics/period?${DAYS}`));
    expect(res.status).toBe(200);
    expect(reportParams().outletFilter).toEqual({ outletId: { in: [2, 4, 7] } });
    expect(reportParams().byOutletIds).toBeUndefined();
  });

  it('merchant: narrowed to the selected outlets, byOutlet for them', async () => {
    ctx = merchant;
    await periodGET(req(`/api/analytics/period?${DAYS}&outletIds=4,7&byOutlet=1`));
    expect(reportParams().outletFilter).toEqual({ outletId: { in: [4, 7] } });
    expect(reportParams().byOutletIds).toEqual([4, 7]);
  });

  it("merchant: another shop's outlet → 403, nothing computed", async () => {
    ctx = merchant;
    const res: any = await periodGET(req(`/api/analytics/period?${DAYS}&outletIds=2,99`));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CROSS_MERCHANT_ACCESS_DENIED');
    expect(mockBuildReport).not.toHaveBeenCalled();
  });

  it('malformed outletIds → 400', async () => {
    ctx = merchant;
    const res: any = await periodGET(req(`/api/analytics/period?${DAYS}&outletIds=2,abc`));
    expect(res.status).toBe(400);
    expect(mockBuildReport).not.toHaveBeenCalled();
  });

  it('outlet admin: outletIds ignored, own outlet only; byOutlet is its one row', async () => {
    ctx = outletAdmin;
    const res: any = await periodGET(req(`/api/analytics/period?${DAYS}&outletIds=2&byOutlet=1`));
    expect(res.status).toBe(200);
    expect(reportParams().outletFilter).toEqual({ outletId: 4 });
    expect(reportParams().byOutletIds).toEqual([4]);
  });
});

describe('GET /api/analytics/overview', () => {
  it('merchant: narrowed', async () => {
    ctx = merchant;
    await overviewGET(req(`/api/analytics/overview?${DAYS}&outletIds=2`));
    expect(reportParams().outletFilter).toEqual({ outletId: { in: [2] } });
  });

  it("merchant: another shop's outlet → 403", async () => {
    ctx = merchant;
    const res: any = await overviewGET(req(`/api/analytics/overview?${DAYS}&outletIds=99`));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/top-products', () => {
  it('merchant: narrowed; foreign → 403; outlet role ignores it', async () => {
    ctx = merchant;
    await topProductsGET(req(`/api/analytics/top-products?${DAYS}&outletIds=4`));
    expect(mockTopProducts.mock.calls[0][1].outletFilter).toEqual({ outletId: { in: [4] } });

    const res: any = await topProductsGET(req(`/api/analytics/top-products?${DAYS}&outletIds=99`));
    expect(res.status).toBe(403);

    ctx = outletAdmin;
    await topProductsGET(req(`/api/analytics/top-products?${DAYS}&outletIds=2`));
    expect(mockTopProducts.mock.calls[1][1].outletFilter).toEqual({ outletId: 4 });
  });
});

describe('GET /api/analytics/top-customers', () => {
  const where = () => mockPrisma.order.findMany.mock.calls[0][0].where;

  it('no outletIds: every outlet of the shop', async () => {
    ctx = merchant;
    await topCustomersGET(req(`/api/analytics/top-customers?${DAYS}`));
    expect(where().outletId).toEqual({ in: [2, 4, 7] });
  });

  it('merchant: narrowed', async () => {
    ctx = merchant;
    await topCustomersGET(req(`/api/analytics/top-customers?${DAYS}&outletIds=2`));
    expect(where().outletId).toEqual({ in: [2] });
  });

  it("merchant: another shop's outlet → 403", async () => {
    ctx = merchant;
    const res: any = await topCustomersGET(req(`/api/analytics/top-customers?${DAYS}&outletIds=99`));
    expect(res.status).toBe(403);
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('outlet admin: own outlet, param ignored', async () => {
    ctx = outletAdmin;
    await topCustomersGET(req(`/api/analytics/top-customers?${DAYS}&outletIds=2`));
    expect(where().outletId).toBe(4);
  });
});

describe('GET /api/analytics/income/orders', () => {
  const wheres = () => mockPrisma.order.findMany.mock.calls.map((c: any[]) => c[0].where.outletId);

  it('no outletIds: every outlet of the shop', async () => {
    ctx = merchant;
    const res: any = await incomeOrdersGET(req(`/api/analytics/income/orders?${DAYS}&status=new`));
    expect(res.status).toBe(200);
    expect(wheres()).toEqual([{ in: [2, 4, 7] }]);
  });

  it('merchant: every query narrowed (events and expected rows)', async () => {
    ctx = merchant;
    await incomeOrdersGET(req(`/api/analytics/income/orders?${DAYS}&status=all&outletIds=4`));
    expect(wheres().length).toBeGreaterThan(1);
    for (const w of wheres()) expect(w).toEqual({ in: [4] });
  });

  it("merchant: another shop's outlet → 403", async () => {
    ctx = merchant;
    const res: any = await incomeOrdersGET(req(`/api/analytics/income/orders?${DAYS}&outletIds=99`));
    expect(res.status).toBe(403);
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('outlet admin: own outlet, param ignored', async () => {
    ctx = outletAdmin;
    await incomeOrdersGET(req(`/api/analytics/income/orders?${DAYS}&status=new&outletIds=2`));
    expect(wheres()).toEqual([4]);
  });
});
