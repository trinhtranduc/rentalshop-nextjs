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

const plan = { v: 1, items: [{ key: 'i1', label: 'Cọc 1', type: 'PERCENT', value: 30 }] };
const makeRows = () => [
  { id: 1, orderType: 'RENT', status: 'RESERVED', totalAmount: 1000000, depositAmount: 300000, securityDeposit: 0, lateFee: 0, damageFee: 0, depositPlan: plan },
  { id: 2, orderType: 'RENT', status: 'RESERVED', totalAmount: 1000000, depositAmount: 400000, securityDeposit: 0, lateFee: 0, damageFee: 0, depositPlan: null },
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
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/analytics-days', () => ({
  readAnalyticsTimeZone: (params: URLSearchParams) => params.get('timeZone') || 'Asia/Ho_Chi_Minh',
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { GET } from '../../apps/api/app/api/orders/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const req = (headers: Record<string, string> = {}): any => ({
  url: 'http://localhost/api/orders',
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
});

/** #1222: the list tells a capable client which orders have a deposit plan; old clients get the response they get today */
describe('GET /api/orders deposit plan badge data (#1222)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.orders.findManyLightweight.mockResolvedValue({ data: makeRows(), total: 2, page: 1, limit: 50 });
    mockPrisma.payment.groupBy.mockImplementation(async (args: any) =>
      args.where.notes === 'INSTALLMENT' ? [{ orderId: 1, _sum: { amount: 300000 } }] : []
    );
  });

  it('a capable client gets hasDepositPlan and a slim installmentSummary only for the plan order', async () => {
    const res: any = await GET(req({ 'x-client-capabilities': 'installments' }));
    const [plan1, once] = res.body.data.orders;
    expect(plan1.hasDepositPlan).toBe(true);
    expect(plan1.installmentSummary).toEqual({ collected: 300000, percentCollected: 30 });
    expect(once.hasDepositPlan).toBe(false);
    expect(once.installmentSummary).toBeUndefined();
    expect('depositPlan' in plan1).toBe(false);
  });

  it('reads the plan sums with one grouped query for the page, for plan orders only', async () => {
    await GET(req({ 'x-client-capabilities': 'installments' }));
    const planCalls = mockPrisma.payment.groupBy.mock.calls.filter((c: any[]) => c[0].where.notes === 'INSTALLMENT');
    expect(planCalls).toHaveLength(1);
    expect(planCalls[0][0].where).toMatchObject({ orderId: { in: [1] }, status: 'COMPLETED', notes: 'INSTALLMENT' });
  });

  it('asks the database for depositPlan only for a capable client', async () => {
    await GET(req({ 'x-client-capabilities': 'installments' }));
    expect(mockDb.orders.findManyLightweight.mock.calls[0][0]).toMatchObject({ includeInstallments: true, includeDepositPlan: true });
  });

  it('does not ask for depositPlan for an old client', async () => {
    await GET(req());
    expect(mockDb.orders.findManyLightweight.mock.calls[0][0].includeDepositPlan).toBe(false);
  });

  it('a client without the capability gets the same rows as before: no new key, no extra query', async () => {
    mockDb.orders.findManyLightweight.mockResolvedValue({ data: makeRows().map(({ depositPlan, ...rest }) => rest), total: 2, page: 1, limit: 50 });
    const res: any = await GET(req());
    for (const order of res.body.data.orders) {
      expect(order).not.toHaveProperty('hasDepositPlan');
      expect(order).not.toHaveProperty('installmentSummary');
      expect(order).not.toHaveProperty('depositPlan');
    }
    expect(mockPrisma.payment.groupBy).toHaveBeenCalledTimes(1);
  });

  it('drops depositPlan even if the query returned it for an old client', async () => {
    const res: any = await GET(req());
    for (const order of res.body.data.orders) expect(order).not.toHaveProperty('depositPlan');
  });
});
