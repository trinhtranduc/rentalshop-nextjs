// ============================================================================
// DATE RANGE VALIDATION UTILITIES
// ============================================================================

/**
 * Date range period options
 */
export type DateRangePeriod = '1month' | '3months' | '6months' | '1year' | 'custom';

/**
 * Date range period configuration
 */
export const DATE_RANGE_PERIODS: Record<DateRangePeriod, { days: number; label: string }> = {
  '1month': { days: 30, label: 'Last 30 Days' },
  '3months': { days: 90, label: 'Last 90 Days' },
  '6months': { days: 180, label: 'Last 180 Days' },
  '1year': { days: 365, label: 'Last 365 Days' },
  'custom': { days: 0, label: 'Custom Range' },
};

/**
 * Maximum allowed date range in days
 */
export const MAX_DATE_RANGE_DAYS = 365;

/**
 * Extra calendar days allowed past UTC "today" for custom end dates.
 *
 * Why: mobile/web send the user's *local* YYYY-MM-DD. On Vercel (UTC), morning
 * in Vietnam (UTC+7) is still the previous UTC day — rejecting end === user-today
 * caused INVALID_DATE_RANGE ("Invalid date range provided") on custom export.
 */
const END_DATE_TZ_GRACE_DAYS = 1;

type CivilDate = { y: number; m: number; d: number };

/**
 * Resolve Y/M/D as a civil calendar date (no local setHours skew).
 *
 * - `YYYY-MM-DD` / ISO strings: use the written calendar day (prefix match)
 * - `Date` objects: always use **UTC** parts so UTC-normalized values stay stable
 *   on any server timezone (VN local Node vs Vercel UTC)
 */
function civilDate(date: Date | string): CivilDate | null {
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
    if (match) {
      return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      y: parsed.getUTCFullYear(),
      m: parsed.getUTCMonth(),
      d: parsed.getUTCDate(),
    };
  }
  if (Number.isNaN(date.getTime())) return null;
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth(),
    d: date.getUTCDate(),
  };
}

function utcToday(): CivilDate {
  const now = new Date();
  return {
    y: now.getUTCFullYear(),
    m: now.getUTCMonth(),
    d: now.getUTCDate(),
  };
}

function addDays(parts: CivilDate, days: number): CivilDate {
  const dt = new Date(Date.UTC(parts.y, parts.m, parts.d + days));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth(),
    d: dt.getUTCDate(),
  };
}

function civilKey(parts: CivilDate): number {
  return parts.y * 10_000 + (parts.m + 1) * 100 + parts.d;
}

/**
 * Normalize start date to beginning of UTC day (00:00:00.000Z)
 *
 * @example
 * normalizeStartDate('2025-12-06') // 2025-12-06T00:00:00.000Z
 */
export function normalizeStartDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parts = civilDate(date);
  if (!parts) return null;
  return new Date(Date.UTC(parts.y, parts.m, parts.d, 0, 0, 0, 0));
}

/**
 * Normalize end date to end of UTC day (23:59:59.999Z)
 *
 * @example
 * normalizeEndDate('2025-12-06') // 2025-12-06T23:59:59.999Z
 */
export function normalizeEndDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parts = civilDate(date);
  if (!parts) return null;
  return new Date(Date.UTC(parts.y, parts.m, parts.d, 23, 59, 59, 999));
}

// ============================================================================
// TIMEZONE-AWARE CALENDAR DAYS
// ============================================================================

/**
 * One calendar day of a specific IANA timezone, expressed as UTC instants.
 */
export interface ZonedCalendarDay {
  /** `YYYY-MM-DD` as written on a calendar in that timezone */
  dateKey: string;
  /** Instant of local 00:00:00.000 */
  start: Date;
  /** Instant of local 23:59:59.999 */
  end: Date;
}

const zonedPartsFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zonedPartsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    zonedPartsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function getZonedParts(instant: Date, timeZone: string) {
  const values: Record<string, number> = {};
  for (const part of getZonedPartsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

/**
 * Offset of `timeZone` from UTC at a given instant, in milliseconds.
 *
 * Works by formatting the instant as local wall-clock time and re-reading those
 * fields as if they were UTC — the gap between the two is the offset. This keeps
 * DST-aware zones correct without pulling in a date library.
 */
export function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    instant.getUTCMilliseconds()
  );
  return asUtc - instant.getTime();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Local `YYYY-MM-DD` of an instant in a given timezone.
 *
 * @example
 * // 2025-12-06T18:00:00Z is already Dec 7 in Vietnam (UTC+7)
 * formatDateKeyInTimeZone(new Date('2025-12-06T18:00:00Z'), 'Asia/Ho_Chi_Minh') // '2025-12-07'
 */
export function formatDateKeyInTimeZone(instant: Date, timeZone: string): string {
  const parts = getZonedParts(instant, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Resolve a calendar day in `timeZone`, offset by `daysFromReference`, into the
 * UTC instants that bound it. Use this to query UTC-stored timestamps by the day
 * a user in that timezone would call "today", "tomorrow", "in 3 days", etc.
 *
 * @example
 * // Merchants in Vietnam: subscriptions expiring 3 calendar days from now
 * const { start, end } = getCalendarDayRangeInTimeZone(new Date(), 'Asia/Ho_Chi_Minh', 3);
 */
export function getCalendarDayRangeInTimeZone(
  reference: Date,
  timeZone: string,
  daysFromReference: number = 0
): ZonedCalendarDay {
  const parts = getZonedParts(reference, timeZone);
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysFromReference));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth();
  const d = target.getUTCDate();

  // Convert local midnight to UTC. The offset is first estimated from the
  // reference instant, then re-read at the candidate instant so days that cross
  // a DST boundary land on the correct hour.
  const localMidnightAsUtc = Date.UTC(y, m, d, 0, 0, 0, 0);
  let start = new Date(localMidnightAsUtc - getTimeZoneOffsetMs(reference, timeZone));
  start = new Date(localMidnightAsUtc - getTimeZoneOffsetMs(start, timeZone));

  const localEndAsUtc = Date.UTC(y, m, d, 23, 59, 59, 999);
  let end = new Date(localEndAsUtc - getTimeZoneOffsetMs(start, timeZone));
  end = new Date(localEndAsUtc - getTimeZoneOffsetMs(end, timeZone));

  return { dateKey: `${y}-${pad2(m + 1)}-${pad2(d)}`, start, end };
}

// ============================================================================
// CIVIL DAY KEYS (analytics, dashboard, order filters) — #355
// ============================================================================

/** Shop zone for day keys. Same value as `SHOP_TIMEZONE` in `./date` (kept literal: this file has no imports). */
const DEFAULT_CIVIL_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(key: string): CivilDate | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const parts = { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
  const check = new Date(Date.UTC(parts.y, parts.m, parts.d));
  if (check.getUTCFullYear() !== parts.y || check.getUTCMonth() !== parts.m || check.getUTCDate() !== parts.d) {
    return null;
  }
  return parts;
}

function formatCivilDate(parts: CivilDate): string {
  return `${parts.y}-${pad2(parts.m + 1)}-${pad2(parts.d)}`;
}

/** `YYYY-MM-DD` plus `days` calendar days (pure calendar arithmetic, no time zone). */
export function addDaysToDateKey(key: string, days: number): string {
  const parts = parseDateKey(key);
  if (!parts) throw new Error(`Invalid date key: ${key}`);
  return formatCivilDate(addDays(parts, days));
}

/**
 * Day key of a query value in `timeZone`: a `YYYY-MM-DD` key is kept as written; an ISO instant
 * becomes the civil day that contains it. Returns null when the value is not a date.
 */
export function toDateKeyInTimeZone(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_CIVIL_TIME_ZONE
): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_KEY_PATTERN.test(trimmed)) return parseDateKey(trimmed) ? trimmed : null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : formatDateKeyInTimeZone(parsed, timeZone);
  }
  return Number.isNaN(value.getTime()) ? null : formatDateKeyInTimeZone(value, timeZone);
}

/** One civil day (`YYYY-MM-DD`) of `timeZone` as UTC instants. */
function civilDayForKey(key: string, timeZone: string): ZonedCalendarDay {
  const parts = parseDateKey(key);
  if (!parts) throw new Error(`Invalid date key: ${key}`);
  // Noon UTC of the key is on that calendar date or one day off in any zone; correct by the difference.
  const reference = new Date(Date.UTC(parts.y, parts.m, parts.d, 12));
  const day = getCalendarDayRangeInTimeZone(reference, timeZone);
  if (day.dateKey === key) return day;
  const shift = Math.round((Date.UTC(parts.y, parts.m, parts.d) - Date.parse(`${day.dateKey}T00:00:00Z`)) / DAY_MS);
  return getCalendarDayRangeInTimeZone(reference, timeZone, shift);
}

/**
 * UTC bounds of the civil days `from`..`to` (inclusive, `YYYY-MM-DD`) in `timeZone` (default Vietnam).
 *
 * @example
 * getUtcRangeForDateKeys({ from: '2026-10-02' })
 * // { start: 2026-10-01T17:00:00.000Z, end: 2026-10-02T16:59:59.999Z }
 */
export function getUtcRangeForDateKeys(
  range: { from: string; to?: string | null },
  timeZone: string = DEFAULT_CIVIL_TIME_ZONE
): { start: Date; end: Date } {
  const to = range.to || range.from;
  return {
    start: civilDayForKey(range.from, timeZone).start,
    end: civilDayForKey(to, timeZone).end,
  };
}

