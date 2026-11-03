/**
 * #1459 A13 design 5: an extension by the admin while a store plan runs (auto-renewing, or auto-renew off but still in
 * its period) does not take the shop off the store: the channel, auto-renew, product, start and price stay, the extra
 * time joins `storeBonusMs`, so every later store date (renewal, refund) keeps it. No store plan running: A10 (MANUAL).
 * Route: POST /api/admin/subscriptions/[id]/extend. The renew route is covered in subscription-renew-route.test.ts.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockPrisma = {
  subscription: { findUnique: jest.fn(), update: jest.fn() },
  payment: { create: jest.fn() },
  subscriptionActivity: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: { prisma: mockPrisma }, prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/admin/subscriptions/[id]/extend/route';

const DAY = 86400000;
const NOW = new Date('2026-11-03T03:00:00.000Z');
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

function given(over: Record<string, unknown>) {
  mockPrisma.subscription.findUnique.mockResolvedValue({
    id: 70, merchantId: 7, planId: 2, status: 'ACTIVE', amount: 1799000, currency: 'VND', interval: 'annual', intervalCount: 1,
    currentPeriodStart: at(-263), currentPeriodEnd: at(102), cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null,
    billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', autoRenew: true, storeBonusMs: 2 * DAY, billingIssueAt: null,
    ...over,
  });
}
const extend = (months: number) =>
  POST({ json: async () => ({ months, reason: 'Khuyến mãi' }) } as any, { params: { id: '70' } }) as any;
const written = () => mockPrisma.subscription.update.mock.calls[0][0].data;

describe('admin extension and the store credit (A13 design 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    ctx = { user: { id: 1, role: 'ADMIN', email: 'a@x' } };
    mockPrisma.subscription.update.mockImplementation(async ({ data }: any) => ({ id: 70, ...data }));
  });
  afterEach(() => jest.useRealTimers());

  it('auto-renewing App Store plan: 1 month joins the credit; channel, auto-renew, product, start and price stay', async () => {
    given({});
    const res = await extend(1);
    expect(res.status).toBe(200);
    const data = written();
    const added = data.currentPeriodEnd.getTime() - at(102).getTime();
    expect(added).toBeGreaterThanOrEqual(28 * DAY);
    expect(data.storeBonusMs).toBe(2 * DAY + added);
    for (const key of ['billingChannel', 'autoRenew', 'storeProductId', 'currentPeriodStart', 'amount', 'interval']) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it('auto-renew off but still running: also kept on the store', async () => {
    given({ autoRenew: false, cancelAtPeriodEnd: true });
    await extend(1);
    expect(written()).not.toHaveProperty('billingChannel');
    expect(written()).not.toHaveProperty('cancelAtPeriodEnd');
    expect(written().storeBonusMs).toBeGreaterThan(2 * DAY);
  });

  it('a store plan that ended: manual from now (A10)', async () => {
    given({ status: 'EXPIRED', currentPeriodEnd: at(-5) });
    await extend(1);
    expect(written()).toMatchObject({ status: 'ACTIVE', billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, storeBonusMs: null });
  });

  it('a manual plan: manual (A10)', async () => {
    given({ billingChannel: 'MANUAL', storeProductId: null, autoRenew: false, storeBonusMs: null });
    await extend(1);
    expect(written()).toMatchObject({ billingChannel: 'MANUAL', autoRenew: false, storeProductId: null });
  });
});
