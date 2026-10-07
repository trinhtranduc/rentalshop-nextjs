/**
 * #594 (timezone batch B of #578, PKG-1 / PKG-2) — report and export ranges are Vietnam civil days.
 * Day D (VN) = [D-1 17:00Z, D 16:59:59.999Z]. A YYYY-MM-DD key is that day; an old UTC-day window end
 * (`T23:59:59.999Z`, Android `T23:59:59Z`) keeps its written date; any other instant is the VN day containing it.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: results must be identical.
 */
import {
  normalizeStartDate,
  normalizeEndDate,
  getDateRangeFromPeriod,
  validateDateRange,
  parseDateRangeFromQuery,
  calculateDaysDifference,
} from '../../../packages/utils/src/core/date-range';
import { formatDateForExcel, generateExcelFilename } from '../../../packages/utils/src/core/excel';

const iso = (d: Date | null) => d?.toISOString();

afterEach(() => {
  jest.useRealTimers();
});

function at(instant: string) {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(new Date(instant));
}

describe('normalizeStartDate / normalizeEndDate (#594)', () => {
  it('a day key is the Vietnam day', () => {
    expect(iso(normalizeStartDate('2026-10-02'))).toBe('2026-10-01T17:00:00.000Z');
    expect(iso(normalizeEndDate('2026-10-02'))).toBe('2026-10-02T16:59:59.999Z');
  });

  it('month and year edges', () => {
    expect(iso(normalizeStartDate('2026-01-01'))).toBe('2025-12-31T17:00:00.000Z');
    expect(iso(normalizeEndDate('2025-12-31'))).toBe('2025-12-31T16:59:59.999Z');
    expect(iso(normalizeEndDate('2026-02-28'))).toBe('2026-02-28T16:59:59.999Z');
  });

  it('old iOS (T00:00Z … T23:59:59.999Z) and old Android (T23:59:59Z) windows keep the written day', () => {
    expect(iso(normalizeStartDate('2026-10-02T00:00:00.000Z'))).toBe('2026-10-01T17:00:00.000Z');
    expect(iso(normalizeEndDate('2026-10-02T23:59:59.999Z'))).toBe('2026-10-02T16:59:59.999Z');
    expect(iso(normalizeEndDate('2026-10-02T23:59:59Z'))).toBe('2026-10-02T16:59:59.999Z');
    expect(iso(normalizeEndDate(new Date('2026-10-02T23:59:59.999Z')))).toBe('2026-10-02T16:59:59.999Z');
  });

  it('an instant is the Vietnam day that contains it (16:59:59Z / 17:00:00Z)', () => {
    expect(iso(normalizeStartDate(new Date('2026-10-01T16:59:59Z')))).toBe('2026-09-30T17:00:00.000Z');
    expect(iso(normalizeStartDate(new Date('2026-10-01T17:00:00Z')))).toBe('2026-10-01T17:00:00.000Z');
    expect(iso(normalizeStartDate('2026-10-01T17:00:00.000Z'))).toBe('2026-10-01T17:00:00.000Z');
    expect(iso(normalizeEndDate('2026-10-02T16:59:59.999Z'))).toBe('2026-10-02T16:59:59.999Z');
    // `new Date('YYYY-MM-DD')` (routes that parse the key first) stays that day
    expect(iso(normalizeStartDate(new Date('2026-10-02')))).toBe('2026-10-01T17:00:00.000Z');
    expect(iso(normalizeEndDate(new Date('2026-10-02')))).toBe('2026-10-02T16:59:59.999Z');
  });

  it('is idempotent', () => {
    const start = normalizeStartDate('2026-10-02');
    const end = normalizeEndDate('2026-10-02');
    expect(iso(normalizeStartDate(start))).toBe(iso(start));
    expect(iso(normalizeEndDate(end))).toBe(iso(end));
  });

  it('invalid input stays null', () => {
    expect(normalizeStartDate('nope')).toBeNull();
    expect(normalizeEndDate(null)).toBeNull();
  });

  it('days difference is unchanged', () => {
    expect(calculateDaysDifference('2026-10-01', '2026-10-31')).toBe(30);
    expect(calculateDaysDifference('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('getDateRangeFromPeriod / validateDateRange / parseDateRangeFromQuery (#594)', () => {
  it('a preset ends at the end of Vietnam today (00:30 VN = 17:30Z the day before)', () => {
    at('2026-10-02T17:30:00Z'); // 3 Oct 00:30 in Vietnam
    const { startDate, endDate } = getDateRangeFromPeriod('1month');
    expect(endDate.toISOString()).toBe('2026-10-03T16:59:59.999Z');
    expect(startDate.toISOString()).toBe('2026-09-02T17:00:00.000Z'); // 3 Sep 00:00 VN
  });

  it('one second before Vietnam midnight is still the same day', () => {
    at('2026-10-02T16:59:59Z'); // 2 Oct 23:59:59 in Vietnam
    expect(getDateRangeFromPeriod('1month').endDate.toISOString()).toBe('2026-10-02T16:59:59.999Z');
  });

  it('"future" is measured from Vietnam today (+1 day grace kept)', () => {
    at('2026-10-02T17:30:00Z'); // 3 Oct in Vietnam, still 2 Oct in UTC
    expect(validateDateRange('2026-10-01', '2026-10-04')).toEqual({ valid: true });
    expect(validateDateRange('2026-10-01', '2026-10-05').valid).toBe(false);
  });

  it('a custom range of keys gives Vietnam bounds', () => {
    at('2026-10-05T03:00:00Z');
    const range = parseDateRangeFromQuery('custom', '2026-10-02', '2026-10-02');
    expect('error' in range).toBe(false);
    if ('error' in range) return;
    expect(range.startDate.toISOString()).toBe('2026-10-01T17:00:00.000Z');
    expect(range.endDate.toISOString()).toBe('2026-10-02T16:59:59.999Z');
  });

  it('a range over a year end', () => {
    at('2026-01-05T03:00:00Z');
    const range = parseDateRangeFromQuery(null, '2025-12-31', '2026-01-01');
    if ('error' in range) throw new Error(range.error);
    expect(range.startDate.toISOString()).toBe('2025-12-30T17:00:00.000Z');
    expect(range.endDate.toISOString()).toBe('2026-01-01T16:59:59.999Z');
  });
});

describe('Excel cells and file names in Vietnam time (#594, PKG-2)', () => {
  it('cells print Vietnam wall time', () => {
    expect(formatDateForExcel(new Date('2026-10-01T17:30:00Z'), 'datetime-short')).toBe('02/10/26 00:30:00');
    expect(formatDateForExcel('2026-10-01T17:30:00Z', 'datetime')).toBe('02/10/2026 00:30');
    expect(formatDateForExcel(new Date('2026-10-01T17:00:00Z'))).toBe('02/10/2026');
    expect(formatDateForExcel(new Date('2026-10-01T16:59:59Z'), 'datetime-short')).toBe('01/10/26 23:59:59');
    expect(formatDateForExcel(new Date('2025-12-31T17:00:00Z'))).toBe('01/01/2026');
    expect(formatDateForExcel(null)).toBe('');
  });

  it('file names use the Vietnam days of the range', () => {
    at('2026-10-05T03:00:00Z');
    const range = parseDateRangeFromQuery('custom', '2026-10-02', '2026-10-03');
    if ('error' in range) throw new Error(range.error);
    expect(generateExcelFilename('orders', range.startDate, range.endDate)).toBe('orders-export-2026-10-02-2026-10-03.xlsx');
    expect(generateExcelFilename('orders', '2026-10-02', '2026-10-03')).toBe('orders-export-2026-10-02-2026-10-03.xlsx');
  });

  it('a file name without a range uses Vietnam today', () => {
    at('2026-10-02T17:30:00Z');
    expect(generateExcelFilename('orders')).toBe('orders-export-2026-10-03.xlsx');
  });
});
