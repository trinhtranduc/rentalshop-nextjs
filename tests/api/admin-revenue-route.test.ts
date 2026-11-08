/**
 * #1482 — GET /api/admin/revenue/monthly.
 * Platform ops only (ADMIN, OPS); a merchant is rejected. Reads plan payments through `db.prisma.payment.findMany`
 * with SQL-side date bounds (Vietnam civil days) and answers with the aggregation of `lib/admin-revenue`.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockRoles: string[][] = [];
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: (roles: string[]) => {
    mockRoles.push(roles);
    return (handler: any) => (request: any) =>
      roles.includes(request.role)
        ? handler(request, { user: { id: 1, role: request.role }, userScope: {} })
        : { body: { success: false, code: 'INSUFFICIENT_PERMISSIONS' }, status: 403 };
  },
}));

type Row = Record<string, any>;
const store: { payments: Row[]; merchants: Row[]; activities: Row[] } = { payments: [], merchants: [], activities: [] };
const calls: any[] = [];

/** Just enough of Prisma's `where` for the shapes the route sends: field equals / in / not / gte / lte / lt, OR. */
const test = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((sub) => test(row, sub));
    const value = row[key] === undefined ? null : row[key];
    if (cond === null) return value === null;
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (typeof cond === 'object') {
      const c = cond as Row;
      if ('in' in c && !c.in.includes(value)) return false;
      if ('not' in c && value === c.not) return false;
      if ('gte' in c && !(value !== null && value >= c.gte)) return false;
      if ('lte' in c && !(value !== null && value <= c.lte)) return false;
      if ('lt' in c && !(value !== null && value < c.lt)) return false;
      return true;
    }
    return value === cond;
  });

jest.mock('@rentalshop/database', () => ({
  db: {
    prisma: {
      // #1505: the activity log read for the estimate
      subscriptionActivity: {
        findMany: async (args: any) => {
          calls.push(args);
          return store.activities.filter((a) => test(a, args.where));
        },
      },
      payment: {
        findMany: async (args: any) => {
          calls.push(args);
          let rows = store.payments.filter((p) => test(p, args.where));
          if (args.distinct) {
            const seen = new Set();
            rows = rows.filter((p) => (seen.has(p.merchantId) ? false : seen.add(p.merchantId)));
          }
          return rows.map((p) => ({
            ...p,
            merchant: p.merchantId ? store.merchants.find((m) => m.id === p.merchantId) ?? null : null,
            subscription: p.planName ? { plan: { name: p.planName } } : null,
          }));
        },
      },
    },
  },
}));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  ...jest.requireActual('../../packages/utils/src/core/plan-extension-estimate'),
  getLocalDateKey: jest.requireActual('../../packages/utils/src/core/date').getLocalDateKey,
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (errors: any) => ({ success: false, code: 'VALIDATION_ERROR', errors }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/admin/revenue/monthly/route';

const NOW = new Date('2026-11-04T03:00:00.000Z'); // 4 Nov 2026 10:00 VN
let id = 0;
const pay = (over: Row = {}): Row => {
  id += 1;
  const at = over.at ?? '2026-11-02T05:00:00.000Z';
  const { at: _a, ...rest } = over;
  return {
    id, amount: 100000, currency: 'VND', method: 'IAP_APPLE', type: 'SUBSCRIPTION_PAYMENT', status: 'COMPLETED',
    processedAt: new Date(at), createdAt: new Date(at), refundedAt: null, updatedAt: new Date(at),
    merchantId: 1, planName: 'Basic', ...rest,
  };
};
const call = (qs: string, role = 'ADMIN') => (GET as any)({ url: `http://x/api/admin/revenue/monthly${qs}`, role });

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  store.payments = [];
  store.activities = [];
  store.merchants = [{ id: 1, name: 'Shop A' }, { id: 2, name: 'Shop B' }];
  calls.length = 0;
});
afterEach(() => jest.useRealTimers());

