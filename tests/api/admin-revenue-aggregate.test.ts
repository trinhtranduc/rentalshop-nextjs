/**
 * #1482 — admin Dashboard "Doanh thu gói dịch vụ": the aggregation of plan payments.
 * Money received counts by `processedAt` (null → `createdAt`) on the Vietnam civil day; a refund is shown separately by
 * `refundedAt` and never changes the month it was received in; other currencies are never added to the VND total.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: the results must be identical.
 */
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  getLocalDateKey: jest.requireActual('../../packages/utils/src/core/date').getLocalDateKey,
}));

import {
  buildRevenueReport,
  channelOfMethod,
  parseRevenueQuery,
  revenueFetchRange,
  type RevenuePaymentRow,
} from '../../apps/api/lib/admin-revenue';

let seq = 0;
const row = (over: Partial<RevenuePaymentRow> & { at?: string }): RevenuePaymentRow => {
  seq += 1;
  const at = over.at ?? '2026-11-02T05:00:00.000Z';
  const { at: _ignored, ...rest } = over;
  return {
    id: seq,
    amount: 100000,
    currency: 'VND',
    method: 'IAP_APPLE',
    status: 'COMPLETED',
    processedAt: new Date(at),
    createdAt: new Date(at),
    refundedAt: null,
    updatedAt: new Date(at),
    merchantId: 1,
    merchantName: 'Shop A',
    planName: 'Basic',
    ...rest,
  };
};

const NOV = parseRevenueQuery({ month: '2026-11' })!;
const TODAY = '2026-11-04';
const report = (received: RevenuePaymentRow[], refunded: RevenuePaymentRow[] = [], query = NOV, earlier: number[] = []) =>
  buildRevenueReport({ query, todayKey: TODAY, received, refunded, earlierMerchantIds: new Set(earlier) });

describe('query and ranges', () => {
  it('reads month=YYYY-MM or year=YYYY, nothing else', () => {
    expect(parseRevenueQuery({ month: '2026-11' })).toEqual({ scope: 'month', month: '2026-11', year: 2026 });
    expect(parseRevenueQuery({ year: '2026' })).toEqual({ scope: 'year', year: 2026 });
    for (const bad of [{}, { month: '2026-13' }, { month: '2026-00' }, { month: '26-11' }, { month: '2026-11-03' }, { year: '20x6' }, { year: '1999' }]) {
      expect(parseRevenueQuery(bad as any)).toBeNull();
    }
    expect(parseRevenueQuery({ month: '2026-11', year: '2026' })).toBeNull();
  });

  it('the fetch range of a month covers its year and the previous month (December before a January)', () => {
    const nov = revenueFetchRange(NOV);
    expect(nov.start.toISOString()).toBe('2025-12-31T17:00:00.000Z'); // 1 Jan 2026 00:00 VN
    expect(nov.end.toISOString()).toBe('2026-12-31T16:59:59.999Z'); // 31 Dec 23:59:59.999 VN
    const jan = revenueFetchRange(parseRevenueQuery({ month: '2026-01' })!);
    expect(jan.start.toISOString()).toBe('2025-11-30T17:00:00.000Z'); // 1 Dec 2025 00:00 VN
  });
});

