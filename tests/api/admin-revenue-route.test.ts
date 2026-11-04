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
const store: { payments: Row[]; merchants: Row[] } = { payments: [], merchants: [] };
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

describe('what is read', () => {
  it('only SUBSCRIPTION_PAYMENT rows, COMPLETED or REFUNDED, bounded by Vietnam days of the year', async () => {
    await call('?month=2026-11');
    const received = calls[0];
    expect(received.where.type).toEqual({ in: ['SUBSCRIPTION_PAYMENT'] });
    expect(received.where.status).toEqual({ in: ['COMPLETED', 'REFUNDED'] });
    const [byProcessed, byCreated] = received.where.OR;
    expect(byProcessed.processedAt.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(byProcessed.processedAt.lte.toISOString()).toBe('2026-12-31T16:59:59.999Z');
    expect(byCreated.processedAt).toBeNull();
    expect(byCreated.createdAt.gte.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    const refunds = calls[1];
    expect(refunds.where.status).toBe('REFUNDED');
    expect(refunds.where.type).toEqual({ in: ['SUBSCRIPTION_PAYMENT'] });
  });

  it('ORDER_PAYMENT, PLAN_CHANGE and pending / failed rows are not in the answer', async () => {
    store.payments = [
      pay({ amount: 10 }),
      pay({ type: 'ORDER_PAYMENT', amount: 1000 }),
      pay({ type: 'PLAN_CHANGE', amount: 2000 }),
      pay({ status: 'PENDING', amount: 4000 }),
      pay({ status: 'FAILED', amount: 8000 }),
    ];
    const res = await call('?month=2026-11');
    expect(res.body.data.received).toMatchObject({ total: 10, count: 1 });
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

  it('an empty month answers 200 with zeros (the UI shows its empty state)', async () => {
    const res = await call('?month=2026-02');
    expect(res.status).toBe(200);
    expect(res.body.data.received).toEqual({ total: 0, count: 0, newCount: 0, renewalCount: 0 });
    expect(res.body.data.latest).toEqual([]);
  });
});
