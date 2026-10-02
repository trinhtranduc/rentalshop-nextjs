/**
 * #351 — rental days are Vietnam civil days from pickup to return, both included (as on iOS and Android).
 * The web and API counted nights, so 03/10 → 04/10 was 1 day and a per-day item cost half as much.
 */
import { countRentalDays } from '../../../packages/utils/src/core/rental-days';
import { calculateDurationInUnit } from '../../../packages/utils/src/core/pricing-calculator';

describe('countRentalDays (#351)', () => {
  it('counts the pickup and the return day', () => {
    expect(countRentalDays('2026-10-03', '2026-10-04')).toBe(2);
    expect(countRentalDays('2026-09-30', '2026-10-02')).toBe(3);
  });

  it('a same-day rental is 1 day', () => {
    expect(countRentalDays('2026-10-03', '2026-10-03')).toBe(1);
  });

  it('uses the Vietnam day of stored instants', () => {
    // 00:00 +07 on 03/10 to 23:59:59 +07 on 04/10
    expect(countRentalDays('2026-10-02T17:00:00.000Z', '2026-10-04T16:59:59.999Z')).toBe(2);
    // 00:00 +07 on 03/10 to 00:00 +07 on 04/10 (return stored as the start of the return day)
    expect(countRentalDays(new Date('2026-10-02T17:00:00.000Z'), new Date('2026-10-03T17:00:00.000Z'))).toBe(2);
    // 16:59:59Z is still the same Vietnam day as 17:00Z the day before
    expect(countRentalDays('2026-10-02T17:00:00.000Z', '2026-10-03T16:59:59.000Z')).toBe(1);
  });

  it('never returns less than 1, even for a reversed or missing range', () => {
    expect(countRentalDays('2026-10-04', '2026-10-03')).toBe(1);
    expect(countRentalDays('', '')).toBe(1);
  });
});

describe('calculateDurationInUnit DAILY (#351)', () => {
  it('matches countRentalDays', () => {
    const start = new Date('2026-10-02T17:00:00.000Z');
    const end = new Date('2026-10-03T17:00:00.000Z');
    expect(calculateDurationInUnit(start, end, 'DAILY')).toEqual({ duration: 2, unit: 'day' });
  });

  it('leaves HOURLY and FIXED alone', () => {
    const start = new Date('2026-10-03T02:00:00.000Z');
    const end = new Date('2026-10-03T06:00:00.000Z');
    expect(calculateDurationInUnit(start, end, 'HOURLY')).toEqual({ duration: 4, unit: 'hour' });
    expect(calculateDurationInUnit(start, end, 'FIXED')).toEqual({ duration: 1, unit: 'rental' });
  });
});
