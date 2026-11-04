/**
 * #1482 — model of the admin "Doanh thu gói dịch vụ" block: the month picker (URL `?month=`), the comparison rule,
 * money formats, bar heights and the CSV. Pure functions; the "today" they use is the Vietnam day the API returns
 * (`todayKey`), never the browser clock. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: the results must be identical.
 */
import {
  canShift,
  channelShare,
  compareWithPrevious,
  barHeights,
  formatOther,
  formatVnd,
  niceMax,
  parseRevenueParam,
  revenueCsv,
  revenueParam,
  shiftMonth,
  shortMoney,
  toggleYear,
} from '../../../apps/admin/app/dashboard/revenue-model';

const TODAY = '2026-11-04';
const daily = (month: string, days: number, byDay: Record<number, number> = {}) =>
  Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, total: byDay[i + 1] ?? 0, count: byDay[i + 1] ? 1 : 0 }));

describe('month picker and URL', () => {
  it('opens on the current month when the URL has no month, or a bad one', () => {
    for (const v of [null, undefined, '', 'abc', '2026-13', '2026-00', '26-11', '2026-11-03', '2027-01', '2019-12', '2027', '1999']) {
      expect(parseRevenueParam(v, TODAY)).toEqual({ mode: 'month', month: '2026-11' });
    }
  });

  it('reads ?month=YYYY-MM, and a bare year as the whole year', () => {
    expect(parseRevenueParam('2026-03', TODAY)).toEqual({ mode: 'month', month: '2026-03' });
    expect(parseRevenueParam('2026-11', TODAY)).toEqual({ mode: 'month', month: '2026-11' });
    expect(parseRevenueParam('2025', TODAY)).toEqual({ mode: 'year', year: 2025 });
    expect(parseRevenueParam('2026', TODAY)).toEqual({ mode: 'year', year: 2026 });
  });

  it('writes the selection back to the URL value', () => {
    expect(revenueParam({ mode: 'month', month: '2026-03' })).toBe('2026-03');
    expect(revenueParam({ mode: 'year', year: 2026 })).toBe('2026');
  });

  it('‹ and › move one month, crossing the year, and stop at the current month and at 2020-01', () => {
    expect(shiftMonth({ mode: 'month', month: '2026-11' }, -1, TODAY)).toEqual({ mode: 'month', month: '2026-10' });
    expect(shiftMonth({ mode: 'month', month: '2026-01' }, -1, TODAY)).toEqual({ mode: 'month', month: '2025-12' });
    expect(shiftMonth({ mode: 'month', month: '2025-12' }, 1, TODAY)).toEqual({ mode: 'month', month: '2026-01' });
    expect(shiftMonth({ mode: 'month', month: '2026-11' }, 1, TODAY)).toEqual({ mode: 'month', month: '2026-11' });
    expect(shiftMonth({ mode: 'month', month: '2020-01' }, -1, TODAY)).toEqual({ mode: 'month', month: '2020-01' });
    expect(canShift({ mode: 'month', month: '2026-11' }, 1, TODAY)).toBe(false);
    expect(canShift({ mode: 'month', month: '2026-10' }, 1, TODAY)).toBe(true);
    expect(canShift({ mode: 'month', month: '2020-01' }, -1, TODAY)).toBe(false);
    expect(canShift({ mode: 'month', month: '2026-11' }, -1, TODAY)).toBe(true);
  });

  it('the arrows are off in the year view', () => {
    const year = { mode: 'year', year: 2026 } as const;
    expect(canShift(year, -1, TODAY)).toBe(false);
    expect(canShift(year, 1, TODAY)).toBe(false);
    expect(shiftMonth(year, -1, TODAY)).toEqual(year);
  });

  it('"Cả năm" turns the shown month into its year, and back to the current month', () => {
    expect(toggleYear({ mode: 'month', month: '2025-07' }, TODAY)).toEqual({ mode: 'year', year: 2025 });
    expect(toggleYear({ mode: 'year', year: 2025 }, TODAY)).toEqual({ mode: 'month', month: '2026-11' });
  });

  it('the Vietnam day that changes at 17:00Z moves the default month at midnight Vietnam time', () => {
    expect(parseRevenueParam(null, '2026-11-30')).toEqual({ mode: 'month', month: '2026-11' });
    expect(parseRevenueParam(null, '2026-12-01')).toEqual({ mode: 'month', month: '2026-12' });
  });
});

