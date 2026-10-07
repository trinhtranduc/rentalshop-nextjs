// ============================================================================
// BILLING DATES — subscription day counts and month addition on the shop's
// civil calendar (Vietnam). #588 / #578 §E.
// ============================================================================

import { formatDateKeyInTimeZone, getTimeZoneOffsetMs } from './date-range';

/** Zone for billing days. Same value as `SHOP_TIMEZONE` (kept literal to keep this file import-light). */
export const BILLING_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Civil days from the day of `from` to the day of `to`, both read in `timeZone`.
 * Does not depend on the hour: anything on 10 Mar VN to anything on 20 Mar VN is 10.
 * Negative when `to` falls on an earlier day.
 *
 * @example
 * civilDaysBetween(new Date('2026-03-09T17:00:00Z'), new Date('2026-03-10T16:59:59Z')) // 0 (same VN day)
 */
export function civilDaysBetween(from: Date, to: Date, timeZone: string = BILLING_TIME_ZONE): number {
  const fromKey = formatDateKeyInTimeZone(new Date(from), timeZone);
  const toKey = formatDateKeyInTimeZone(new Date(to), timeZone);
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);
}

/**
 * Add calendar months to an instant, reading its wall time in `timeZone`.
 * The day is clamped to the last day of the target month and the wall-clock time is kept:
 * 31 Jan + 1 = 28 Feb (29 Feb in a leap year), 31 Mar + 1 = 30 Apr. `months` may be negative.
 *
 * @example
 * addMonthsInTimeZone(new Date('2026-01-30T17:00:00Z'), 1) // 2026-02-27T17:00:00Z (28 Feb 00:00 VN)
 */
export function addMonthsInTimeZone(
  instant: Date,
  months: number,
  timeZone: string = BILLING_TIME_ZONE
): Date {
  const source = new Date(instant);
  const offset = getTimeZoneOffsetMs(source, timeZone);
  // UTC fields of `wall` are the wall-clock fields in `timeZone`.
  const wall = new Date(source.getTime() + offset);
  const year = wall.getUTCFullYear();
  const month = wall.getUTCMonth() + months;
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(wall.getUTCDate(), lastDayOfTarget);

  const targetWall = Date.UTC(
    year,
    month,
    day,
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds()
  );
  // Re-read the offset at the target so zones with DST land on the same wall time.
  const estimate = new Date(targetWall - offset);
  return new Date(targetWall - getTimeZoneOffsetMs(estimate, timeZone));
}
