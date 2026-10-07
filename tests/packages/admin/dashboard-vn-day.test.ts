/**
 * #578 batch C (ADM-7): admin dashboard chart buckets and totals use Vietnam days.
 * Before: the charts bucketed by browser-local hours/days/months; the new-merchant chart sorted by the UTC day but labelled
 * by the local day, so two bars could carry the same label.
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import {
  getDashboardWindow,
  bucketByShopPeriod,
  groupCountsByShopPeriod,
} from '../../../apps/admin/app/dashboard/dashboard-buckets';

const NOW = new Date('2026-10-06T17:30:00.000Z'); // 7 Oct 00:30 VN

describe('dashboard buckets', () => {
  it('window = Vietnam day bounds of the period', () => {
    const month = getDashboardWindow('month', NOW);
    expect([month.startKey, month.endKey, month.groupBy]).toEqual(['2026-10-01', '2026-10-31', 'day']);
    expect(month.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(month.end.toISOString()).toBe('2026-10-31T16:59:59.999Z');
    const today = getDashboardWindow('today', NOW);
    expect([today.startKey, today.endKey]).toEqual(['2026-10-07', '2026-10-07']);
    expect(today.start.toISOString()).toBe('2026-10-06T17:00:00.000Z');
    const year = getDashboardWindow('year', NOW);
    expect([year.startKey, year.endKey, year.groupBy]).toEqual(['2026-01-01', '2026-12-31', 'month']);
  });

  const subs = [
    { createdAt: '2026-09-30T16:59:59.000Z', amount: 1 }, // 30 Sep VN → outside October
    { createdAt: '2026-09-30T17:00:00.000Z', amount: 10 }, // 1 Oct 00:00 VN
    { createdAt: '2026-10-06T17:30:00.000Z', amount: 100 }, // 7 Oct 00:30 VN
    { createdAt: '2026-10-07T10:00:00.000Z', amount: 1000 }, // 7 Oct 17:00 VN
    { createdAt: '2026-10-31T16:59:59.000Z', amount: 5 }, // 31 Oct 23:59:59 VN
    { createdAt: '2026-10-31T17:00:00.000Z', amount: 7 }, // 1 Nov VN → outside October
  ];

  it('month: one bucket per Vietnam day', () => {
    const buckets = bucketByShopPeriod(subs, getDashboardWindow('month', NOW), (s) => s.createdAt, (s) => s.amount);
    expect(buckets).toHaveLength(31);
    expect(buckets[0]).toEqual({ period: 'Oct 1', actual: 10 });
    expect(buckets[6]).toEqual({ period: 'Oct 7', actual: 1100 });
    expect(buckets[30]).toEqual({ period: 'Oct 31', actual: 5 });
    expect(buckets.reduce((sum, b) => sum + b.actual, 0)).toBe(1115);
  });

  it('today: one bucket per Vietnam hour', () => {
    const buckets = bucketByShopPeriod(subs, getDashboardWindow('today', NOW), (s) => s.createdAt, (s) => s.amount);
    expect(buckets).toHaveLength(24);
    expect(buckets[0]).toEqual({ period: '00', actual: 100 });
    expect(buckets[17]).toEqual({ period: '17', actual: 1000 });
  });

  it('year: one bucket per Vietnam month', () => {
    const buckets = bucketByShopPeriod(subs, getDashboardWindow('year', NOW), (s) => s.createdAt, () => 1);
    expect(buckets).toHaveLength(12);
    expect(buckets[8]).toEqual({ period: 'Sep 2026', actual: 1 });
    expect(buckets[9]).toEqual({ period: 'Oct 2026', actual: 4 });
    expect(buckets[10]).toEqual({ period: 'Nov 2026', actual: 1 });
  });

  it('new-merchant counts: one entry per Vietnam day, sorted, labelled by that day', () => {
    const merchants = [
      { createdAt: '2026-10-07T10:00:00.000Z' },
      { createdAt: '2026-10-06T17:30:00.000Z' },
      { createdAt: '2026-10-01T03:00:00.000Z' },
      { createdAt: '2026-09-30T16:00:00.000Z' }, // 30 Sep VN, outside
    ];
    expect(groupCountsByShopPeriod(merchants, getDashboardWindow('month', NOW), (m) => m.createdAt)).toEqual([
      { period: 'Oct 1', actual: 1, projected: 0 },
      { period: 'Oct 7', actual: 2, projected: 0 },
    ]);
    expect(groupCountsByShopPeriod(merchants, getDashboardWindow('year', NOW), (m) => m.createdAt)).toEqual([
      { period: 'Sep', actual: 1, projected: 0 },
      { period: 'Oct', actual: 3, projected: 0 },
    ]);
  });
});
