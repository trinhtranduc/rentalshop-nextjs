/**
 * #389 — GET /api/orders, additive for the mobile orders tab (#401 gaps):
 * - rows carry `amountDue` / `refundDue`;
 * - `sortBy=nearestTask` reaches the query;
 * - `dateField=pickupPlanAt|returnPlanAt` + day keys filter planned dates by Vietnam civil days;
 * - requests without the new values keep their old meaning; merchant / outlet scope is unchanged.
 * Run with TZ=UTC and TZ=Asia/Ho_Chi_Minh: the bounds must be identical.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
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
};
const mockPrisma: any = { payment: { groupBy: jest.fn() } };
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
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));
jest.mock('../../apps/api/lib/analytics-days', () => ({
  readAnalyticsTimeZone: (params: URLSearchParams) => params.get('timeZone') || 'Asia/Ho_Chi_Minh',
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { GET } from '../../apps/api/app/api/orders/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const staff = { user: { id: 9, role: 'OUTLET_STAFF', email: 's@x' }, userScope: { merchantId: 2, outletId: 3 } };
const req = (query: string): any => ({ url: `http://localhost/api/orders${query}` });
const filters = () => mockDb.orders.findManyLightweight.mock.calls[0][0];

describe('GET /api/orders phase 8 (#389)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.orders.findManyLightweight.mockResolvedValue({ data: rows, total: 3, page: 1, limit: 50 });
    mockPrisma.payment.groupBy.mockResolvedValue([
      { orderId: 1, notes: 'PICKUP', _sum: { amount: 200000 } },
      { orderId: 3, notes: 'PICKUP', _sum: { amount: 100000 } },
    ]);
  });

  it('adds amountDue and refundDue to every row (CANCELLED owes nothing)', async () => {
    const res: any = await GET(req(''));
    expect(res.status).toBe(200);
    expect(res.body.data.orders.map((o: any) => [o.id, o.amountDue, o.refundDue])).toEqual([
      [1, 1000000, 0],
      [2, 0, 400000],
      [3, 0, 0],
    ]);
    expect(mockPrisma.payment.groupBy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.payment.groupBy.mock.calls[0][0].where).toEqual({ orderId: { in: [1, 2, 3] }, status: 'COMPLETED' });
  });

  it('passes sortBy=nearestTask to the query', async () => {
    await GET(req('?sortBy=nearestTask'));
    expect(filters().sortBy).toBe('nearestTask');
  });

  it('rejects an unknown sort as before', async () => {
    const res: any = await GET(req('?sortBy=bogus'));
    expect(res.status).toBe(400);
  });

  it('filters planned pickups by Vietnam civil days', async () => {
    await GET(req('?dateField=pickupPlanAt&startDate=2026-10-01&endDate=2026-10-31'));
    expect(filters()).toMatchObject({
      dateField: 'pickupPlanAt',
      startDate: new Date('2026-09-30T17:00:00.000Z'),
      endDate: new Date('2026-10-31T16:59:59.999Z'),
      exactDateRange: true,
    });
  });

  it('filters planned returns by one Vietnam day', async () => {
    await GET(req('?dateField=returnPlanAt&startDate=2026-10-04&endDate=2026-10-04'));
    expect(filters()).toMatchObject({
      dateField: 'returnPlanAt',
      startDate: new Date('2026-10-03T17:00:00.000Z'),
      endDate: new Date('2026-10-04T16:59:59.999Z'),
    });
  });

  it('keeps the old meaning without the new params (createdAt default sort, no dateField)', async () => {
    await GET(req('?startDate=2026-10-04&endDate=2026-10-04'));
    expect(filters()).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc', dateField: undefined });
  });

  it('keeps outlet staff inside their outlet and merchant', async () => {
    ctx = staff;
    await GET(req('?sortBy=nearestTask&outletId=99'));
    expect(filters()).toMatchObject({ merchantId: 2, outletId: 3, sortBy: 'nearestTask' });
  });

  it('keeps a merchant inside its merchant', async () => {
    await GET(req('?sortBy=nearestTask&merchantId=77'));
    expect(filters().merchantId).toBe(2);
  });
});
