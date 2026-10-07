/**
 * Rental days (#351): Vietnam civil days from the pickup day to the return day, both included,
 * minimum 1. 03/10 → 04/10 = 2 days, as on iOS (`Cart.calculateRentalDays`) and Android
 * (`CartStore.rentalDaysInclusive`). Vietnam has no DST, so a civil day is UTC+7.
 * Kept light (only the import-free zone helpers) so pricing code and tests can use it directly.
 *
 * #567: an optional shop zone counts days in that zone (IANA math, DST-aware). No zone / Vietnam / an invalid
 * zone keeps the fixed UTC+7 path, so existing callers get the same numbers.
 */
import { usesDefaultShopTimeZone } from './timezone';
import { formatDateKeyInTimeZone } from './date-range';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function keyDayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Civil day number: a `YYYY-MM-DD` key as is, an instant by its shop day (Vietnam by default). NaN when unknown. */
function civilDayNumber(value: string | Date | null | undefined, timeZone?: string): number {
  if (!value) return NaN;
  if (typeof value === 'string' && DATE_KEY.test(value)) return keyDayNumber(value);
  const ms = typeof value === 'string' ? Date.parse(value) : value.getTime();
  if (Number.isNaN(ms)) return NaN;
  if (!usesDefaultShopTimeZone(timeZone)) return keyDayNumber(formatDateKeyInTimeZone(new Date(ms), timeZone as string));
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS);
}

export function countRentalDays(
  pickup: string | Date | null | undefined,
  returnDate: string | Date | null | undefined,
  timeZone?: string
): number {
  const from = civilDayNumber(pickup, timeZone);
  const to = civilDayNumber(returnDate, timeZone);
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.max(1, to - from + 1);
}
