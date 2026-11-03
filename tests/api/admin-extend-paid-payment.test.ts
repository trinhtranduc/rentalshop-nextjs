/**
 * #1462: POST /api/admin/subscriptions/[id]/extend passed an undeclared `merchantId` to payment.create. With a paid
 * amount the subscription update was already saved, then the route threw (500) and wrote no Payment.
 * Fixed: the Payment takes the subscription's merchantId, and the update, the Payment and the activity are one
 * transaction (a failed write saves nothing). The response shape is unchanged.
 * The A13 store-credit rule of this route is covered in manual-extension-store-credit.test.ts.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

// Writes land in `committed` at once, or, inside $transaction, only when the callback resolves (rolled back on a throw).
const committed: string[] = [];
let staged: string[] | null = null;
const record = (name: string) => (staged ?? committed).push(name);

const mockPrisma: any = {
  subscription: { findUnique: jest.fn(), update: jest.fn() },
  payment: { create: jest.fn() },
  subscriptionActivity: { create: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
    staged = [];
    try {
      const out = await fn(mockPrisma);
      committed.push(...staged);
      return out;
    } finally {
      staged = null;
    }
  }),
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

const MANUAL_ROW = {
  id: 70, merchantId: 7, planId: 2, status: 'ACTIVE', amount: 1799000, currency: 'VND', interval: 'annual', intervalCount: 1,
  currentPeriodStart: at(-300), currentPeriodEnd: at(20), cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null,
  billingChannel: 'MANUAL', storeProductId: null, autoRenew: false, storeBonusMs: null, billingIssueAt: null,
};
const given = (over: Record<string, unknown> = {}) =>
  mockPrisma.subscription.findUnique.mockResolvedValue({ ...MANUAL_ROW, ...over });
const extend = (body: Record<string, unknown>) =>
  POST({ json: async () => ({ months: 1, reason: 'Chuyển khoản', ...body }) } as any, { params: { id: '70' } }) as any;

describe('admin manual extension with a paid amount (#1462)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    committed.length = 0;
    staged = null;
    jest.useFakeTimers().setSystemTime(NOW);
    ctx = { user: { id: 1, role: 'ADMIN', email: 'a@x' } };
    mockPrisma.subscription.update.mockImplementation(async ({ data }: any) => {
      record('subscription.update');
      return { ...MANUAL_ROW, ...data };
    });
    mockPrisma.payment.create.mockImplementation(async ({ data }: any) => {
      record('payment.create');
      return { id: 501, ...data };
    });
    mockPrisma.subscriptionActivity.create.mockImplementation(async () => {
      record('subscriptionActivity.create');
      return { id: 901 };
    });
  });
  afterEach(() => jest.useRealTimers());

  it('paid: answers success and writes the Payment with the subscription merchantId', async () => {
    given();
    const res = await extend({ amount: 500000, paymentSource: 'TRANSFER' });

    expect(res.body).toEqual(expect.objectContaining({ success: true, code: 'SUBSCRIPTION_EXTENDED' }));
    expect(res.status).toBe(200);
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.payment.create.mock.calls[0][0].data).toMatchObject({
      amount: 500000,
      currency: 'VND',
      method: 'TRANSFER',
      type: 'SUBSCRIPTION_PAYMENT',
      status: 'COMPLETED',
      subscriptionId: 70,
      merchantId: 7,
    });
    expect(committed).toEqual(['subscription.update', 'payment.create', 'subscriptionActivity.create']);

    // response shape unchanged
    const data = res.body.data;
    expect(Object.keys(data).sort()).toEqual(['monthsAdded', 'newPeriodEnd', 'subscription']);
    expect(data.monthsAdded).toBe(1);
    expect(data.newPeriodEnd).toBe(mockPrisma.subscription.update.mock.calls[0][0].data.currentPeriodEnd.toISOString());
    expect(data.subscription).toMatchObject({ id: 70, merchantId: 7, amount: 500000 });
  });

  it('cash without a currency: method CASH, currency VND', async () => {
    given();
    const res = await extend({ amount: 200000, paymentSource: 'CASH' });
    expect(res.status).toBe(200);
    expect(mockPrisma.payment.create.mock.calls[0][0].data).toMatchObject({ method: 'CASH', currency: 'VND', merchantId: 7 });
  });

  it('amount 0: extends and writes no Payment', async () => {
    given();
    const res = await extend({ amount: 0, paymentSource: 'PROMO' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, code: 'SUBSCRIPTION_EXTENDED' });
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(committed).toEqual(['subscription.update', 'subscriptionActivity.create']);
  });

  it('the Payment write fails: the extension is not saved either', async () => {
    given();
    mockPrisma.payment.create.mockImplementationOnce(async () => {
      throw new Error('payment write failed');
    });
    const res = await extend({ amount: 500000, paymentSource: 'TRANSFER' });
    expect(res.status).toBe(500);
    expect(committed).not.toContain('subscription.update');
    expect(committed).toEqual([]);
  });

  it('a store plan still running (A13) + paid: store credit kept, Payment written', async () => {
    given({
      billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', autoRenew: true, storeBonusMs: 2 * DAY,
      currentPeriodStart: at(-263), currentPeriodEnd: at(102),
    });
    const res = await extend({ amount: 150000, paymentSource: 'TRANSFER' });
    expect(res.status).toBe(200);
    const written = mockPrisma.subscription.update.mock.calls[0][0].data;
    expect(Object.keys(written).sort()).toEqual(['currentPeriodEnd', 'storeBonusMs']);
    expect(written.storeBonusMs).toBe(2 * DAY + (written.currentPeriodEnd.getTime() - at(102).getTime()));
    expect(mockPrisma.payment.create.mock.calls[0][0].data).toMatchObject({ amount: 150000, merchantId: 7, subscriptionId: 70 });
  });
});