describe('roles', () => {
  it('is registered for ADMIN and OPS only', () => {
    expect(mockRoles).toEqual([['ADMIN', 'OPS']]);
  });

  it.each(['ADMIN', 'OPS'])('%s gets the report', async (role) => {
    const res = await call('?month=2026-11', role);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it.each(['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'ARTICLE'])('%s is rejected with 403 and nothing is read', async (role) => {
    const res = await call('?month=2026-11', role);
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
});

describe('query', () => {
  it.each(['', '?month=2026-13', '?month=2026-11&year=2026', '?year=abc', '?month=2026-11-03'])('%s → 400 INVALID_QUERY', async (qs) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
    expect(calls).toHaveLength(0);
  });
});

const PLAN_TYPES = ['SUBSCRIPTION_PAYMENT', 'PLAN_EXTENSION', 'PLAN_CHANGE'];

describe('what is read', () => {
  it('plan money types (subscription payment, manual extension, add-on / plan change), COMPLETED or REFUNDED, bounded by Vietnam days of the year', async () => {
    await call('?month=2026-11');
    const received = calls[0];
    expect(received.where.type).toEqual({ in: PLAN_TYPES });
    expect(received.where.status).toEqual({ in: ['COMPLETED', 'REFUNDED'] });
    const [byProcessed, byCreated] = received.where.OR;
    expect(byProcessed.processedAt.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(byProcessed.processedAt.lte.toISOString()).toBe('2026-12-31T16:59:59.999Z');
    expect(byCreated.processedAt).toBeNull();
    expect(byCreated.createdAt.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    const refunds = calls[1];
    expect(refunds.where.status).toBe('REFUNDED');
    expect(refunds.where.type).toEqual({ in: PLAN_TYPES });
  });

  it('ORDER_PAYMENT and pending / failed / cancelled rows are not in the answer', async () => {
    store.payments = [
      pay({ amount: 10 }),
      pay({ type: 'ORDER_PAYMENT', amount: 1000 }),
      pay({ status: 'PENDING', amount: 4000 }),
      pay({ status: 'FAILED', amount: 8000 }),
      pay({ status: 'CANCELLED', amount: 16000 }),
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ total: 10, count: 1 });
  });

  it('a COMPLETED PLAN_EXTENSION (admin Extend, manual money) on 03/11 Vietnam time counts in November', async () => {
    store.payments = [pay({ type: 'PLAN_EXTENSION', method: 'MANUAL', amount: 600000, at: '2026-11-02T17:30:00.000Z' })];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ total: 600000, count: 1 });
    expect(res.body.data.daily.find((d: any) => d.date === '2026-11-03')).toMatchObject({ total: 600000, count: 1 });
    expect(res.body.data.byChannel.find((c: any) => c.channel === 'TRANSFER')).toMatchObject({ total: 600000, count: 1 });
  });

  it('a COMPLETED PLAN_CHANGE (add-on paid by card) counts; a PENDING PLAN_CHANGE does not, even with a processedAt', async () => {
    store.payments = [
      pay({ type: 'PLAN_CHANGE', method: 'STRIPE', amount: 70000 }),
      pay({ type: 'PLAN_CHANGE', method: 'TRANSFER', status: 'PENDING', amount: 90000 }), // awaits confirmation, processedAt set by `paymentDate`
      pay({ type: 'PLAN_CHANGE', method: 'TRANSFER', status: 'PENDING', amount: 5000, processedAt: null }),
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ total: 70000, count: 1 });
    expect(res.body.data.byChannel.find((c: any) => c.channel === 'CARD')).toMatchObject({ total: 70000, count: 1 });
  });

  it('a COMPLETED PLAN_CHANGE without processedAt falls back to createdAt', async () => {
    store.payments = [pay({ type: 'PLAN_CHANGE', method: 'STRIPE', amount: 70000, processedAt: null, createdAt: new Date('2026-11-01T04:00:00.000Z') })];
    const res = await call('?month=2026-11');
    expect(res.body.data.daily.find((d: any) => d.date === '2026-11-01')).toMatchObject({ total: 70000, count: 1 });
  });

  it('the refund line takes the same types: a refunded PLAN_EXTENSION shows, a refunded ORDER_PAYMENT does not', async () => {
    store.payments = [
      pay({ type: 'PLAN_EXTENSION', method: 'MANUAL', status: 'REFUNDED', amount: 300000, at: '2026-10-10T05:00:00.000Z', refundedAt: new Date('2026-11-03T05:00:00.000Z') }),
      pay({ type: 'ORDER_PAYMENT', method: 'CASH', status: 'REFUNDED', amount: 111111, at: '2026-10-10T05:00:00.000Z', refundedAt: new Date('2026-11-03T05:00:00.000Z') }),
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.refunds).toEqual({ total: 300000, count: 1 });
    const oct = await call('?month=2026-10');
    expect(oct.body.data.received).toMatchObject({ total: 300000, count: 1 }); // still received in October
  });
});

describe('answer', () => {
  it('Vietnam day boundary, refund by refundedAt, null processedAt, other currency, shop as numeric id', async () => {
    store.payments = [
      pay({ at: '2026-11-02T17:30:00.000Z', amount: 300000 }), // 03/11 00:30 VN
      pay({ processedAt: null, createdAt: new Date('2026-11-01T05:00:00.000Z'), amount: 100000, merchantId: 2, planName: 'Pro', method: 'IAP_GOOGLE' }),
      pay({ amount: 11, currency: 'USD', method: 'IAP_APPLE', merchantId: 2 }),
      pay({ at: '2026-10-10T05:00:00.000Z', amount: 250000, status: 'REFUNDED', refundedAt: new Date('2026-11-03T05:00:00.000Z'), merchantId: 2, method: 'IAP_GOOGLE' }),
    ];
    const res = await call('?month=2026-11');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(res.body.code).toBe('ADMIN_REVENUE_SUCCESS');
    expect(d).toMatchObject({ scope: 'month', month: '2026-11', year: 2026, todayKey: '2026-11-04' });
    expect(d.received).toMatchObject({ total: 400000, count: 2 });
    expect(d.daily.find((x: any) => x.date === '2026-11-03')).toMatchObject({ total: 300000, count: 1 });
    expect(d.daily.find((x: any) => x.date === '2026-11-01')).toMatchObject({ total: 100000, count: 1 });
    expect(d.refunds).toEqual({ total: 250000, count: 1 });
    expect(d.otherCurrencies).toEqual([{ currency: 'USD', total: 11, count: 1, refundTotal: 0, refundCount: 0 }]);
    expect(d.months[9]).toMatchObject({ month: '2026-10', total: 250000, count: 1, refundTotal: 0 });
    expect(d.months[10]).toMatchObject({ month: '2026-11', total: 400000, refundTotal: 250000, refundCount: 1 });
    expect(d.latest.find((l: any) => l.currency === 'USD').merchant).toEqual({ id: 2, name: 'Shop B' });
    expect(JSON.stringify(d)).not.toMatch(/cuid|"c[a-z0-9]{24}"/);
  });

  it('?year= returns the whole year with the same 12 months', async () => {
    store.payments = [pay({ at: '2026-03-02T05:00:00.000Z', amount: 5 }), pay({ at: '2026-11-02T05:00:00.000Z', amount: 7 })];
    const res = await call('?year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ scope: 'year', month: null, year: 2026, daily: [], previous: null });
    expect(res.body.data.received).toMatchObject({ total: 12, count: 2 });
    expect(res.body.data.months).toHaveLength(12);
  });

  it('a shop that paid before the year only renews (earlier-payment lookup)', async () => {
    store.payments = [
      pay({ at: '2025-06-02T05:00:00.000Z', merchantId: 1 }),
      pay({ at: '2026-11-02T05:00:00.000Z', merchantId: 1 }),
      pay({ at: '2026-11-03T05:00:00.000Z', merchantId: 2 }),
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ count: 2, newCount: 1, renewalCount: 1 });
    const earlier = calls[2];
    expect(earlier.distinct).toEqual(['merchantId']);
    expect(earlier.where.merchantId).toEqual({ in: expect.arrayContaining([1, 2]) });
  });

  it('"new" is the first received payment of a shop whatever its type', async () => {
    store.payments = [
      pay({ at: '2025-06-02T05:00:00.000Z', merchantId: 1, type: 'PLAN_EXTENSION', method: 'MANUAL' }), // shop 1 paid before 2026 by a manual extension
      pay({ at: '2026-11-02T05:00:00.000Z', merchantId: 1 }), // so this subscription payment is a renewal
      pay({ at: '2026-11-03T05:00:00.000Z', merchantId: 2, type: 'PLAN_EXTENSION', method: 'MANUAL' }), // first payment of shop 2, of type PLAN_EXTENSION
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ count: 2, newCount: 1, renewalCount: 1 });
    expect(calls[2].where.type).toEqual({ in: PLAN_TYPES });
  });

  it('an empty month answers 200 with zeros (the UI shows its empty state)', async () => {
    const res = await call('?month=2026-02');
    expect(res.status).toBe(200);
    expect(res.body.data.received).toEqual({ total: 0, count: 0, newCount: 0, renewalCount: 0 });
    expect(res.body.data.latest).toEqual([]);
  });
});

