/**
 * #779: POST /api/subscriptions/[id]/renew charges and dates by the owner's rules of 2026-10-11.
 * Before the fix: amount × duration (amount is already a cycle price), 5/10/20% discounts,
 * an expired subscription continued from its old end, and a MERCHANT could renew any id.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockTx = {
  payment: { create: jest.fn() },
  subscription: { update: jest.fn() },
};
const mockDb = {
  subscriptions: { findById: jest.fn() },
  // #850: shops without add-ons unless a test says otherwise
  merchantAddons: { renewalItems: jest.fn(async () => ({ items: [], catalog: new Map() })), applyRenewal: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  prisma: { $transaction: (fn: any) => fn(mockTx) },
}));

// The real billing helpers, straight from source (the utils index pulls .tsx that Jest does not transform).
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendSubscriptionRenewalEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

import { POST } from '../../apps/api/app/api/subscriptions/[id]/renew/route';

const admin = { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} };
const merchant2 = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
const NOW = new Date('2026-10-11T03:00:00Z');

function renew(body: any): any {
  return { url: 'http://localhost/api/subscriptions/7/renew', json: async () => body };
}
function call(body: any) {
  return POST(renew(body), { params: { id: '7' } }) as any;
}

/** An annual subscription: `amount` is the price of the whole year (29 × 12 × 0.9). */
function givenSubscription(over: any = {}) {
  mockDb.subscriptions.findById.mockResolvedValue({
    id: 7,
    merchantId: 2,
    amount: 313.2,
    currency: 'USD',
    interval: 'annual',
    currentPeriodStart: new Date('2025-10-21T16:59:59.999Z'),
    currentPeriodEnd: new Date('2026-10-21T16:59:59.999Z'), // 21 Oct VN, not expired on 11 Oct
    plan: { id: 3, name: 'Basic', basePrice: 29, currency: 'USD' },
    ...over,
  });
}

const base = { method: 'TRANSFER', transactionId: 'FT123' };