/** Every civil day from `fromKey` to `toKey` (inclusive) with its UTC bounds. */
export function listCivilDays(
  fromKey: string,
  toKey: string,
  timeZone: string = DEFAULT_CIVIL_TIME_ZONE
): ZonedCalendarDay[] {
  const days: ZonedCalendarDay[] = [];
  for (let key = fromKey; key <= toKey; key = addDaysToDateKey(key, 1)) {
    days.push(civilDayForKey(key, timeZone));
  }
  return days;
}

export interface CivilMonth {
  year: number;
  /** 1-12 */
  month: number;
  /** First and last day of the month (`YYYY-MM-DD`) */
  startKey: string;
  endKey: string;
  start: Date;
  end: Date;
}

/** Every civil month touched by `fromKey`..`toKey`, each as its whole month in `timeZone`. */
export function listCivilMonths(
  fromKey: string,
  toKey: string,
  timeZone: string = DEFAULT_CIVIL_TIME_ZONE
): CivilMonth[] {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) throw new Error(`Invalid date keys: ${fromKey}..${toKey}`);
  const months: CivilMonth[] = [];
  let y = from.y;
  let m = from.m;
  while (y < to.y || (y === to.y && m <= to.m)) {
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const startKey = formatCivilDate({ y, m, d: 1 });
    const endKey = formatCivilDate({ y, m, d: lastDay });
    months.push({ year: y, month: m + 1, startKey, endKey, ...getUtcRangeForDateKeys({ from: startKey, to: endKey }, timeZone) });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return months;
}

/**
 * Bucket labels of an instant's civil day, in the formats analytics responses have always used:
 * `date` = `YYYY/MM/DD`, `dateISO` = that calendar date at `00:00:00.000Z`.
 */
export function civilDayBucket(
  instant: Date | string,
  timeZone: string = DEFAULT_CIVIL_TIME_ZONE
): { dateKey: string; date: string; dateISO: string } {
  const dateKey = formatDateKeyInTimeZone(new Date(instant), timeZone);
  return { dateKey, date: dateKey.replace(/-/g, '/'), dateISO: `${dateKey}T00:00:00.000Z` };
}

/**
 * Get date range from period option
 *
 * @param period - Period option (1month, 3months, 6months, 1year)
 * @returns Object with startDate and endDate
 */
export function getDateRangeFromPeriod(period: DateRangePeriod): { startDate: Date; endDate: Date } {
  if (period === 'custom') {
    throw new Error('Custom period requires explicit startDate and endDate');
  }

  const config = DATE_RANGE_PERIODS[period];
  const endDate = normalizeEndDate(new Date())!;
  const startAnchor = new Date(endDate);
  startAnchor.setUTCDate(startAnchor.getUTCDate() - config.days);
  const startDate = normalizeStartDate(startAnchor)!;

  return { startDate, endDate };
}

/**
 * Calculate days difference between two dates (civil calendar days, UTC-stable)
 */
export function calculateDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = normalizeStartDate(startDate);
  const end = normalizeStartDate(endDate);
  if (!start || !end) return 0;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string,
  maxDays: number = MAX_DATE_RANGE_DAYS
): { valid: boolean; error?: string } {
  // Always re-normalize so Date objects from parseDateRangeFromQuery stay UTC-stable
  const start = normalizeStartDate(startDate);
  const end = normalizeEndDate(endDate);

  if (!start || Number.isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }

  if (!end || Number.isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }

  if (start.getTime() > end.getTime()) {
    return { valid: false, error: 'Start date cannot be after end date' };
  }

  const endParts = civilDate(end)!;
  const maxEndParts = addDays(utcToday(), END_DATE_TZ_GRACE_DAYS);
  if (civilKey(endParts) > civilKey(maxEndParts)) {
    return { valid: false, error: 'End date cannot be in the future' };
  }

  const daysDiff = calculateDaysDifference(start, end);
  if (daysDiff > maxDays) {
    return {
      valid: false,
      error: `Date range cannot exceed ${maxDays} days (${Math.ceil(maxDays / 30)} months)`,
    };
  }

  return { valid: true };
}

/**
 * Parse date range from query parameters
 */
export function parseDateRangeFromQuery(
  period: string | null,
  startDateParam: string | null,
  endDateParam: string | null
): { startDate: Date; endDate: Date } | { error: string } {
  if (period && period !== 'custom' && period in DATE_RANGE_PERIODS) {
    return getDateRangeFromPeriod(period as DateRangePeriod);
  }

  if (period === 'custom' || (!period && (startDateParam || endDateParam))) {
    if (!startDateParam || !endDateParam) {
      return { error: 'Both startDate and endDate are required for custom range' };
    }

    const startDate = normalizeStartDate(startDateParam);
    const endDate = normalizeEndDate(endDateParam);

    if (!startDate || !endDate) {
      return { error: 'Invalid date format' };
    }

    const validation = validateDateRange(startDate, endDate);
    if (!validation.valid) {
      return { error: validation.error || 'Invalid date range' };
    }

    return { startDate, endDate };
  }

  return getDateRangeFromPeriod('1month');
}
