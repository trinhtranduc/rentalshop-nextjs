/**
 * #1482 — POST /api/payments/manual used to save the payment without `processedAt`, `merchantId`, `subscriptionId` and
 * `currency`, so the admin revenue report could not date it, name its shop or tell VND from USD. The request is unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, { user: { id: 9, email: 'a@x', role: 'ADMIN' }, userScope: {} }),
}));

const mockCreate = jest.fn(async (data: any) => ({ id: 55, createdAt: new Date(), ...data }));
const mockDb = {
  merchants: { findById: jest.fn() },
  plans: { findById: jest.fn() },
  payments: { create: mockCreate },
  subscriptions: { update: jest.fn() },
  auditLogs: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ResponseBuilder: { error: (code: string) => ({ success: false, code }), success: (code: string, data: any) => ({ success: true, code, data }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/payments/manual/route';

const NOW = new Date('2026-11-04T03:00:00.000Z');
const body = { merchantId: 7, planId: 2, amount: 300000, currency: 'VND', method: 'CASH', description: 'Cash at the counter' };
const post = (b: any = body): any => (POST as any)({ headers: { get: () => null }, json: async () => b });

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  mockCreate.mockClear();
  mockDb.merchants.findById.mockResolvedValue({ id: 7, subscription: { id: 70, currentPeriodEnd: null } });
  mockDb.plans.findById.mockResolvedValue({ id: 2, name: 'Basic' });
});
afterEach(() => jest.useRealTimers());

describe('POST /api/payments/manual', () => {
  it('stores processedAt, merchantId, subscriptionId and currency', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 7,
        subscriptionId: 70,
        currency: 'VND',
        processedAt: NOW,
        type: 'SUBSCRIPTION_PAYMENT',
        status: 'COMPLETED',
        method: 'CASH',
        amount: 300000,
      }),
    );
  });

  it('keeps a USD amount as USD, so it never lands in the VND total', async () => {
    await post({ ...body, amount: 11, currency: 'USD' });
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ currency: 'USD', amount: 11 });
  });

  it('a shop without a subscription row still saves the shop and the date', async () => {
    mockDb.merchants.findById.mockResolvedValue({ id: 7, subscription: null });
    await post();
    const data = mockCreate.mock.calls[0][0];
    expect(data).toMatchObject({ merchantId: 7, processedAt: NOW });
    expect(data.subscriptionId).toBeUndefined();
  });

  it('the response keeps its old shape', async () => {
    const res = await post();
    expect(res.body.code).toBe('MANUAL_PAYMENT_CREATED_SUCCESS');
    expect(Object.keys(res.body.data.payment).sort()).toEqual(['amount', 'createdAt', 'id', 'method', 'notes', 'reference', 'status', 'type']);
  });
});
