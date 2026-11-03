/**
 * #1459 "Trừ tiền lỗi: vẫn dùng tới hết kỳ". A store BILLING_ISSUE must not lock the shop out: the subscription stays
 * ACTIVE (authenticateRequest blocks PAST_DUE on every route), `billingIssueAt` is set, and the store's grace period
 * (`grace_period_expiration_at_ms`) extends access. The next RENEWAL / UNCANCELLATION / PRODUCT_CHANGE clears the flag;
 * EXPIRATION after the grace ends access.
 *
 * The webhook and the real `authenticateRequest` (packages/auth/src/core.ts) run on the same in-memory rows, so the test
 * checks access the way every API route does. Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import jsonwebtoken from 'jsonwebtoken';
import { loadRoute, request, type StoreHolder, THIS_ROOT } from '../api-compat/load-route';

type Row = Record<string, any>;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const SECRET = 'rc-test-secret';

const PLANS = [
  { id: 2, name: 'Basic', isActive: true, deletedAt: null, limits: '{}', features: '[]' },
  { id: 3, name: 'Professional', isActive: true, deletedAt: null, limits: '{}', features: '[]' },
];

let subscription: Row;
let activities: Row[];
let events: Row[];
let nextId = 1;

function holder(): StoreHolder {
  const unique = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
  const prisma: any = {
    merchant: { findUnique: async ({ where }: any) => (where.id === 7 ? { id: 7 } : null) },
    plan: { findMany: async () => PLANS },
    subscription: {
      findUnique: async ({ include }: any) =>
        subscription ? { ...subscription, ...(include?.plan ? { plan: PLANS.find((p) => p.id === subscription.planId) } : {}) } : null,
      update: async ({ data }: any) => Object.assign(subscription, data),
      create: async ({ data }: any) => (subscription = { id: 70, ...data }),
    },
    subscriptionActivity: { create: async ({ data }: any) => activities.push(data) },
    payment: { create: async () => ({}), updateMany: async () => ({ count: 0 }) },
    billingWebhookEvent: {
      create: async ({ data }: any) => {
        if (events.some((e) => e.eventId === data.eventId)) throw unique();
        const row = { id: nextId++, ...data };
        events.push(row);
        return row;
      },
      delete: async ({ where }: any) => (events = events.filter((e) => e.id !== where.id)),
    },
    merchantRole: { findUnique: async () => null, findFirst: async () => null },
  };
  const db: any = {
    prisma,
    users: {
      findById: async () => ({ id: 9, role: 'MERCHANT', isActive: true, merchantId: 7, outletId: null, passwordChangedAt: null, permissionsChangedAt: null }),
    },
    sessions: { getSessionStatus: async () => 'active' },
    merchants: {
      findById: async () => ({
        id: 7,
        name: 'Tiệm Áo Dài',
        subscription: { ...subscription, plan: PLANS.find((p) => p.id === subscription.planId) },
      }),
    },
  };
  return { db, prisma };
}

let POST: (req: any) => Promise<any>;
let authenticateRequest: (req: any) => Promise<{ success: boolean; response?: any }>;

function load() {
  const h = holder();
  POST = loadRoute('webhooks/revenuecat', h, THIS_ROOT, { realAuth: true }).POST;
  authenticateRequest = require('@rentalshop/auth/server').authenticateRequest;
}

const bearer = () =>
  `Bearer ${jsonwebtoken.sign(
    { userId: 9, email: 'owner@test', role: 'MERCHANT', merchantId: 7, outletId: null, sessionId: 's1', passwordChangedAt: null, permissionsChangedAt: null },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  )}`;

/** An API call of the shop's owner from the app, through the real authenticateRequest */
async function access(): Promise<{ ok: boolean; code?: string }> {
  const result = await authenticateRequest(
    request('/api/orders', { headers: { authorization: bearer(), 'x-client-platform': 'mobile', 'x-device-type': 'ios' } }),
  );
  return result.success ? { ok: true } : { ok: false, code: result.response?.body?.code };
}

let seq = 0;
async function send(type: string, over: Row = {}) {
  seq += 1;
  const now = Date.now();
  const event = {
    id: `evt-${seq}`,
    type,
    app_user_id: 'merchant_7',
    product_id: 'anyrent_merchant_annual',
    store: 'APP_STORE',
    environment: 'PRODUCTION',
    purchased_at_ms: now,
    expiration_at_ms: now + 365 * DAY,
    event_timestamp_ms: now,
    price_in_purchased_currency: 1799000,
    currency: 'VND',
    transaction_id: `tx-${seq}`,
    ...over,
  };
  const res = await POST(request('/api/webhooks/revenuecat', { body: { api_version: '1.0', event }, headers: { authorization: `Bearer ${SECRET}` } }));
  expect(res.status).toBe(200);
  return res;
}

