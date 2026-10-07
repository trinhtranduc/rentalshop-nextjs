import {
  SHOP_TIMEZONE,
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  getUtcRangeForDateKeys,
  normalizeEndDate,
  normalizeStartDate,
} from '@rentalshop/utils';
import { getOperationsDay } from './outlet-operations-day';

/**
 * Vietnam civil days for day-based reports (#594, timezone batch B of #578).
 * A range bound is read like `normalizeStartDate` / `normalizeEndDate`: a `YYYY-MM-DD` key is that Vietnam day,
 * the end of an old UTC-day window (`T23:59:59[.fff]Z`) keeps its written date, any other instant is the
 * Vietnam day that contains it. Bounds are the first and last millisecond of those days.
 */

export interface ReportRange {
  startKey: string;
  endKey: string;
  start: Date;
  end: Date;
}

/** Vietnam days `fromKey`..`toKey` (inclusive). */
export function reportRangeOfKeys(fromKey: string, toKey: string): ReportRange {
  return { startKey: fromKey, endKey: toKey, ...getUtcRangeForDateKeys({ from: fromKey, to: toKey }, SHOP_TIMEZONE) };
}

/** Range of two query values; `null` when either is missing or not a date. */
export function readReportRange(startParam: string | null | undefined, endParam: string | null | undefined): ReportRange | null {
  const start = startParam ? normalizeStartDate(startParam) : null;
  const end = endParam ? normalizeEndDate(endParam) : null;
  if (!start || !end) return null;
  return {
    startKey: formatDateKeyInTimeZone(start, SHOP_TIMEZONE),
    endKey: formatDateKeyInTimeZone(end, SHOP_TIMEZONE),
    start,
    end,
  };
}

/** Vietnam today (`dateKey`, `start`, `end`). */
export function shopToday(now: Date = new Date()): { dateKey: string; start: Date; end: Date } {
  return getOperationsDay(now);
}

/** The `days` Vietnam days before today plus today: [today - days, today]. */
export function lastShopDays(days: number, now: Date = new Date()): ReportRange {
  const today = shopToday(now).dateKey;
  return reportRangeOfKeys(addDaysToDateKey(today, -days), today);
}

/** First and last day of the Vietnam month of `key`. */
export function monthKeysOf(key: string): { from: string; to: string } {
  const from = `${key.slice(0, 7)}-01`;
  return { from, to: addDaysToDateKey(addMonthsToMonthStart(from, 1), -1) };
}

/** `YYYY-MM-01` plus `months` months. */
function addMonthsToMonthStart(monthStart: string, months: number): string {
  const y = Number(monthStart.slice(0, 4));
  const m = Number(monthStart.slice(5, 7)) - 1 + months;
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Comparison period for growth numbers: a range inside one month compares with the whole previous month;
 * a longer range compares with the same months one year earlier.
 */
export function previousPeriodKeys(startKey: string, endKey: string): { from: string; to: string } {
  if (startKey.slice(0, 7) === endKey.slice(0, 7)) {
    return monthKeysOf(addMonthsToMonthStart(`${startKey.slice(0, 7)}-01`, -1));
  }
  const from = addMonthsToMonthStart(`${startKey.slice(0, 7)}-01`, -12);
  const to = monthKeysOf(addMonthsToMonthStart(`${endKey.slice(0, 7)}-01`, -12)).to;
  return { from, to };
}

/**
 * The one overdue rule (#594, API-12): a rental still picked up whose planned return is before the start of
 * Vietnam today. A return planned for today is due, not late.
 */
export function overdueReturnWhere(now: Date = new Date()) {
  return {
    status: 'PICKUPED' as const,
    returnPlanAt: { not: null, lt: shopToday(now).start },
  };
}
