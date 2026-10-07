/**
 * #588 / #578 §E (API-17): billing day counts and month addition on Vietnam civil days.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { addMonthsInTimeZone, civilDaysBetween } from '../../../packages/utils/src/core/billing-dates';

const iso = (d: Date) => d.toISOString();

describe('civilDaysBetween (VN civil days, not ceil of hours)', () => {
  it('same VN day across the 17:00Z midnight boundary is 0', () => {
    // 2026-03-10 00:00:00 VN .. 2026-03-10 23:59:59 VN
    expect(civilDaysBetween(new Date('2026-03-09T17:00:00Z'), new Date('2026-03-10T16:59:59Z'))).toBe(0);
  });

  it('one second across VN midnight is 1 day', () => {
    expect(civilDaysBetween(new Date('2026-03-09T16:59:59Z'), new Date('2026-03-09T17:00:00Z'))).toBe(1);
  });

  it('does not change during the VN day (09:00 VN and 23:59 VN give the same count)', () => {
    const end = new Date('2026-03-20T16:59:59.999Z'); // 20 Mar 23:59:59.999 VN
    expect(civilDaysBetween(new Date('2026-03-10T02:00:00Z'), end)).toBe(10);
    expect(civilDaysBetween(new Date('2026-03-10T16:59:00Z'), end)).toBe(10);
    expect(civilDaysBetween(new Date('2026-03-09T17:00:00Z'), end)).toBe(10);
  });

  it('counts across a month end and a year', () => {
    expect(civilDaysBetween(new Date('2026-01-30T17:00:00Z'), new Date('2026-02-28T16:00:00Z'))).toBe(28);
    expect(civilDaysBetween(new Date('2025-12-31T17:00:00Z'), new Date('2026-12-31T16:59:59Z'))).toBe(364);
  });

  it('is negative when the end day is before today', () => {
    expect(civilDaysBetween(new Date('2026-03-12T02:00:00Z'), new Date('2026-03-10T16:59:59Z'))).toBe(-2);
  });
});

describe('addMonthsInTimeZone (clamp to the last day of the target month, keep VN clock time)', () => {
  it('31 Jan + 1 month = 28 Feb (non-leap year)', () => {
    // 31 Jan 10:00 VN -> 28 Feb 10:00 VN
    expect(iso(addMonthsInTimeZone(new Date('2026-01-31T03:00:00Z'), 1))).toBe('2026-02-28T03:00:00.000Z');
  });

  it('31 Jan + 1 month = 29 Feb (leap year)', () => {
    expect(iso(addMonthsInTimeZone(new Date('2028-01-31T03:00:00Z'), 1))).toBe('2028-02-29T03:00:00.000Z');
  });

  it('31 Mar + 1 month = 30 Apr', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-03-31T03:00:00Z'), 1))).toBe('2026-04-30T03:00:00.000Z');
  });

  it('VN midnight boundary: 31 Jan 00:00 VN (30 Jan 17:00Z) + 1 = 28 Feb 00:00 VN', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-01-30T17:00:00Z'), 1))).toBe('2026-02-27T17:00:00.000Z');
  });

  it('VN end of day: 30 Jan 23:59:59 VN (30 Jan 16:59:59Z) + 1 = 28 Feb 23:59:59 VN', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-01-30T16:59:59Z'), 1))).toBe('2026-02-28T16:59:59.000Z');
  });

  it('29 Feb 2028 + 12 months = 28 Feb 2029', () => {
    expect(iso(addMonthsInTimeZone(new Date('2028-02-29T05:00:00Z'), 12))).toBe('2029-02-28T05:00:00.000Z');
  });

  it('crosses the year: 31 Dec 23:00 VN + 2 months = 28 Feb', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-12-31T16:00:00Z'), 2))).toBe('2027-02-28T16:00:00.000Z');
  });

  it('negative months clamp too: 31 Mar - 1 month = 28 Feb', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-03-31T03:00:00Z'), -1))).toBe('2026-02-28T03:00:00.000Z');
  });

  it('a day that exists in the target month is unchanged: 15 Mar + 3 = 15 Jun', () => {
    expect(iso(addMonthsInTimeZone(new Date('2026-03-15T05:00:00Z'), 3))).toBe('2026-06-15T05:00:00.000Z');
  });
});
