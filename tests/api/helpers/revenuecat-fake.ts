/**
 * #1459 In-memory rows for the RevenueCat webhook tests (merchants, plans, subscriptions, activities, payments, processed
 * event ids). A test file mocks `@rentalshop/database` with `fakePrisma` and drives `POST` with `send`.
 */
type Row = Record<string, any>;

export const store: {
  merchants: Row[];
  plans: Row[];
  subscriptions: Row[];
  activities: Row[];
  payments: Row[];
  events: Row[];
} = { merchants: [], plans: [], subscriptions: [], activities: [], payments: [], events: [] };

let nextId = 1000;
const uniqueError = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && !(v instanceof Date) ? true : row[k] === v));
const withPlan = (row: Row | undefined, include?: any) =>
  row ? { ...row, ...(include?.plan ? { plan: store.plans.find((p) => p.id === row.planId) ?? null } : {}) } : null;

export const fakePrisma = {
  merchant: { findUnique: async ({ where }: any) => store.merchants.find((m) => m.id === where.id) ?? null },
  plan: {
    findMany: async ({ where }: any = {}) => store.plans.filter((p) => matches(p, where)),
    findFirst: async ({ where }: any = {}) => store.plans.find((p) => matches(p, where)) ?? null,
  },
  subscription: {
    findUnique: async ({ where, include }: any) => withPlan(store.subscriptions.find((s) => s.merchantId === where.merchantId), include),
    update: async ({ where, data }: any) => {
      const row = store.subscriptions.find((s) => s.merchantId === where.merchantId);
      if (!row) throw new Error('not found');
      Object.assign(row, data);
      return { ...row };
    },
    create: async ({ data }: any) => {
      if (store.subscriptions.some((s) => s.merchantId === data.merchantId)) throw uniqueError();
      const row = { id: nextId++, cancelAtPeriodEnd: false, autoRenew: false, lastStoreEventAt: null, storeBonusMs: null, ...data };
      store.subscriptions.push(row);
      return { ...row };
    },
  },
  subscriptionActivity: { create: async ({ data }: any) => store.activities.push({ id: nextId++, ...data }) },
  payment: {
    create: async ({ data }: any) => store.payments.push({ id: nextId++, ...data }),
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

export const SECRET = 'rc-test-secret';
const DAY = 86400000;

export function reset() {
  for (const k of ['REVENUECAT_APP_USER_ID_PREFIX', 'REVENUECAT_SANDBOX_MERCHANT_IDS']) delete process.env[k];
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  store.merchants = [{ id: 7 }, { id: 8 }];
  store.plans = [
    { id: 1, name: 'Trial', isActive: true, deletedAt: null },
    { id: 2, name: 'Basic', isActive: true, deletedAt: null },
    { id: 3, name: 'Professional', isActive: true, deletedAt: null },
  ];
  store.subscriptions = [
    {
      id: 70, merchantId: 7, planId: 2, status: 'ACTIVE', amount: 1799000, currency: 'VND', interval: 'annual', intervalCount: 1,
      currentPeriodStart: new Date(Date.now() - 360 * DAY), currentPeriodEnd: new Date(Date.now() + 5 * DAY),
      cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null,
      billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', storeOriginalTransactionId: 'otx-7', autoRenew: true,
      billingIssueAt: null, lastStoreEventAt: null, storeBonusMs: null,
    },
  ];
  store.activities = [];
  store.payments = [];
  store.events = [];
  seq = 0;
}

let seq = 0;
/** A RevenueCat event for merchant 7 (App Store, production), fields overridable */
export function event(type: string, over: Row = {}): Row {
  seq += 1;
  const now = Date.now();
  return {
    id: `evt-${seq}-${Math.random().toString(36).slice(2, 8)}`,
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
    original_transaction_id: 'otx-7',
    ...over,
  };
}

export async function send(POST: (r: any) => Promise<any>, ev: Row, auth: string | null = `Bearer ${SECRET}`) {
  const headers = new Map<string, string>();
  if (auth !== null) headers.set('authorization', auth);
  const request: any = {
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => ({ api_version: '1.0', event: ev }),
  };
  return (await POST(request)) as { status: number; body: any };
}

export const sub = (merchantId = 7) => store.subscriptions.find((s) => s.merchantId === merchantId)!;
export const lastActivity = () => store.activities[store.activities.length - 1];
export { DAY };