describe('Vietnam day boundary', () => {
  it('00:30 on 03/11 Vietnam (17:30Z on 02/11) belongs to 03/11; 16:59:59Z on 02/11 to 02/11; 17:00:00Z to 03/11', () => {
    const r = report([
      row({ at: '2026-11-02T17:30:00.000Z', amount: 1000 }),
      row({ at: '2026-11-02T16:59:59.000Z', amount: 20 }),
      row({ at: '2026-11-02T17:00:00.000Z', amount: 300 }),
    ]);
    const day = (d: string) => r.daily.find((x) => x.date === d)!;
    expect(day('2026-11-03')).toMatchObject({ total: 1300, count: 2 });
    expect(day('2026-11-02')).toMatchObject({ total: 20, count: 1 });
  });

  it('the last second of a month (16:59:59Z on the 30th) stays, 17:00:00Z moves to the next month', () => {
    const r = report([row({ at: '2026-10-31T16:59:59.000Z', amount: 5 }), row({ at: '2026-10-31T17:00:00.000Z', amount: 7 })]);
    expect(r.received.total).toBe(7); // November has only the second one
    expect(r.months.find((m) => m.month === '2026-10')!.total).toBe(5);
    expect(r.months.find((m) => m.month === '2026-11')!.total).toBe(7);
  });

  it('daily lists every Vietnam day of the month, zero filled (30 in November, 29 in Feb 2028)', () => {
    expect(report([]).daily).toHaveLength(30);
    const feb = report([], [], parseRevenueQuery({ month: '2028-02' })!);
    expect(feb.daily).toHaveLength(29);
    expect(feb.daily[0].date).toBe('2028-02-01');
    expect(feb.daily.every((d) => d.total === 0 && d.count === 0)).toBe(true);
  });

  it('returns todayKey so the UI never needs the browser clock', () => {
    expect(report([]).todayKey).toBe(TODAY);
  });
});

describe('which payments count', () => {
  it('a null processedAt falls back to createdAt', () => {
    const r = report([row({ processedAt: null, createdAt: new Date('2026-11-02T17:30:00.000Z'), amount: 500 })]);
    expect(r.daily.find((d) => d.date === '2026-11-03')).toMatchObject({ total: 500, count: 1 });
  });

  it('PENDING, FAILED and CANCELLED never count', () => {
    const r = report(['PENDING', 'FAILED', 'CANCELLED'].map((status) => row({ status, amount: 999 })));
    expect(r.received).toMatchObject({ total: 0, count: 0 });
    expect(r.latest).toHaveLength(0);
  });

  it('other currencies stay out of the VND total and get their own line, no conversion', () => {
    const r = report([
      row({ amount: 250000 }),
      row({ amount: 11, currency: 'USD' }),
      row({ amount: 4.5, currency: 'USD' }),
      row({ amount: 3, currency: 'EUR' }),
    ]);
    expect(r.received).toMatchObject({ total: 250000, count: 1 });
    expect(r.byChannel.reduce((s, c) => s + c.total, 0)).toBe(250000);
    expect(r.otherCurrencies).toEqual([
      { currency: 'EUR', total: 3, count: 1, refundTotal: 0, refundCount: 0 },
      { currency: 'USD', total: 15.5, count: 2, refundTotal: 0, refundCount: 0 },
    ]);
    expect(r.daily.reduce((s, d) => s + d.total, 0)).toBe(250000);
  });

  it('the latest payments keep the other-currency rows with their own currency', () => {
    const r = report([row({ amount: 11, currency: 'USD' })]);
    expect(r.latest[0]).toMatchObject({ amount: 11, currency: 'USD' });
  });
});