beforeEach(() => {
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  activities = [];
  events = [];
  seq = 0;
  subscription = {
    id: 70, merchantId: 7, planId: 2, status: 'ACTIVE', amount: 1799000, currency: 'VND', interval: 'annual', intervalCount: 1,
    currentPeriodStart: new Date(Date.now() - 360 * DAY), currentPeriodEnd: new Date(Date.now() + 5 * DAY),
    cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null,
    billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', storeOriginalTransactionId: 'otx', autoRenew: true, billingIssueAt: null,
  };
  load();
});

const lastText = () => activities[activities.length - 1]?.description as string;

describe('store BILLING_ISSUE keeps the shop open until the period (and the store grace) ends', () => {
  it('the period runs: status stays ACTIVE, flag set, auto-renew untouched, the API still answers', async () => {
    await send('BILLING_ISSUE');
    expect(subscription.status).toBe('ACTIVE');
    expect(subscription.billingIssueAt).toBeInstanceOf(Date);
    expect(subscription.autoRenew).toBe(true);
    expect(await access()).toEqual({ ok: true });
    expect(lastText()).toContain('App Store chưa thu được tiền gia hạn');
  });

  it('Google Play too', async () => {
    subscription.billingChannel = 'PLAY_STORE';
    await send('BILLING_ISSUE', { store: 'PLAY_STORE', product_id: 'anyrent_merchant_annual:annual' });
    expect(subscription.status).toBe('ACTIVE');
    expect(await access()).toEqual({ ok: true });
  });

  it('a row left PAST_DUE by the old webhook is opened again by the next billing issue', async () => {
    subscription.status = 'PAST_DUE';
    expect((await access()).code).toBe('SUBSCRIPTION_PAST_DUE');
    await send('BILLING_ISSUE');
    expect(subscription.status).toBe('ACTIVE');
    expect(await access()).toEqual({ ok: true });
  });

  it('grace period: the original expiry passed, the store grace extends access and the history says until when', async () => {
    subscription.currentPeriodEnd = new Date(Date.now() - HOUR);
    expect((await access()).code).toBe('SUBSCRIPTION_EXPIRED');
    const graceEnd = Date.now() + 6 * DAY;
    await send('BILLING_ISSUE', { grace_period_expiration_at_ms: graceEnd });
    expect(subscription.currentPeriodEnd.getTime()).toBe(graceEnd);
    expect(await access()).toEqual({ ok: true });
    expect(lastText()).toMatch(/dùng thêm đến \d{2}\/\d{2}\/\d{4}/);
  });

  it('a grace end before the current period end changes nothing', async () => {
    const end = subscription.currentPeriodEnd.getTime();
    await send('BILLING_ISSUE', { grace_period_expiration_at_ms: Date.now() + DAY });
    expect(subscription.currentPeriodEnd.getTime()).toBe(end);
  });

  it('RENEWAL, UNCANCELLATION and PRODUCT_CHANGE clear the flag', async () => {
    await send('BILLING_ISSUE');
    await send('RENEWAL');
    expect(subscription.billingIssueAt).toBeNull();
    await send('BILLING_ISSUE');
    await send('UNCANCELLATION');
    expect(subscription.billingIssueAt).toBeNull();
    await send('BILLING_ISSUE');
    await send('PRODUCT_CHANGE', { new_product_id: 'anyrent_professional_annual' });
    expect(subscription.billingIssueAt).toBeNull();
    expect(subscription.planId).toBe(3);
  });

  it('unpaid when the grace ends: EXPIRATION ends access', async () => {
    subscription.currentPeriodEnd = new Date(Date.now() - HOUR);
    await send('BILLING_ISSUE', { grace_period_expiration_at_ms: Date.now() + 6 * DAY });
    expect(await access()).toEqual({ ok: true });
    // the grace ran out
    subscription.currentPeriodEnd = new Date(Date.now() - 1000);
    await send('EXPIRATION', { expiration_reason: 'BILLING_ERROR' });
    expect(subscription.status).toBe('EXPIRED');
    expect(subscription.autoRenew).toBe(false);
    expect((await access()).code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('other channels keep today\'s rule: PAST_DUE still blocks (phase 2 decides)', async () => {
    subscription.billingChannel = 'LEMON';
    subscription.status = 'PAST_DUE';
    expect((await access()).code).toBe('SUBSCRIPTION_PAST_DUE');
  });
});