describe('POST /api/subscriptions/[id]/renew (#779)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    ctx = admin;
    givenSubscription();
    mockTx.payment.create.mockImplementation(async ({ data }: any) => ({ id: 1, ...data }));
    mockTx.subscription.update.mockImplementation(async ({ data }: any) => ({
      id: 7,
      merchantId: 2,
      merchant: { id: 2, name: 'Shop', email: null },
      plan: { name: 'Basic' },
      ...data,
    }));
  });
  afterEach(() => jest.useRealTimers());

  it('renewing an annual subscription for 1 month charges the plan month (29), not the whole year', async () => {
    const res = await call({ ...base, duration: 1 });
    expect(res.status).toBe(200);
    expect(mockTx.payment.create.mock.calls[0][0].data.amount).toBeCloseTo(29, 2);
  });

  it('12 months = 313.2 with the standard 10% (not 278.4 with 20%)', async () => {
    await call({ ...base, duration: 12 });
    expect(mockTx.payment.create.mock.calls[0][0].data.amount).toBeCloseTo(313.2, 2);
  });

  it('3 months = 87 (0%), 6 months = 165.3 (5%)', async () => {
    await call({ ...base, duration: 3 });
    await call({ ...base, duration: 6 });
    expect(mockTx.payment.create.mock.calls[0][0].data.amount).toBeCloseTo(87, 2);
    expect(mockTx.payment.create.mock.calls[1][0].data.amount).toBeCloseTo(165.3, 2);
  });

  it('not expired: the new period continues from the current end (days left kept)', async () => {
    await call({ ...base, duration: 1 });
    const data = mockTx.subscription.update.mock.calls[0][0].data;
    expect(data.currentPeriodStart.toISOString()).toBe('2026-10-21T16:59:59.999Z');
    expect(data.currentPeriodEnd.toISOString()).toBe('2026-11-21T16:59:59.999Z');
  });

  it('expired: the new period starts at renewal time (ended 30/06, renewed 11/10 → 11/11)', async () => {
    givenSubscription({ currentPeriodEnd: new Date('2026-06-30T16:59:59.999Z') });
    await call({ ...base, duration: 1 });
    const data = mockTx.subscription.update.mock.calls[0][0].data;
    expect(data.currentPeriodStart.toISOString()).toBe(NOW.toISOString());
    expect(data.currentPeriodEnd.toISOString()).toBe('2026-11-11T03:00:00.000Z');
  });

  it('stores the renewed cycle on the subscription (amount, interval, months, discount)', async () => {
    await call({ ...base, duration: 3 });
    const data = mockTx.subscription.update.mock.calls[0][0].data;
    expect(data.amount).toBeCloseTo(87, 2);
    expect(data.interval).toBe('quarterly');
    expect(data.intervalCount).toBe(3);
    expect(data.period).toBe(3);
    expect(data.discount).toBe(0);
  });

  it('returns the calculation beside the existing keys (additive)', async () => {
    const res = await call({ ...base, duration: 1 });
    expect(Object.keys(res.body.data)).toEqual(expect.arrayContaining(['subscription', 'payment', 'renewal']));
    expect(res.body.data.renewal.totalDue).toBeCloseTo(29, 2);
  });

  it('a duration other than 1/3/6/12 is refused with 400 INVALID_DURATION', async () => {
    const res = await call({ ...base, duration: 2 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DURATION');
    expect(mockTx.payment.create).not.toHaveBeenCalled();
  });

  it('a merchant can renew its own subscription', async () => {
    ctx = merchant2;
    const res = await call({ ...base, duration: 1 });
    expect(res.status).toBe(200);
  });

  it('#850: renewal = plan + add-ons at today\'s list price; paused and marked items are not charged; amount stays the plan price', async () => {
    givenSubscription({ currency: 'VND', interval: 'monthly', plan: { id: 3, name: 'Enterprise', basePrice: 399000, currency: 'VND' } });
    mockDb.merchantAddons.renewalItems.mockResolvedValueOnce({
      items: [
        { id: 1, addonPriceId: 10, packs: 1, unitPrice: 40000, isActive: true, name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2 },
        { id: 2, addonPriceId: 11, packs: 1, unitPrice: 150000, isActive: true, removeAtPeriodEnd: true, endsAt: new Date('2026-10-21T16:59:59.999Z') },
        { id: 3, addonPriceId: 12, packs: 2, unitPrice: 20000, isActive: true },
      ],
      catalog: new Map([
        [10, { id: 10, monthlyPrice: 45000, isActive: true }],
        [11, { id: 11, monthlyPrice: 150000, isActive: true }],
        [12, { id: 12, monthlyPrice: 20000, isActive: false }],
      ]),
    });
    const res = await call({ ...base, duration: 1 });
    expect(res.status).toBe(200);
    expect(mockTx.payment.create.mock.calls[0][0].data.amount).toBe(399000 + 45000);
    expect(mockTx.subscription.update.mock.calls[0][0].data.amount).toBe(399000);
    expect(res.body.data.renewal).toMatchObject({ planPrice: 399000, addonPrice: 45000, totalDue: 444000 });
    expect(res.body.data.addons).toEqual([expect.objectContaining({ id: 1, unitPrice: 45000, monthlyAmount: 45000 })]);
    const lines = mockDb.merchantAddons.applyRenewal.mock.calls[0][1];
    expect(lines.map((l: any) => [l.id, l.renew])).toEqual([[1, true], [2, false], [3, false]]);
  });

  it("a merchant cannot renew another merchant's subscription (403, nothing written)", async () => {
    ctx = { ...merchant2, user: { ...merchant2.user, merchantId: 9 }, userScope: { merchantId: 9 } };
    const res = await call({ ...base, duration: 1 });
    expect(res.status).toBe(403);
    expect(mockTx.payment.create).not.toHaveBeenCalled();
    expect(mockTx.subscription.update).not.toHaveBeenCalled();
  });
});