describe('refunds are separate and dated by refundedAt', () => {
  it('a refunded payment still counts as received in its own month; the refund shows in the month it happened', () => {
    const oct = row({
      at: '2026-10-10T05:00:00.000Z', amount: 250000, status: 'REFUNDED',
      refundedAt: new Date('2026-11-03T05:00:00.000Z'),
    });
    const nov = report([oct], [oct]);
    expect(nov.received).toMatchObject({ total: 0, count: 0 });
    expect(nov.refunds).toEqual({ total: 250000, count: 1 });
    const octReport = report([oct], [oct], parseRevenueQuery({ month: '2026-10' })!);
    expect(octReport.received).toMatchObject({ total: 250000, count: 1 });
    expect(octReport.refunds).toEqual({ total: 0, count: 0 });
    expect(octReport.latest[0].status).toBe('REFUNDED');
  });

  it('a refund in the same month is in both, and the total is not reduced', () => {
    const p = row({ amount: 100000, status: 'REFUNDED', at: '2026-11-02T05:00:00.000Z', refundedAt: new Date('2026-11-03T05:00:00.000Z') });
    const r = report([p, row({ amount: 40000 })], [p]);
    expect(r.received.total).toBe(140000);
    expect(r.refunds).toEqual({ total: 100000, count: 1 });
  });

  it('without refundedAt (refunded before this change) the date falls back to updatedAt', () => {
    const p = row({ at: '2026-09-10T05:00:00.000Z', status: 'REFUNDED', refundedAt: null, updatedAt: new Date('2026-11-02T17:30:00.000Z'), amount: 70000 });
    const r = report([], [p]);
    expect(r.refunds).toEqual({ total: 70000, count: 1 });
    expect(r.months.find((m) => m.month === '2026-11')!.refundTotal).toBe(70000);
  });

  it('refunds in another currency go to that currency line, not the VND refunds', () => {
    const p = row({ currency: 'USD', amount: 11, status: 'REFUNDED', refundedAt: new Date('2026-11-03T05:00:00.000Z') });
    const r = report([p], [p]);
    expect(r.refunds).toEqual({ total: 0, count: 0 });
    expect(r.otherCurrencies).toEqual([{ currency: 'USD', total: 11, count: 1, refundTotal: 11, refundCount: 1 }]);
  });
});

describe('channels', () => {
  it.each([
    ['IAP_APPLE', 'APP_STORE'],
    ['IAP_GOOGLE', 'GOOGLE_PLAY'],
    ['TRANSFER', 'TRANSFER'],
    ['MANUAL', 'TRANSFER'],
    ['CASH', 'TRANSFER'],
    ['LEMON_SQUEEZY', 'CARD'],
    ['STRIPE', 'CARD'],
    ['PAYPAL', 'OTHER'],
    ['CHECK', 'OTHER'],
  ])('%s → %s', (method, channel) => {
    expect(channelOfMethod(method)).toBe(channel);
  });

  it('lists the four channels always, OTHER only when it has money, and sums to the total', () => {
    const empty = report([]);
    expect(empty.byChannel.map((c) => c.channel)).toEqual(['APP_STORE', 'GOOGLE_PLAY', 'TRANSFER', 'CARD']);
    const r = report([
      row({ method: 'IAP_APPLE', amount: 100 }),
      row({ method: 'IAP_GOOGLE', amount: 200 }),
      row({ method: 'MANUAL', amount: 300 }),
      row({ method: 'CASH', amount: 400 }),
      row({ method: 'LEMON_SQUEEZY', amount: 500 }),
      row({ method: 'PAYPAL', amount: 600 }),
    ]);
    expect(r.byChannel).toEqual([
      { channel: 'APP_STORE', total: 100, count: 1 },
      { channel: 'GOOGLE_PLAY', total: 200, count: 1 },
      { channel: 'TRANSFER', total: 700, count: 2 },
      { channel: 'CARD', total: 500, count: 1 },
      { channel: 'OTHER', total: 600, count: 1 },
    ]);
    expect(r.byChannel.reduce((s, c) => s + c.total, 0)).toBe(r.received.total);
  });
});

describe('new and renewal', () => {
  it('the first received payment of a shop is new, the later ones renew; a shop paid before the range only renews', () => {
    const r = report(
      [
        row({ merchantId: 1, at: '2026-11-03T05:00:00.000Z' }),
        row({ merchantId: 1, at: '2026-11-01T05:00:00.000Z' }), // earlier in the month, so this one is the new one
        row({ merchantId: 2, at: '2026-11-02T05:00:00.000Z' }), // paid before 2026 (earlier set) → renewal
        row({ merchantId: null, at: '2026-11-02T05:00:00.000Z' }), // no shop → renewal
      ],
      [],
      NOV,
      [2],
    );
    expect(r.received).toMatchObject({ count: 4, newCount: 1, renewalCount: 3 });
    const nov = r.months.find((m) => m.month === '2026-11')!;
    expect(nov).toMatchObject({ count: 4, newCount: 1, renewalCount: 3 });
  });

  it('a shop whose first payment was in an earlier month of the year is a renewal in later months', () => {
    const r = report([
      row({ merchantId: 5, at: '2026-03-10T05:00:00.000Z' }),
      row({ merchantId: 5, at: '2026-11-02T05:00:00.000Z' }),
    ]);
    expect(r.months.find((m) => m.month === '2026-03')).toMatchObject({ newCount: 1, renewalCount: 0 });
    expect(r.months.find((m) => m.month === '2026-11')).toMatchObject({ newCount: 0, renewalCount: 1 });
  });
});