describe('estimated (#1505)', () => {
  const activity = (over: Row = {}): Row => ({
    id: 900, subscriptionId: 7, type: 'subscription_extended', createdAt: new Date('2026-08-05T03:00:00.000Z'),
    metadata: JSON.stringify({ method: 'MANUAL_EXTENSION', amount: 237000 }),
    subscription: { id: 7, merchantId: 1, currency: 'VND', amount: 79000, period: 1, merchant: { name: 'Shop A' }, plan: { basePrice: 79000 } },
    ...over,
  });

  it('an old manual extension without a Payment shows in `estimated`, never in `received`', async () => {
    store.activities = [activity()];
    const res = await call('?year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data.received.total).toBe(0);
    expect(res.body.data.estimated.total).toBe(237000);
    expect(res.body.data.estimated.months.find((m: Row) => m.month === '2026-08')).toMatchObject({ total: 237000, count: 1 });
    expect(res.body.data.estimated.items[0]).toMatchObject({ dateKey: '2026-08-05', kind: 'EXTENSION', merchant: { id: 1, name: 'Shop A' } });
  });

  it('the same extension with a real Payment is counted once, in `received`', async () => {
    store.activities = [activity()];
    store.payments = [pay({ type: 'PLAN_EXTENSION', method: 'MANUAL', amount: 237000, subscriptionId: 7, at: '2026-08-05T03:00:30.000Z' })];
    const res = await call('?year=2026');
    expect(res.body.data.received.total).toBe(237000);
    expect(res.body.data.estimated.total).toBe(0);
  });

  it('answers an empty estimate when there is nothing old to estimate', async () => {
    const res = await call('?month=2026-11');
    expect(res.body.data.estimated).toMatchObject({ total: 0, count: 0, items: [] });
    expect(res.body.data.estimated.months).toHaveLength(12);
  });

  it('reads only the extension and plan-change activities of the Vietnam year', async () => {
    await call('?month=2026-11');
    const read = calls.find((c) => c.where?.type?.in?.includes('MANUAL_EXTENSION'));
    expect(read.where.type.in.sort()).toEqual(['MANUAL_EXTENSION', 'plan_changed', 'subscription_extended', 'subscription_plan_changed']);
    expect(read.where.createdAt.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(read.where.createdAt.lte.toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });
});
