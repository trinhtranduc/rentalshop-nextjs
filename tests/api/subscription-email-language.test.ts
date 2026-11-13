/**
 * #1539 — subscription emails (expiry reminder cron, renewal) go out in the shop language (`Merchant.language`):
 * 'en' → English; empty or missing → Vietnamese, as before.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

// ---- expiry reminder cron ----
const mockFindExpiring = jest.fn();
jest.mock('../../packages/database/src/subscription-expiry-reminder', () => ({
  buildExpiryReminderKey: (id: number, key: string, days: number) => `${id}:${key}:${days}`,
  findSentExpiryReminderKeys: jest.fn(async () => new Set()),
  findSubscriptionsExpiringInDays: (...args: any[]) => mockFindExpiring(...args),
  recordExpiryReminderSent: jest.fn(async () => undefined),
}));
const mockSendReminder = jest.fn(async (_data: any) => ({ success: true }));
jest.mock('../../packages/utils/src/services/email', () => ({
  sendSubscriptionExpiryReminderEmail: (data: any) => mockSendReminder(data),
}));

// ---- renew route ----
let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
}));
const mockTx = { payment: { create: jest.fn() }, subscription: { update: jest.fn() } };
const mockDb = {
  subscriptions: { findById: jest.fn() },
  merchantAddons: { renewalItems: jest.fn(async () => ({ items: [], catalog: new Map() })), applyRenewal: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { $transaction: (fn: any) => fn(mockTx) } }));
const mockSendRenewal = jest.fn((_data: any) => Promise.resolve({ success: true }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendSubscriptionRenewalEmail: (data: any) => mockSendRenewal(data),
}));

import { GET as runCron } from '../../apps/api/app/api/cron/subscription-expiry-reminders/route';
import { POST as renewRoute } from '../../apps/api/app/api/subscriptions/[id]/renew/route';

const LANGS: Array<[string, any, 'vi' | 'en']> = [
  ['en', 'en', 'en'],
  ['vi', 'vi', 'vi'],
  ['empty (before #1539)', null, 'vi'],
  ['missing', undefined, 'vi'],
];

describe('expiry reminder cron sends in the shop language (#1539)', () => {
  beforeAll(() => {
    process.env.CRON_SECRET = 'cron-secret';
  });
  beforeEach(() => jest.clearAllMocks());

  it.each(LANGS)('shop language %s', async (_name, language, expected) => {
    mockFindExpiring.mockImplementation(async (days: number) => ({
      dateKey: '2026-11-16',
      subscriptions:
        days === 3
          ? [
              {
                id: 9,
                merchantId: 2,
                status: 'ACTIVE',
                currentPeriodEnd: new Date('2026-11-16T16:59:59.999Z'),
                planName: 'Basic',
                merchant: { id: 2, name: 'Shop', email: 'shop@x.com', ...(language === undefined ? {} : { language }) },
                merchantUserEmails: [],
              },
            ]
          : [],
    }));
    const res: any = await runCron({
      url: 'http://localhost/api/cron/subscription-expiry-reminders',
      headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? 'Bearer cron-secret' : null) },
    } as any);
    expect(res.status).toBe(200);
    expect(mockSendReminder).toHaveBeenCalledTimes(1);
    expect(mockSendReminder.mock.calls[0][0].locale).toBe(expected);
  });
});

describe('renewal email sends in the shop language (#1539)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} };
    mockDb.subscriptions.findById.mockResolvedValue({
      id: 7,
      merchantId: 2,
      amount: 29,
      currency: 'USD',
      interval: 'month',
      currentPeriodStart: new Date('2026-10-21T16:59:59.999Z'),
      currentPeriodEnd: new Date('2026-11-21T16:59:59.999Z'),
      plan: { id: 3, name: 'Basic', basePrice: 29, currency: 'USD' },
    });
    mockTx.payment.create.mockImplementation(async ({ data }: any) => ({ id: 1, ...data }));
  });

  it('the transaction reads merchant.language', async () => {
    mockTx.subscription.update.mockImplementation(async ({ data }: any) => ({ id: 7, merchantId: 2, merchant: { id: 2, name: 'Shop', email: 'shop@x.com' }, plan: { name: 'Basic' }, ...data }));
    await renewRoute({ url: 'http://localhost/api/subscriptions/7/renew', json: async () => ({ method: 'TRANSFER', transactionId: 'FT1', duration: 1 }) } as any, { params: { id: '7' } } as any);
    expect(mockTx.subscription.update.mock.calls[0][0].include.merchant.select).toMatchObject({ language: true });
  });

  it.each(LANGS)('shop language %s', async (_name, language, expected) => {
    mockTx.subscription.update.mockImplementation(async ({ data }: any) => ({
      id: 7,
      merchantId: 2,
      merchant: { id: 2, name: 'Shop', email: 'shop@x.com', ...(language === undefined ? {} : { language }) },
      plan: { name: 'Basic' },
      ...data,
    }));
    const res: any = await renewRoute(
      { url: 'http://localhost/api/subscriptions/7/renew', json: async () => ({ method: 'TRANSFER', transactionId: 'FT1', duration: 1 }) } as any,
      { params: { id: '7' } } as any,
    );
    expect(res.status).toBe(200);
    expect(mockSendRenewal).toHaveBeenCalledTimes(1);
    expect(mockSendRenewal.mock.calls[0][0].locale).toBe(expected);
  });
});
