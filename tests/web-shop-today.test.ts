/**
 * #589 (timezone batch D, #578 §D): the shop web "today" follows the Vietnam day while a tab stays open (WEB-2),
 * and the renewal bar counts expired days in Vietnam civil days (WEB-4).
 * Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; these models only need the civil-day helpers
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/date-range') as object),
  SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
}));
import { formatDateKeyInTimeZone } from '../packages/utils/src/core/date-range';
import { shopToday } from '../apps/client/app/hooks/shop-today';
import { expiredDaysAgo } from '../apps/client/app/components/renewal-model';

const at = (iso: string) => new Date(iso);
const vnKey = (d: Date) => formatDateKeyInTimeZone(d, 'Asia/Ho_Chi_Minh');
const H = 60 * 60 * 1000;

describe('shopToday: the Vietnam day and the time to the next Vietnam midnight', () => {
  it('23:30 VN on 05/10 → 05/10, next day in 30 minutes', () => {
    expect(shopToday(at('2026-10-05T16:30:00.000Z'))).toEqual({ key: '2026-10-05', msToNextDay: 30 * 60 * 1000 });
  });

  it('16:59:59Z is still the day, 17:00:00Z is the next one', () => {
    expect(shopToday(at('2026-10-05T16:59:59.000Z'))).toEqual({ key: '2026-10-05', msToNextDay: 1000 });
    expect(shopToday(at('2026-10-05T17:00:00.000Z'))).toEqual({ key: '2026-10-06', msToNextDay: 24 * H });
  });

  it('the UTC day is not the Vietnam day (01:00 VN = 18:00Z the day before)', () => {
    expect(shopToday(at('2026-10-05T18:00:00.000Z'))).toEqual({ key: '2026-10-06', msToNextDay: 23 * H });
  });

  it('month and year ends', () => {
    expect(shopToday(at('2026-10-31T16:59:59.999Z'))).toEqual({ key: '2026-10-31', msToNextDay: 1 });
    expect(shopToday(at('2026-12-31T16:59:59.999Z'))).toEqual({ key: '2026-12-31', msToNextDay: 1 });
    expect(shopToday(at('2026-12-31T17:00:00.000Z')).key).toBe('2027-01-01');
  });

  it('takes the zone (per-shop zone later, #567)', () => {
    expect(shopToday(at('2026-10-05T16:30:00.000Z'), 'UTC')).toEqual({ key: '2026-10-05', msToNextDay: 7.5 * H });
  });
});

describe('expiredDaysAgo: civil days from the Vietnam end day to Vietnam today', () => {
  it('ended 23:00 VN yesterday, now 01:00 VN → 1 day ago (not "today")', () => {
    // 2026-10-06T16:00Z = 23:00 VN 06/10; 2026-10-06T18:00Z = 01:00 VN 07/10
    expect(expiredDaysAgo('2026-10-06T16:00:00.000Z', at('2026-10-06T18:00:00.000Z'), vnKey)).toBe(1);
  });

  it('16:59:59Z / 17:00:00Z boundary', () => {
    // end 23:59:59 VN 05/10; now 00:00 VN 07/10 → 2 days (24 h blocks said 1)
    expect(expiredDaysAgo('2026-10-05T16:59:59.000Z', at('2026-10-06T17:00:00.000Z'), vnKey)).toBe(2);
    // end 00:00 VN 06/10; now 23:59:59 VN 07/10 → 1 day
    expect(expiredDaysAgo('2026-10-05T17:00:00.000Z', at('2026-10-07T16:59:59.000Z'), vnKey)).toBe(1);
    // same Vietnam day → 0 (expired today)
    expect(expiredDaysAgo('2026-10-05T17:00:00.000Z', at('2026-10-06T16:59:59.000Z'), vnKey)).toBe(0);
  });

  it('across a month and a year end', () => {
    expect(expiredDaysAgo('2026-12-31T10:00:00.000Z', at('2027-01-01T17:30:00.000Z'), vnKey)).toBe(2);
    expect(expiredDaysAgo(new Date('2026-09-30T16:59:59.000Z'), at('2026-10-01T01:00:00.000Z'), vnKey)).toBe(1);
  });

  it('null when not expired yet or no valid end', () => {
    expect(expiredDaysAgo('2026-10-08T00:00:00.000Z', at('2026-10-07T00:00:00.000Z'), vnKey)).toBeNull();
    expect(expiredDaysAgo('nope', at('2026-10-07T00:00:00.000Z'), vnKey)).toBeNull();
    expect(expiredDaysAgo(null, at('2026-10-07T00:00:00.000Z'), vnKey)).toBeNull();
  });
});
