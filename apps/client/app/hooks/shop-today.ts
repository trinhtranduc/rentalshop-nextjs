/**
 * The shop's "today" (#589, WEB-2): the Vietnam day key of an instant and the time left until the next
 * Vietnam midnight. Pure, so Jest loads it; `useShopToday` schedules its refresh from it.
 */
import { formatDateKeyInTimeZone, getCalendarDayRangeInTimeZone, SHOP_TIMEZONE } from '@rentalshop/utils';

export function shopToday(now: Date, timeZone: string = SHOP_TIMEZONE): { key: string; msToNextDay: number } {
  const key = formatDateKeyInTimeZone(now, timeZone);
  const next = getCalendarDayRangeInTimeZone(now, timeZone, 1).start.getTime();
  return { key, msToNextDay: Math.max(0, next - now.getTime()) };
}
