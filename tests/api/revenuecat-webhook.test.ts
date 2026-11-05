/**
 * #1459 POST /api/webhooks/revenuecat with authorised fixtures (Bearer secret):
 * purchase, renewal, product change, cancel, refund, billing issue, duplicate event, expiration.
 * The plan follows the store product, the real amount is stored, each event id runs once,
 * history is plain Vietnamese with Vietnam dates. Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

type Row = Record<string, any>;
const store: {
  merchants: Row[];
  plans: Row[];
  subscriptions: Row[];
  activities: Row[];
  payments: Row[];
  events: Row[];
  failNextSubscriptionWrite: boolean;
} = { merchants: [], plans: [], subscriptions: [], activities: [], payments: [], events: [], failNextSubscriptionWrite: false };

let nextId = 1000;
const uniqueError = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const pick = (row: Row | undefined, include?: any) => {
  if (!row) return null;
  const out = { ...row };
  if (include?.plan) out.plan = store.plans.find((p) => p.id === row.planId) ?? null;
  return out;
};
const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('not' in v) return row[k] !== v.not;
      if ('in' in v) return v.in.includes(row[k]);
      return true;
    }
    return row[k] === v;
  });

const mockPrisma = {
  merchant: {
    findUnique: async ({ where }: any) => store.merchants.find((m) => m.id === where.id) ?? null,
  },
  plan: {
    findMany: async ({ where }: any = {}) => store.plans.filter((p) => matches(p, where)),
    findFirst: async ({ where }: any = {}) => store.plans.find((p) => matches(p, where)) ?? null,
  },
  subscription: {
    findUnique: async ({ where, include }: any) => pick(store.subscriptions.find((s) => s.merchantId === where.merchantId), include),
    update: async ({ where, data }: any) => {
      if (store.failNextSubscriptionWrite) {
        store.failNextSubscriptionWrite = false;
        throw new Error('database went away');
      }
      const row = store.subscriptions.find((s) => s.merchantId === where.merchantId);
      if (!row) throw new Error('not found');
      Object.assign(row, data);
      return { ...row };
    },
    create: async ({ data }: any) => {
      if (store.subscriptions.some((s) => s.merchantId === data.merchantId)) throw uniqueError();
      const row = { id: nextId++, cancelAtPeriodEnd: false, autoRenew: false, ...data };
      store.subscriptions.push(row);
      return { ...row };
    },
  },
  subscriptionActivity: {
    create: async ({ data }: any) => {
      store.activities.push({ id: nextId++, ...data });
      return data;
    },
  },
  payment: {
    create: async ({ data }: any) => {
      store.payments.push({ id: nextId++, ...data });
      return data;
    },
    updateMany: async ({ where, data }: any) => {
      const rows = store.payments.filter((p) => matches(p, where));
      rows.forEach((p) => Object.assign(p, data));
      return { count: rows.length };
    },
  },
  billingWebhookEvent: {
    create: async ({ data }: any) => {
      if (store.events.some((e) => e.provider === data.provider && e.eventId === data.eventId)) throw uniqueError();
      const row = { id: nextId++, ...data };
      store.events.push(row);
      return row;
    },
    delete: async ({ where }: any) => {
      store.events = store.events.filter((e) => e.id !== where.id);
      return {};
    },
  },
};

jest.mock('@rentalshop/database', () => ({ db: { prisma: mockPrisma }, prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  handleApiError: (e: any) => ({ response: { success: false, code: 'INTERNAL_SERVER_ERROR', message: String(e) }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/webhooks/revenuecat/route';

const SECRET = 'rc-test-secret';
const MS = (iso: string) => Date.parse(iso);
// 2026-11-02 09:00 VN
const PURCHASED = '2026-11-02T02:00:00.000Z';
const EXPIRES = '2027-11-02T02:00:00.000Z';
// A13: the trial below ends 2026-11-03 00:00 UTC; its 22 h left continue after the store period
const ACCESS = '2027-11-03T00:00:00.000Z';

let eventSeq = 0;
function event(type: string, over: Row = {}): Row {
  eventSeq += 1;
  return {
    id: `evt-${eventSeq}`,
    type,
    app_user_id: 'merchant_7',
    product_id: 'anyrent_merchant_annual',
    store: 'APP_STORE',
    environment: 'PRODUCTION',
    purchased_at_ms: MS(PURCHASED),
    expiration_at_ms: MS(EXPIRES),
    event_timestamp_ms: MS(PURCHASED),
    price_in_purchased_currency: 1799000,
    currency: 'VND',
    transaction_id: `tx-${eventSeq}`,
    original_transaction_id: 'otx-1',
    ...over,
  };
}

async function send(ev: Row, auth: string | null = `Bearer ${SECRET}`) {
  const headers = new Map<string, string>();
  if (auth) headers.set('authorization', auth);
  const request: any = {
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => ({ api_version: '1.0', event: ev }),
  };
  return (await POST(request)) as any;
}

const sub = () => store.subscriptions.find((s) => s.merchantId === 7)!;
const lastActivity = () => store.activities[store.activities.length - 1];

beforeEach(() => {
  eventSeq = 0;
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  store.merchants = [{ id: 7 }];
  store.plans = [
    { id: 1, name: 'Trial', isActive: true, deletedAt: null },
    { id: 2, name: 'Basic', isActive: true, deletedAt: null },
    { id: 3, name: 'Professional', isActive: true, deletedAt: null },
  ];
  store.subscriptions = [
    {
      id: 70, merchantId: 7, planId: 1, status: 'TRIAL', amount: 0, currency: 'VND', interval: 'month', intervalCount: 1,
      currentPeriodStart: new Date('2026-10-20T00:00:00Z'), currentPeriodEnd: new Date('2026-11-03T00:00:00Z'),
      cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null,
      billingChannel: null, storeProductId: null, storeOriginalTransactionId: null, autoRenew: false, billingIssueAt: null,
    },
  ];
  store.activities = [];
  store.payments = [];
  store.events = [];
  store.failNextSubscriptionWrite = false;
});

describe('auth', () => {
  it('a wrong secret is 401 and writes nothing', async () => {
    const res = await send(event('INITIAL_PURCHASE'), 'Bearer nope');
    expect(res.status).toBe(401);
    expect(store.events).toHaveLength(0);
    expect(sub().planId).toBe(1);
  });
});

describe('INITIAL_PURCHASE / RENEWAL', () => {
  it('trial shop buys Basic 12 months on the App Store', async () => {
    const res = await send(event('INITIAL_PURCHASE'));
    expect(res.status).toBe(200);
    expect(sub()).toMatchObject({
      planId: 2,
      status: 'ACTIVE',
      amount: 1799000,
      currency: 'VND',
      interval: 'annual',
      billingChannel: 'APP_STORE',
      storeProductId: 'anyrent_merchant_annual',
      storeOriginalTransactionId: 'otx-1',
      autoRenew: true,
      billingIssueAt: null,
      cancelAtPeriodEnd: false,
    });
    expect(sub().currentPeriodStart.toISOString()).toBe(PURCHASED);
    expect(sub().currentPeriodEnd.toISOString()).toBe(ACCESS);
    expect(store.payments).toHaveLength(1);
    expect(store.payments[0]).toMatchObject({ amount: 1799000, currency: 'VND', method: 'IAP_APPLE', status: 'COMPLETED', transactionId: 'tx-1' });
    expect(lastActivity()).toMatchObject({ type: 'IAP_INITIAL_PURCHASE', description: 'Mua gói Basic 12 tháng qua App Store. Dùng đến 03/11/2027.' });
  });

  it('Professional product on Google Play (base plan suffix) sets Professional', async () => {
    await send(event('INITIAL_PURCHASE', { product_id: 'anyrent_professional_semi_annual:semi-annual', store: 'PLAY_STORE', price_in_purchased_currency: 1299000 }));
    expect(sub()).toMatchObject({
      planId: 3, billingChannel: 'PLAY_STORE', storeProductId: 'anyrent_professional_semi_annual', interval: 'semi_annual', amount: 1299000,
    });
    expect(store.payments[0].method).toBe('IAP_GOOGLE');
    expect(lastActivity().description).toBe('Mua gói Professional 6 tháng qua Google Play. Dùng đến 03/11/2027.');
  });

  it('renewal moves the period, clears a billing issue, keeps one payment per event', async () => {
    await send(event('INITIAL_PURCHASE'));
    await send(event('BILLING_ISSUE'));
    expect(sub().billingIssueAt).toBeInstanceOf(Date);
    await send(event('RENEWAL', { purchased_at_ms: MS(EXPIRES), expiration_at_ms: MS('2028-11-02T02:00:00.000Z') }));
    expect(sub()).toMatchObject({ status: 'ACTIVE', billingIssueAt: null, autoRenew: true, planId: 2 });
    expect(sub().currentPeriodEnd.toISOString()).toBe('2028-11-03T00:00:00.000Z');
    expect(store.payments).toHaveLength(2);
    expect(lastActivity()).toMatchObject({ type: 'IAP_RENEWAL', description: 'Tự gia hạn gói Basic 12 tháng qua App Store. Dùng đến 03/11/2028.' });
  });

  it('a renewal of a purchase recorded before #1459 (no storeProductId) keeps the plan', async () => {
    Object.assign(sub(), { planId: 3, status: 'ACTIVE' });
    await send(event('RENEWAL'));
    expect(sub()).toMatchObject({ planId: 3, storeProductId: 'anyrent_merchant_annual', status: 'ACTIVE' });
    expect(sub().currentPeriodEnd.toISOString()).toBe(ACCESS);
  });

  it('creates the subscription when the shop has none, with the real amount', async () => {
    store.subscriptions = [];
    await send(event('INITIAL_PURCHASE'));
    expect(sub()).toMatchObject({ planId: 2, amount: 1799000, billingChannel: 'APP_STORE', autoRenew: true });
  });

  it('sandbox (allow-listed demo shop, A3) keeps the real duration (purchase + 12 months on the Vietnam day)', async () => {
    process.env.REVENUECAT_SANDBOX_MERCHANT_IDS = '7';
    await send(event('INITIAL_PURCHASE', { environment: 'SANDBOX', expiration_at_ms: MS('2026-11-02T02:05:00.000Z') }));
    delete process.env.REVENUECAT_SANDBOX_MERCHANT_IDS;
    expect(sub().currentPeriodEnd.toISOString()).toBe(ACCESS);
  });

  it('unknown product, invalid user id or unknown merchant: 200 ignored, subscription untouched', async () => {
    expect((await send(event('INITIAL_PURCHASE', { product_id: 'other_app_product' }))).body.status).toMatch(/^ignored/);
    expect((await send(event('INITIAL_PURCHASE', { app_user_id: '$RCAnonymousID:abc' }))).body.status).toMatch(/^ignored/);
    expect((await send(event('INITIAL_PURCHASE', { app_user_id: 'merchant_404' }))).body.status).toMatch(/^ignored/);
    expect(sub()).toMatchObject({ planId: 1, status: 'TRIAL' });
    expect(store.payments).toHaveLength(0);
  });
});

describe('duplicate events', () => {
  it('the same event id twice changes nothing the second time', async () => {
    const ev = event('INITIAL_PURCHASE');
    expect((await send(ev)).status).toBe(200);
    const res = await send(ev);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('duplicate');
    expect(store.payments).toHaveLength(1);
    expect(store.activities).toHaveLength(1);
  });

  it('a processing error releases the event id and answers 500, so the retry runs once', async () => {
    const ev = event('INITIAL_PURCHASE');
    store.failNextSubscriptionWrite = true;
    const failed = await send(ev);
    expect(failed.status).toBe(500);
    expect(store.events).toHaveLength(0);
    const retried = await send(ev);
    expect(retried.status).toBe(200);
    expect(sub().planId).toBe(2);
    expect(store.events).toHaveLength(1);
  });
});

describe('PRODUCT_CHANGE', () => {
  beforeEach(async () => {
    await send(event('INITIAL_PURCHASE'));
  });

  it('Basic → Professional switches the plan at once', async () => {
    await send(event('PRODUCT_CHANGE', { new_product_id: 'anyrent_professional_annual', price_in_purchased_currency: 2399000 }));
    expect(sub()).toMatchObject({ planId: 3, storeProductId: 'anyrent_professional_annual' });
    expect(lastActivity()).toMatchObject({ type: 'IAP_PRODUCT_CHANGE', description: 'Nâng lên gói Professional 12 tháng qua App Store. Dùng đến 03/11/2027.' });
  });

  it('Professional → Basic waits for the next renewal', async () => {
    await send(event('PRODUCT_CHANGE', { new_product_id: 'anyrent_professional_annual' }));
    await send(event('PRODUCT_CHANGE', { product_id: 'anyrent_professional_annual', new_product_id: 'anyrent_merchant_semi_annual' }));
    expect(sub()).toMatchObject({ planId: 3, storeProductId: 'anyrent_professional_annual' });
    expect(lastActivity().description).toBe('Từ kỳ sau đổi sang gói Basic 6 tháng (App Store).');
    await send(event('RENEWAL', { product_id: 'anyrent_merchant_semi_annual', expiration_at_ms: MS('2028-05-02T02:00:00.000Z') }));
    expect(sub()).toMatchObject({ planId: 2, storeProductId: 'anyrent_merchant_semi_annual', interval: 'semi_annual' });
  });
});

describe('CANCELLATION, UNCANCELLATION, refund, billing issue, expiration', () => {
  beforeEach(async () => {
    await send(event('INITIAL_PURCHASE'));
  });

  it('cancel: auto-renew off, access until the period end', async () => {
    await send(event('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE' }));
    expect(sub()).toMatchObject({ autoRenew: false, cancelAtPeriodEnd: true, status: 'ACTIVE' });
    expect(sub().currentPeriodEnd.toISOString()).toBe(ACCESS);
    expect(lastActivity().description).toBe('Đã tắt tự gia hạn trên App Store. Gói vẫn dùng đến 03/11/2027.');
    await send(event('UNCANCELLATION'));
    expect(sub()).toMatchObject({ autoRenew: true, cancelAtPeriodEnd: false, canceledAt: null });
    expect(lastActivity().description).toBe('Đã bật lại tự gia hạn trên App Store.');
  });

  it('refund (CUSTOMER_SUPPORT): access ends at the refund, payment refunded', async () => {
    const refundAt = '2026-11-05T05:00:00.000Z';
    await send(event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'tx-1', event_timestamp_ms: MS(refundAt) }));
    // EXPIRED (renewable in the app), not CANCELLED ("contact support" 403 SUBSCRIPTION_CANCELLED)
    expect(sub()).toMatchObject({ status: 'EXPIRED', autoRenew: false, cancelAtPeriodEnd: true, cancelReason: 'REFUND' });
    expect(sub().currentPeriodEnd.toISOString()).toBe(refundAt);
    expect(store.payments[0].status).toBe('REFUNDED');
    expect(lastActivity()).toMatchObject({ type: 'IAP_REFUND', description: 'App Store đã hoàn tiền. Gói dừng từ 05/11/2026.' });
  });

  it('billing issue: flagged, status stays ACTIVE (PAST_DUE would lock the shop out), access unchanged', async () => {
    await send(event('BILLING_ISSUE'));
    expect(sub().status).toBe('ACTIVE');
    expect(sub().autoRenew).toBe(true);
    expect(sub().billingIssueAt).toBeInstanceOf(Date);
    expect(sub().currentPeriodEnd.toISOString()).toBe(ACCESS);
    expect(lastActivity().description).toBe('App Store chưa thu được tiền gia hạn. Chủ shop cần kiểm tra cách thanh toán. Gói vẫn dùng đến 03/11/2027.');
  });

  it('expiration before the period end is logged only; auto-renew goes off', async () => {
    await send(event('EXPIRATION'));
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: false });
    expect(lastActivity().type).toBe('IAP_EXPIRATION_IGNORED');
  });

  it('expiration after the period end marks EXPIRED', async () => {
    sub().currentPeriodEnd = new Date('2026-11-01T00:00:00Z');
    await send(event('EXPIRATION'));
    expect(sub()).toMatchObject({ status: 'EXPIRED', autoRenew: false });
    expect(lastActivity()).toMatchObject({ type: 'IAP_EXPIRATION', description: 'Gói đã hết hạn.' });
  });

  // #1466: on the App Store the same original transaction id is the same subscription after an upgrade, so its cancel or
  // expiration applies (revenuecat-webhook-cancel-after-upgrade.test.ts). Google Play starts a new order id on a product
  // change: there the replaced product's events do not touch the new plan.
  it('Google Play: a cancel or expiration of the replaced product (old order id) after an upgrade does not turn auto-renew off', async () => {
    const play = { store: 'PLAY_STORE' };
    await send(event('INITIAL_PURCHASE', { ...play, product_id: 'anyrent_merchant_annual:annual', original_transaction_id: 'GPA.1111' }));
    await send(event('PRODUCT_CHANGE', {
      ...play, product_id: 'anyrent_merchant_annual:annual', new_product_id: 'anyrent_professional_annual:annual', original_transaction_id: 'GPA.1111',
    }));
    await send(event('CANCELLATION', { ...play, product_id: 'anyrent_merchant_annual:annual', original_transaction_id: 'GPA.1111', cancel_reason: 'UNSUBSCRIBE' }));
    expect(sub()).toMatchObject({ planId: 3, autoRenew: true, cancelAtPeriodEnd: false });
    await send(event('INITIAL_PURCHASE', { ...play, product_id: 'anyrent_professional_annual:annual', original_transaction_id: 'GPA.2222' }));
    await send(event('EXPIRATION', { ...play, product_id: 'anyrent_merchant_annual:annual', original_transaction_id: 'GPA.1111' }));
    expect(sub()).toMatchObject({ planId: 3, autoRenew: true, cancelAtPeriodEnd: false, storeOriginalTransactionId: 'GPA.2222' });
  });
});
