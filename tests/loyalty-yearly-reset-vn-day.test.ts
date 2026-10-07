/**
 * #588 / #578 §E (PKG-7 / API-11): the loyalty yearly reset fires on the Vietnam reset day,
 * whatever the server zone. The cron runs at 00:05 VN = 17:05Z of the previous UTC day.
 */
import { isYearlyResetDate } from '../packages/loyalty/src/expiry';

const program = {
  pointsExpiryMode: 'yearly_reset',
  yearlyResetMonth: 1,
  yearlyResetDay: 1,
} as any;

describe('isYearlyResetDate on the VN day', () => {
  it('cron at 2025-12-31T17:05Z (1 Jan 00:05 VN) with reset 1/1 -> true', () => {
    expect(isYearlyResetDate(program, new Date('2025-12-31T17:05:00Z'))).toBe(true);
  });

  it('first instant of 1 Jan VN (2025-12-31T17:00:00Z) -> true', () => {
    expect(isYearlyResetDate(program, new Date('2025-12-31T17:00:00Z'))).toBe(true);
  });

  it('last instant of 31 Dec VN (2025-12-31T16:59:59Z) -> false', () => {
    expect(isYearlyResetDate(program, new Date('2025-12-31T16:59:59Z'))).toBe(false);
  });

  it('last instant of 1 Jan VN (2026-01-01T16:59:59Z) -> true', () => {
    expect(isYearlyResetDate(program, new Date('2026-01-01T16:59:59Z'))).toBe(true);
  });

  it('first instant of 2 Jan VN (2026-01-01T17:00:00Z) -> false', () => {
    expect(isYearlyResetDate(program, new Date('2026-01-01T17:00:00Z'))).toBe(false);
  });

  it('reset 29/2 matches 29 Feb VN in a leap year', () => {
    const leap = { ...program, yearlyResetMonth: 2, yearlyResetDay: 29 };
    expect(isYearlyResetDate(leap, new Date('2028-02-28T17:30:00Z'))).toBe(true);
    expect(isYearlyResetDate(leap, new Date('2028-02-28T16:30:00Z'))).toBe(false);
  });

  it('other modes never reset', () => {
    expect(isYearlyResetDate({ ...program, pointsExpiryMode: 'never' }, new Date('2025-12-31T17:05:00Z'))).toBe(false);
  });
});