describe('month and year views', () => {
  const payments = [
    row({ at: '2026-01-05T05:00:00.000Z', amount: 100 }),
    row({ at: '2026-10-20T05:00:00.000Z', amount: 1000 }),
    row({ at: '2026-11-03T05:00:00.000Z', amount: 20000 }),
    row({ at: '2025-12-31T05:00:00.000Z', amount: 9 }), // last year: in the previous-month window of January only
  ];

  it('month: months has 12 entries of the year, previous holds last month daily', () => {
    const r = report(payments);
    expect(r.scope).toBe('month');
    expect(r.month).toBe('2026-11');
    expect(r.months).toHaveLength(12);
    expect(r.months.map((m) => m.month)[0]).toBe('2026-01');
    expect(r.months[9]).toMatchObject({ month: '2026-10', total: 1000, count: 1 });
    expect(r.previous!.month).toBe('2026-10');
    expect(r.previous!.daily).toHaveLength(31);
    expect(r.previous!.daily.find((d) => d.date === '2026-10-20')!.total).toBe(1000);
    expect(r.received.total).toBe(20000);
  });

  it('January compares with December of the year before', () => {
    const r = report(payments, [], parseRevenueQuery({ month: '2026-01' })!);
    expect(r.previous!.month).toBe('2025-12');
    expect(r.previous!.daily.find((d) => d.date === '2025-12-31')!.total).toBe(9);
    expect(r.received.total).toBe(100);
  });

  it('year: whole-year totals, no daily series, no previous, latest of the year', () => {
    const r = report(payments, [], parseRevenueQuery({ year: '2026' })!);
    expect(r.scope).toBe('year');
    expect(r.month).toBeNull();
    expect(r.daily).toEqual([]);
    expect(r.previous).toBeNull();
    expect(r.received).toMatchObject({ total: 21100, count: 3 });
    expect(r.latest.map((l) => l.amount)).toEqual([20000, 1000, 100]);
  });

  it('a month in the future returns zeros', () => {
    const r = report(payments, [], parseRevenueQuery({ month: '2026-12' })!);
    expect(r.received).toMatchObject({ total: 0, count: 0 });
    expect(r.latest).toEqual([]);
  });
});

describe('latest payments', () => {
  it('10 newest first, with shop, plan, channel and the Vietnam day', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({ at: `2026-11-0${1 + (i % 4)}T0${i % 10}:00:00.000Z`, amount: 1000 + i, merchantId: i + 1, merchantName: `Shop ${i + 1}`, planName: i === 0 ? null : 'Pro', method: 'IAP_GOOGLE' }),
    );
    const r = report(rows);
    expect(r.latest).toHaveLength(10);
    const times = r.latest.map((l) => Date.parse(l.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(r.latest[0]).toEqual(expect.objectContaining({ channel: 'GOOGLE_PLAY', status: 'COMPLETED', currency: 'VND' }));
    expect(r.latest[0].merchant).toEqual({ id: expect.any(Number), name: expect.stringMatching(/^Shop /) });
    expect(r.latest[0].dateKey).toMatch(/^2026-11-0\d$/);
  });

  it('a payment without a shop has merchant null', () => {
    const r = report([row({ merchantId: null, merchantName: null })]);
    expect(r.latest[0].merchant).toBeNull();
  });
});
