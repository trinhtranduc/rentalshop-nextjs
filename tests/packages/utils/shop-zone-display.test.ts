/**
 * #578 batch C (PKG-5, ADM-9): the shared date formatters show business dates in the Vietnam zone whatever the
 * browser zone. 2026-10-06T17:30:00Z is 00:30 on 7 Oct in Vietnam; 16:59:59Z is still 6 Oct.
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import {
  formatDate,
  formatDateTime,
  formatDateLong,
  formatDateShort,
  formatDateTimeLong,
  formatDateWithLocale,
  formatDateByLocale,
  formatChartPeriod,
  formatMonthOnlyByLocale,
  formatDailyByLocale,
  formatDateTimeByLocale,
  formatTimeByLocale,
} from '../../../packages/utils/src/core/date';

const AFTER_VN_MIDNIGHT = '2026-10-06T17:30:00.000Z'; // 00:30, 7 Oct (VN)
const LAST_SECOND = '2026-10-06T16:59:59.000Z'; // 23:59:59, 6 Oct (VN)
const VN_MIDNIGHT = '2026-10-06T17:00:00.000Z'; // 00:00, 7 Oct (VN)

describe('date formatters show the Vietnam day', () => {
  it('formatDate / formatDateTime', () => {
    expect(formatDate(AFTER_VN_MIDNIGHT)).toBe('07/10/2026');
    expect(formatDate(LAST_SECOND)).toBe('06/10/2026');
    expect(formatDate(VN_MIDNIGHT)).toBe('07/10/2026');
    expect(formatDate(new Date(AFTER_VN_MIDNIGHT))).toBe('07/10/2026');
    expect(formatDate('2026-10-07')).toBe('07/10/2026'); // a day key stays that day
    expect(formatDateTime(AFTER_VN_MIDNIGHT)).toBe('07/10/2026 00:30');
    expect(formatDateTime(LAST_SECOND)).toBe('06/10/2026 23:59');
  });

  it('Intl formatters (long, short, with locale)', () => {
    expect(formatDateLong(AFTER_VN_MIDNIGHT)).toBe('October 7, 2026');
    expect(formatDateShort(AFTER_VN_MIDNIGHT)).toBe('Oct 7, 2026');
    expect(formatDateShort(LAST_SECOND)).toBe('Oct 6, 2026');
    expect(formatDateTimeLong(AFTER_VN_MIDNIGHT)).toContain('10/07/2026');
    expect(formatDateTimeLong(AFTER_VN_MIDNIGHT)).toContain('12:30');
    expect(formatDateWithLocale(AFTER_VN_MIDNIGHT, 'vi')).toBe(
      new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(
        new Date(AFTER_VN_MIDNIGHT)
      )
    );
    expect(formatDateLong('2026-10-07')).toBe('October 7, 2026');
  });

  it('chart / by-locale formatters', () => {
    expect(formatDateByLocale(AFTER_VN_MIDNIGHT, 'en', { day: 'numeric', month: 'short' })).toBe('Oct 7');
    expect(formatDailyByLocale(AFTER_VN_MIDNIGHT, 'vi')).toBe('07/10');
    expect(formatDailyByLocale(LAST_SECOND, 'vi')).toBe('06/10');
    expect(formatDailyByLocale(AFTER_VN_MIDNIGHT, 'en')).toBe('Oct 7');
    // month edge: 31 Oct 17:30Z is 1 Nov in Vietnam
    expect(formatChartPeriod('2026-10-31T17:30:00.000Z', 'vi')).toBe('11/26');
    expect(formatMonthOnlyByLocale('2026-10-31T17:30:00.000Z', 'vi')).toBe('11/26');
    expect(formatMonthOnlyByLocale('2026-10-31T17:30:00.000Z', 'en')).toBe('Nov 2026');
    // year edge
    expect(formatChartPeriod('2026-12-31T17:00:00.000Z', 'vi')).toBe('01/27');
    expect(formatDateTimeByLocale(AFTER_VN_MIDNIGHT, 'vi')).toBe('07/10/2026 00:30');
    expect(formatTimeByLocale(AFTER_VN_MIDNIGHT, 'vi')).toContain('00:30');
  });
});