describe('comparison rule', () => {
  it('current month: this month so far against the same days of the previous month', () => {
    const cur = daily('2026-11', 30, { 1: 100, 3: 300 }); // 400 so far (today is the 4th)
    const prev = daily('2026-10', 31, { 2: 100, 4: 100, 5: 9999, 20: 9999 }); // days 1-4 = 200, later days must not count
    expect(compareWithPrevious({ selection: { mode: 'month', month: '2026-11' }, todayKey: TODAY, daily: cur, previous: { month: '2026-10', daily: prev } })).toEqual({
      kind: 'change', percent: 100, scope: 'same-days', previousMonth: '2026-10', throughDay: 4, previousTotal: 200,
    });
  });

  it('a completed month: against the whole previous month', () => {
    const cur = daily('2026-10', 31, { 3: 300 });
    const prev = daily('2026-09', 30, { 2: 200, 29: 200 });
    expect(compareWithPrevious({ selection: { mode: 'month', month: '2026-10' }, todayKey: TODAY, daily: cur, previous: { month: '2026-09', daily: prev } })).toEqual({
      kind: 'change', percent: -25, scope: 'whole-month', previousMonth: '2026-09', throughDay: null, previousTotal: 400,
    });
  });

  it('the previous period has no payments: says so, no percent', () => {
    const cur = daily('2026-11', 30, { 1: 100 });
    const prev = daily('2026-10', 31, { 20: 5000 }); // nothing in days 1-4
    expect(compareWithPrevious({ selection: { mode: 'month', month: '2026-11' }, todayKey: TODAY, daily: cur, previous: { month: '2026-10', daily: prev } })).toEqual({
      kind: 'empty', scope: 'same-days', previousMonth: '2026-10', throughDay: 4,
    });
  });

  it('rounds the percent like the mockup', () => {
    const r = compareWithPrevious({
      selection: { mode: 'month', month: '2026-10' }, todayKey: TODAY,
      daily: daily('2026-10', 31, { 1: 1000 }), previous: { month: '2026-09', daily: daily('2026-09', 30, { 1: 3000 }) },
    });
    expect(r).toMatchObject({ kind: 'change', percent: -67 });
  });

  it('a month that is current only by the API todayKey: the day of the month comes from todayKey, not the browser', () => {
    const r = compareWithPrevious({
      selection: { mode: 'month', month: '2026-11' }, todayKey: '2026-11-30',
      daily: daily('2026-11', 30, { 30: 50 }), previous: { month: '2026-10', daily: daily('2026-10', 31, { 30: 50, 31: 70 }) },
    });
    expect(r).toMatchObject({ scope: 'same-days', throughDay: 30, previousTotal: 50, percent: 0 });
  });

  it('January against December of the year before', () => {
    const r = compareWithPrevious({
      selection: { mode: 'month', month: '2026-01' }, todayKey: TODAY,
      daily: daily('2026-01', 31, { 5: 200 }), previous: { month: '2025-12', daily: daily('2025-12', 31, { 31: 100 }) },
    });
    expect(r).toMatchObject({ kind: 'change', scope: 'whole-month', previousMonth: '2025-12', percent: 100 });
  });

  it('the year view has no comparison, only how far the year goes', () => {
    expect(compareWithPrevious({ selection: { mode: 'year', year: 2026 }, todayKey: TODAY, daily: [], previous: null })).toEqual({ kind: 'year', year: 2026, throughMonth: 11 });
    expect(compareWithPrevious({ selection: { mode: 'year', year: 2025 }, todayKey: TODAY, daily: [], previous: null })).toEqual({ kind: 'year', year: 2025, throughMonth: 12 });
  });
});

describe('formats', () => {
  it('VND has no $ prefix and groups like the language', () => {
    expect(formatVnd(1234567, 'vi')).toBe('1.234.567 ₫');
    expect(formatVnd(1234567, 'en')).toBe('1,234,567 ₫');
    expect(formatVnd(0, 'vi')).toBe('0 ₫');
    expect(formatVnd(250000.4, 'vi')).toBe('250.000 ₫');
    expect(formatVnd(1234567, 'vi')).not.toContain('$');
  });

  it('other currencies keep their code and two decimals, never a VND sign', () => {
    expect(formatOther('USD', 11, 'vi')).toBe('USD 11,00');
    expect(formatOther('USD', 1234.5, 'en')).toBe('USD 1,234.50');
  });

  it('short axis labels', () => {
    expect(shortMoney(0, 'vi')).toBe('0');
    expect(shortMoney(250000, 'vi')).toBe('250k');
    expect(shortMoney(1500000, 'vi')).toBe('1,5 tr');
    expect(shortMoney(12000000, 'vi')).toBe('12 tr');
    expect(shortMoney(1500000, 'en')).toBe('1.5M');
  });

  it('channel share', () => {
    expect(channelShare(1, 3, 'vi')).toBe('33,3%');
    expect(channelShare(1, 3, 'en')).toBe('33.3%');
    expect(channelShare(0, 0, 'vi')).toBe('—');
  });
});

describe('bars', () => {
  it('rounds the axis top to 1, 2, 5 or 10 × a power of ten, 1 million when empty', () => {
    expect(niceMax(0)).toBe(1_000_000);
    expect(niceMax(300_000)).toBe(500_000);
    expect(niceMax(1_000_000)).toBe(1_000_000);
    expect(niceMax(1_200_000)).toBe(2_000_000);
    expect(niceMax(6_000_000)).toBe(10_000_000);
  });

  it('a payment day never draws below 1.5%, an empty day is flat', () => {
    expect(barHeights([0, 5, 500_000], 1_000_000)).toEqual([0, 1.5, 50]);
  });
});

describe('CSV', () => {
  const months = [
    { month: '2026-01', total: 1500000, count: 3, newCount: 1, renewalCount: 2, refundTotal: 0, refundCount: 0 },
    { month: '2026-02', total: 0, count: 0, newCount: 0, renewalCount: 0, refundTotal: 250000, refundCount: 1 },
  ];
  it('one line per month plus a year total, with the refund columns', () => {
    const csv = revenueCsv({
      months,
      headers: ['Month', 'Revenue (VND)', 'Payments', 'New', 'Renewal', 'Refunds (VND)', 'Refund count'],
      totalLabel: 'Year',
    });
    expect(csv.split('\n')).toEqual([
      'Month,Revenue (VND),Payments,New,Renewal,Refunds (VND),Refund count',
      '2026-01,1500000,3,1,2,0,0',
      '2026-02,0,0,0,0,250000,1',
      'Year,1500000,3,1,2,250000,1',
    ]);
  });

  it('quotes a header that has a comma or a quote', () => {
    const csv = revenueCsv({ months: [], headers: ['A,B', 'say "hi"'], totalLabel: 'T' });
    expect(csv.split('\n')[0]).toBe('"A,B","say ""hi"""');
  });
});
