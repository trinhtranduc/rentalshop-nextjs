/**
 * #362 — calendar days in the caller's time zone (server stays UTC).
 */
import { getCalendarDayRangeInTimeZone, formatDateKeyInTimeZone } from '../../../packages/utils/src/core/date-range';

describe('calendar days in a time zone (#362)', () => {
  it('Vietnam: 16:59:59Z and 17:00:00Z are different days', () => {
    expect(formatDateKeyInTimeZone(new Date('2026-10-02T16:59:59Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-10-02');
    expect(formatDateKeyInTimeZone(new Date('2026-10-02T17:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-10-03');
  });

  it('Vietnam day bounds and the next day', () => {
    const now = new Date('2026-10-03T16:30:00Z');
    expect(getCalendarDayRangeInTimeZone(now, 'Asia/Ho_Chi_Minh')).toEqual({
      dateKey: '2026-10-03',
      start: new Date('2026-10-02T17:00:00.000Z'),
      end: new Date('2026-10-03T16:59:59.999Z'),
    });
    expect(getCalendarDayRangeInTimeZone(now, 'Asia/Ho_Chi_Minh', 1).dateKey).toBe('2026-10-04');
  });

  it('Tokyo is already on the next day at the same instant', () => {
    const day = getCalendarDayRangeInTimeZone(new Date('2026-10-03T16:30:00Z'), 'Asia/Tokyo');
    expect(day.dateKey).toBe('2026-10-04');
    expect(day.start).toEqual(new Date('2026-10-03T15:00:00.000Z'));
  });

  it('a daylight-saving day is 23 hours long', () => {
    const day = getCalendarDayRangeInTimeZone(new Date('2026-03-08T12:00:00Z'), 'America/New_York');
    expect(day.dateKey).toBe('2026-03-08');
    expect(day.end.getTime() - day.start.getTime() + 1).toBe(23 * 60 * 60 * 1000);
  });
});
