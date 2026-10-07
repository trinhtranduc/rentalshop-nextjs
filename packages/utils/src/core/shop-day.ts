/**
 * Shop-day helpers for browser code (#578 batch C).
 *
 * The admin and the shared UI run in browsers on any time zone. Business days are Vietnam civil days
 * (`SHOP_TIMEZONE`), so "today", presets, month math, pickers and displayed business dates are computed here
 * from day keys (`YYYY-MM-DD`) and the shop zone, never from the browser's local fields.
 * Imports only `./timezone` and `./date-range` so unit tests stay light.
 */
import { DEFAULT_SHOP_TIMEZONE } from './timezone';
import { addDaysToDateKey, formatDateKeyInTimeZone, getTimeZoneOffsetMs, toDateKeyInTimeZone } from './date-range';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function splitKey(key: string): [number, number, number] {
  const match = DATE_KEY.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Today's civil day in the shop zone (Vietnam by default), whatever the browser or server zone. */
export function getShopTodayKey(now: Date = new Date(), timeZone: string = DEFAULT_SHOP_TIMEZONE): string {
  return formatDateKeyInTimeZone(now, timeZone);
}

/** Number of days in a month (`month` 1-12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * `YYYY-MM-DD` plus whole calendar months. The day clamps to the end of the target month:
 * 2026-01-31 + 1 month = 2026-02-28 (2028-02-29 in a leap year); 2026-03-31 - 1 month = 2026-02-28.
 */
export function addMonthsToDateKey(key: string, months: number): string {
  const [y, m, d] = splitKey(key);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12 + 12) % 12 + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonthKey(key: string): string {
  const [y, m] = splitKey(key);
  return `${key.slice(0, 7)}-${pad2(daysInMonth(y, m))}`;
}

export function startOfYearKey(key: string): string {
  return `${key.slice(0, 4)}-01-01`;
}

export function endOfYearKey(key: string): string {
  return `${key.slice(0, 4)}-12-31`;
}

/** Monday of the week that contains `key`. */
export function startOfWeekKey(key: string): string {
  const [y, m, d] = splitKey(key);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDaysToDateKey(key, weekday === 0 ? -6 : 1 - weekday);
}

/** First day of the calendar quarter that contains `key`. */
export function startOfQuarterKey(key: string): string {
  const [y, m] = splitKey(key);
  return `${y}-${pad2(Math.floor((m - 1) / 3) * 3 + 1)}-01`;
}

/** Whole calendar days from `fromKey` to `toKey` (negative when `toKey` is earlier). */
export function diffDateKeys(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = splitKey(fromKey);
  const [y2, m2, d2] = splitKey(toKey);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

// ============================================================================
// Calendar widgets (date-range-picker, <input type="date">)
// ============================================================================

/**
 * Date for a calendar widget that draws the browser's local calendar: local midnight with the key's y/m/d.
 * An ISO instant is first turned into its shop civil day. `new Date('YYYY-MM-DD')` is UTC midnight and shows
 * the day before in any browser west of UTC, so never use it for a picker.
 */
export function dateKeyToPickerDate(value: string | Date | null | undefined, timeZone: string = DEFAULT_SHOP_TIMEZONE): Date | undefined {
  const key = toDateKeyInTimeZone(value ?? null, timeZone);
  if (!key) return undefined;
  const [y, m, d] = splitKey(key);
  return new Date(y, m - 1, d);
}

/** Day key of a tapped calendar cell: its local y/m/d, i.e. the day the user saw and tapped. */
export function pickerDateToDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// ============================================================================
// <input type="datetime-local"> in the shop zone
// ============================================================================

/** `YYYY-MM-DDTHH:mm` showing an instant's wall-clock time in the shop zone ('' for no/invalid value). */
export function toShopDateTimeLocalValue(value: Date | string | null | undefined, timeZone: string = DEFAULT_SHOP_TIMEZONE): string {
  if (!value) return '';
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  const shifted = new Date(instant.getTime() + getTimeZoneOffsetMs(instant, timeZone));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

/** Instant for a `YYYY-MM-DDTHH:mm` value read as wall-clock time in the shop zone (null when invalid). */
export function fromShopDateTimeLocalValue(value: string | null | undefined, timeZone: string = DEFAULT_SHOP_TIMEZONE): Date | null {
  const match = value ? DATETIME_LOCAL.exec(value) : null;
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));
  let instant = new Date(wall - getTimeZoneOffsetMs(new Date(wall), timeZone));
  instant = new Date(wall - getTimeZoneOffsetMs(instant, timeZone));
  return instant;
}

// ============================================================================
// Display
// ============================================================================

const TIME_FIELDS = ['hour', 'minute', 'second', 'hour12', 'hourCycle', 'dayPeriod', 'timeZoneName', 'fractionalSecondDigits'];

function toIntlLocale(locale: string | undefined): string {
  if (!locale || locale === 'en') return 'en-US';
  if (locale === 'vi') return 'vi-VN';
  return locale;
}

/**
 * Format a business date in the shop zone, whatever the browser zone.
 * - an instant (Date, ISO string, epoch ms) is shown as the shop's wall-clock date/time;
 * - a day key `YYYY-MM-DD` (or month key `YYYY-MM`) is shown as written (it already is a civil day).
 * Returns '' for an empty or invalid value.
 *
 * @example formatInShopZone('2026-10-06T17:30:00Z', 'vi', { day: '2-digit', month: '2-digit', year: 'numeric' }) // '07/10/2026'
 */
export function formatInShopZone(
  value: Date | string | number | null | undefined,
  locale: string = 'en',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  timeZone: string = DEFAULT_SHOP_TIMEZONE
): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const day = DATE_KEY.exec(trimmed);
    const month = day ? null : MONTH_KEY.exec(trimmed);
    if (day || month) {
      const parts = (day || month) as RegExpExecArray;
      const civil = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, day ? Number(parts[3]) : 1, 12));
      if (Number.isNaN(civil.getTime())) return '';
      // A key has no time of day: drop time fields instead of printing a made-up hour.
      const dateOnly = Object.fromEntries(
        Object.entries(options).filter(([field]) => !TIME_FIELDS.includes(field))
      ) as Intl.DateTimeFormatOptions;
      return new Intl.DateTimeFormat(toIntlLocale(locale), { ...dateOnly, timeZone: 'UTC' }).format(civil);
    }
  }
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  return new Intl.DateTimeFormat(toIntlLocale(locale), { ...options, timeZone }).format(instant);
}

/** Wall-clock parts of an instant in the shop zone (for hand-built formats such as `dd/MM/yyyy HH:mm`). */
export function getShopZoneParts(
  instant: Date,
  timeZone: string = DEFAULT_SHOP_TIMEZONE
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const shifted = new Date(instant.getTime() + getTimeZoneOffsetMs(instant, timeZone));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

// ============================================================================
// Rental overlap by civil day
// ============================================================================

/**
 * Two rentals overlap when they share at least one shop civil day (inclusive: a same-day pickup and return
 * still occupies that day). Bounds may be day keys or ISO instants.
 */
export function shopDayRangesOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
  timeZone: string = DEFAULT_SHOP_TIMEZONE
): boolean {
  const keys = [aStart, aEnd, bStart, bEnd].map((value) => toDateKeyInTimeZone(value, timeZone));
  if (keys.some((key) => !key)) return false;
  const [as, ae, bs, be] = keys as string[];
  return as <= be && bs <= ae;
}
