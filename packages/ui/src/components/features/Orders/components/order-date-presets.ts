/**
 * Order list date presets (#578 batch C, ADM-4 / PKG-4).
 * Ranges are Vietnam civil-day keys built from the Vietnam today, whatever the browser zone; a custom range keeps
 * the keys the user typed. Components that hand Dates out use the Vietnam day bounds of those keys.
 * Kept free of the @rentalshop/utils barrel (like `availability-days`) so unit tests stay light.
 */
import { addDaysToKey, shopDateKey, shopDayRangeIso, todayShopKey } from '../../Availability/availability-days';

export type OrderPresetId = 'today' | 'week' | 'month' | '90days' | 'year' | 'quarter' | 'all';

export interface DateKeyRange {
  from: string;
  to: string;
}

/** First day offered by "All time". */
export const ALL_TIME_START_KEY = '2020-01-01';

/** Monday of the week that contains `key`. */
function weekStartKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDaysToKey(key, weekday === 0 ? -6 : 1 - weekday);
}

/** First day of the calendar quarter that contains `key`. */
function quarterStartKey(key: string): string {
  const month = Number(key.slice(5, 7));
  return `${key.slice(0, 4)}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0')}-01`;
}

/** Keys of a preset, ending on the Vietnam today. "Last N days" keeps the old meaning: today − N … today. */
export function orderPresetKeys(id: OrderPresetId, now: Date = new Date()): DateKeyRange {
  const today = todayShopKey(now);
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: weekStartKey(today), to: today };
    case 'quarter':
      return { from: quarterStartKey(today), to: today };
    case '90days':
      return { from: addDaysToKey(today, -90), to: today };
    case 'year':
      return { from: addDaysToKey(today, -365), to: today };
    case 'all':
      return { from: ALL_TIME_START_KEY, to: today };
    case 'month':
    default:
      return { from: addDaysToKey(today, -30), to: today };
  }
}

/** Vietnam day bounds of a key range: 00:00 of `from` to 23:59:59.999 of `to`. */
export function rangeForKeys(keys: DateKeyRange): { start: Date; end: Date } {
  const { startDate, endDate } = shopDayRangeIso(keys.from, keys.to);
  return { start: new Date(startDate), end: new Date(endDate) };
}

/** Vietnam day keys of a range of instants (inverse of `rangeForKeys`). */
export function keysForRange(start: Date, end: Date): DateKeyRange {
  return { from: shopDateKey(start), to: shopDateKey(end) };
}

/** Export dialog custom range default: the last 30 Vietnam days. */
export function exportCustomDefaultKeys(now: Date = new Date()): { startDate: string; endDate: string } {
  const today = todayShopKey(now);
  return { startDate: addDaysToKey(today, -30), endDate: today };
}
