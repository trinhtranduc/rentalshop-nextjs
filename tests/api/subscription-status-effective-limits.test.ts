/**
 * #782 gap 4: GET /api/subscriptions/status gains `effectiveLimits`, `addonLimits`, `usage.orders`. Additive: `limits`
 * and the other `usage` keys stay exactly as they were, for installed apps. A read failure leaves the new fields out.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
let mockUser: any = { id: 1, role: 'MERCHANT' };
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, { user: mockUser, userScope: { merchantId: 7 } }),
}));
const mockMerchants = { findById: jest.fn() };
jest.mock('@rentalshop/database', () => ({ db: { merchants: mockMerchants }, prisma: {} }));
const mockGetPlanLimitsInfo = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({ getPlanLimitsInfo: (id: number) => mockGetPlanLimitsInfo(id) }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/subscriptions/status/route';

const PLAN_LIMITS = { outlets: 1, users: 2, products: 3000, customers: 3000, orders: 3000, allowWebAccess: true };
const merchant = {
  id: 7,
  name: 'Shop',
  email: 'shop@x',
  _count: { outlets: 1, users: 2, products: 2950, customers: 1204, orders: 2980 },
  subscription: {
    id: 70,
    status: 'ACTIVE',
    amount: 79000,
    currency: 'VND',
    interval: 'month',
    intervalCount: 1,
    currentPeriodStart: new Date(Date.now() - 16 * 86400000),
    currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
    plan: { id: 2, name: 'Basic', basePrice: 79000, currency: 'VND', limits: JSON.stringify(PLAN_LIMITS), features: '[]' },
  },
};
const info = {
  planLimits: { outlets: 2, users: 2, products: 3100, customers: 3000, orders: 3500 },
  basePlanLimits: { outlets: 1, users: 2, products: 3000, customers: 3000, orders: 3000 },
  addonLimits: { outlets: 1, users: 0, products: 100, customers: 0, orders: 500 },
  currentCounts: { outlets: 1, users: 2, products: 2950, customers: 1204, orders: 2980 },
};
const call = async () => (await GET({ url: 'http://x/api/subscriptions/status' } as any)) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 1, role: 'MERCHANT' };
  mockMerchants.findById.mockResolvedValue(merchant);
  mockGetPlanLimitsInfo.mockResolvedValue(info);
});

describe('GET /api/subscriptions/status new fields (#782)', () => {
  it('adds effectiveLimits, addonLimits and usage.orders', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(mockGetPlanLimitsInfo).toHaveBeenCalledWith(7);
    expect(res.body.data.effectiveLimits).toEqual(info.planLimits);
    expect(res.body.data.addonLimits).toEqual(info.addonLimits);
    expect(res.body.data.usage.orders).toBe(2980);
  });

  it('`limits` stays the plan limits, unchanged by an add-on', async () => {
    const res = await call();
    expect(res.body.data.limits).toEqual(PLAN_LIMITS);
    expect(res.body.data.usage).toMatchObject({ outlets: 1, users: 2, products: 2950, customers: 1204 });
  });

  it('every old key is still there with the same value', async () => {
    const res = await call();
    mockGetPlanLimitsInfo.mockRejectedValue(new Error('read failed'));
    const without = await call();
    const { effectiveLimits, addonLimits, usage, currentPeriodEnd, statusReason, ...rest } = res.body.data;
    const { usage: oldUsage, currentPeriodEnd: _end, statusReason: _reason, ...oldRest } = without.body.data;
    expect(rest).toEqual(oldRest);
    const { orders, ...usageRest } = usage;
    expect(usageRest).toEqual(oldUsage);
  });

  it('a read failure leaves the new fields out and the screen works as today', async () => {
    mockGetPlanLimitsInfo.mockRejectedValue(new Error('read failed'));
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('effectiveLimits');
    expect(res.body.data).not.toHaveProperty('addonLimits');
    expect(res.body.data.usage).not.toHaveProperty('orders');
    expect(res.body.data.limits).toEqual(PLAN_LIMITS);
    expect(res.body.data.planName).toBe('Basic');
  });

  it('ADMIN without merchantId: same answer as before, no limit read', async () => {
    mockUser = { id: 9, role: 'ADMIN' };
    const res = await call();
    expect(res.body.data.status).toBe('NO_SUBSCRIPTION');
    expect(res.body.data).not.toHaveProperty('effectiveLimits');
    expect(mockGetPlanLimitsInfo).not.toHaveBeenCalled();
  });
});
