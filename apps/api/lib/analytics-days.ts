import {
  SHOP_TIMEZONE,
  addDaysToDateKey,
  getUtcRangeForDateKeys,
  toDateKeyInTimeZone,
} from '@rentalshop/utils';
import { isValidTimeZone } from './calendar-scope';

/**
 * Day handling shared by the analytics routes and the order list (#355).
 * `startDate`/`endDate` name civil days of the shop (Asia/Ho_Chi_Minh) unless the client sends a valid
 * IANA `timeZone`. An ISO instant counts as the civil day that contains it. Stored values stay UTC.
 */

/** `timeZone` query param: the zone when valid, Vietnam when absent, `null` when unknown (→ 400). */
export function readAnalyticsTimeZone(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get('timeZone');
  if (!raw) return SHOP_TIMEZONE;
  return raw.length <= 64 && isValidTimeZone(raw) ? raw : null;
}

export interface CivilRange {
  startKey: string;
  endKey: string;
  /** UTC instant of 00:00 on `startKey` in the zone */
  start: Date;
  /** UTC instant of 23:59:59.999 on `endKey` in the zone */
  end: Date;
}

/**
 * Civil-day range of two query values; `null` when either is not a date.
 * Start after end is returned as is (`start > end`) so each route keeps its own error code for it.
 */
export function readCivilRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  timeZone: string
): CivilRange | null {
  const startKey = toDateKeyInTimeZone(startDate, timeZone);
  const endKey = toDateKeyInTimeZone(endDate, timeZone);
  if (!startKey || !endKey) return null;
  return { startKey, endKey, ...getUtcRangeForDateKeys({ from: startKey, to: endKey }, timeZone) };
}

/** Same range widened by one civil day on each side (SQL pre-filter; events are then checked exactly). */
export function widenCivilRange(range: CivilRange, timeZone: string): { start: Date; end: Date } {
  return getUtcRangeForDateKeys(
    { from: addDaysToDateKey(range.startKey, -1), to: addDaysToDateKey(range.endKey, 1) },
    timeZone
  );
}
