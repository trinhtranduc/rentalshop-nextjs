/**
 * #852 — optional `outletIds=1,3` on GET /api/orders and GET /api/orders/export.
 * - MERCHANT: narrows to some of its own outlets; another shop's outlet → 403 CROSS_MERCHANT_ACCESS_DENIED;
 *   malformed → 400 INVALID_QUERY; a single `outletId` still wins; absent = all outlets as before.
 * - Outlet roles ignore it (locked to their outlet).
 * Run with TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  // The export answers `new NextResponse(file)`; the rest answer NextResponse.json
  NextResponse: Object.assign(
    function NextResponse(this: any, body: any, init?: any) {
      return { body, status: init?.status || 200 };
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
  ),
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const rows = [
  { id: 1, orderType: 'RENT', status: 'RESERVED', totalAmount: 1000000, depositAmount: 300000, securityDeposit: 500000, lateFee: 0, damageFee: 0 },
  { id: 2, orderType: 'RENT', status: 'PICKUPED', totalAmount: 800000, depositAmount: 0, securityDeposit: 500000, lateFee: 100000, damageFee: 0 },
  { id: 3, orderType: 'RENT', status: 'CANCELLED', totalAmount: 900000, depositAmount: 0, securityDeposit: 0, lateFee: 0, damageFee: 0 },
];
const mockDb: any = {
  orders: { findManyLightweight: jest.fn() },
  products: { findById: jest.fn() },
  outletOperations: { merchantOutletIds: jest.fn() },
};
const mockPrisma: any = { payment: { groupBy: jest.fn() }, order: { findMany: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => {
  const schemas = jest.requireActual('../../packages/utils/src/core/validation-schemas');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  return {
    ordersQuerySchema: schemas.ordersQuerySchema,
    orderCreateSchema: { safeParse: () => ({ success: false }) },
    orderUpdateSchema: { safeParse: () => ({ success: false }) },
    PricingResolver: {},
    resolveSelectedOption: () => null,
    calculateDurationInUnit: () => ({ duration: 1 }),
    countRentalDays: () => 1,
    getDurationUnitLabel: () => '',
    ResponseBuilder: {
      error: (code: string) => ({ success: false, code }),
      validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
    },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
    parseProductImages: () => [],
    generateStagingKey: jest.fn(),
    generateFileName: jest.fn(),
    splitKeyIntoParts: jest.fn(),
    extractStagingKeysFromUrls: () => [],
    mapStagingUrlsToProductionUrls: (a: any) => a,
    getUtcRangeForDateKeys: dateRange.getUtcRangeForDateKeys,
    toDateKeyInTimeZone: dateRange.toDateKeyInTimeZone,
    PerformanceMonitor: { measureQuery: (_name: string, fn: () => any) => fn() },
    parseDateRangeFromQuery: () => ({ startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-10-11T00:00:00Z') }),
    createExcelWorkbook: () => Buffer.from('xlsx'),
    formatDateForExcel: () => '',
    generateExcelFilename: () => 'orders.xlsx',
    formatDateKeyInTimeZone: () => '2026-10-11',
    SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
  };
});
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  checkPlanLimitIfNeeded: jest.fn(),
  createAuditHelper: () => ({}),
}));
jest.mock('@rentalshop/loyalty', () => ({
  calculateAmountDue: jest.fn(),
  handleLoyaltyOnOrderCreate: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn(),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/analytics-days', () => ({
  readAnalyticsTimeZone: (params: URLSearchParams) => params.get('timeZone') || 'Asia/Ho_Chi_Minh',
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { GET } from '../../apps/api/app/api/orders/route';
import { GET as EXPORT } from '../../apps/api/app/api/orders/export/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const staff = { user: { id: 9, role: 'OUTLET_ADMIN', email: 's@x' }, userScope: { merchantId: 2, outletId: 3 } };
const req = (path: string): any => ({ url: `http://localhost${path}` });
const filters = () => mockDb.orders.findManyLightweight.mock.calls[0][0];
const exportWhere = () => mockPrisma.order.findMany.mock.calls[0][0].where;

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  mockDb.orders.findManyLightweight.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });
  mockDb.outletOperations.merchantOutletIds.mockResolvedValue([3, 4, 7]);
  mockPrisma.payment.groupBy.mockResolvedValue([]);
  mockPrisma.order.findMany.mockResolvedValue([]);
});

describe('GET /api/orders outletIds (#852)', () => {
  it('without outletIds: every outlet of the merchant, as before', async () => {
    const res: any = await GET(req('/api/orders'));
    expect(res.status).toBe(200);
    expect(filters().merchantId).toBe(2);
    expect(filters().outletId).toBeUndefined();
    expect(mockDb.outletOperations.merchantOutletIds).not.toHaveBeenCalled();
  });

  it('merchant narrows to some of its outlets', async () => {
    const res: any = await GET(req('/api/orders?outletIds=7,3,7'));
    expect(res.status).toBe(200);
    expect(filters().merchantId).toBe(2);
    expect(filters().outletId).toEqual({ in: [7, 3] });
    expect(mockDb.outletOperations.merchantOutletIds).toHaveBeenCalledWith(2);
  });

  it("another shop's outlet is refused", async () => {
    const res: any = await GET(req('/api/orders?outletIds=3,99'));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CROSS_MERCHANT_ACCESS_DENIED');
    expect(mockDb.orders.findManyLightweight).not.toHaveBeenCalled();
  });

  it('a malformed list is a 400', async () => {
    const res: any = await GET(req('/api/orders?outletIds=3,,x'));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
  });

  it('a single outletId still wins over outletIds', async () => {
    await GET(req('/api/orders?outletId=4&outletIds=3,7'));
    expect(filters().outletId).toBe(4);
  });

  it('outlet roles ignore outletIds', async () => {
    ctx = staff;
    const res: any = await GET(req('/api/orders?outletIds=4,7'));
    expect(res.status).toBe(200);
    expect(filters().outletId).toBe(3);
    expect(mockDb.outletOperations.merchantOutletIds).not.toHaveBeenCalled();
  });
});

describe('GET /api/orders/export outletIds (#852)', () => {
  it('without outletIds: the merchant scope as before', async () => {
    await EXPORT(req('/api/orders/export?period=1year'));
    expect(exportWhere().outlet).toEqual({ merchantId: 2 });
    expect(exportWhere().outletId).toBeUndefined();
  });

  it('merchant exports some of its outlets', async () => {
    const res: any = await EXPORT(req('/api/orders/export?period=1year&outletIds=4'));
    expect(res.status).toBe(200);
    expect(exportWhere().outlet).toEqual({ merchantId: 2 });
    expect(exportWhere().outletId).toEqual({ in: [4] });
  });

  it("another shop's outlet is refused", async () => {
    const res: any = await EXPORT(req('/api/orders/export?period=1year&outletIds=99'));
    expect(res.status).toBe(403);
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('outlet roles keep their outlet', async () => {
    ctx = staff;
    await EXPORT(req('/api/orders/export?period=1year&outletIds=4'));
    expect(exportWhere().outletId).toBe(3);
  });
});
