import { addDaysToDateKey } from '@rentalshop/utils';

/** #1612 a Monday..Sunday week as civil-day keys (YYYY-MM-DD) */
export interface WeekKeys {
  start: string;
  end: string;
}

/** 0 = Sunday .. 6 = Saturday for a YYYY-MM-DD key (the key is a calendar day, so UTC is safe here) */
function weekdayOfKey(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** Monday of the week that holds `key` */
export function mondayOf(key: string): string {
  return addDaysToDateKey(key, -((weekdayOfKey(key) + 6) % 7));
}

/** The last full week before the week of `todayKey`: on Monday 2026-11-16 that is 2026-11-09..2026-11-15 */
export function lastFullWeek(todayKey: string): WeekKeys {
  const start = addDaysToDateKey(mondayOf(todayKey), -7);
  return { start, end: addDaysToDateKey(start, 6) };
}

/** The week before `week` */
export function previousWeek(week: WeekKeys): WeekKeys {
  return { start: addDaysToDateKey(week.start, -7), end: addDaysToDateKey(week.end, -7) };
}

/** Monday on which the next summary can be written */
export function nextWeekStart(todayKey: string): string {
  return addDaysToDateKey(mondayOf(todayKey), 7);
}

/** The seven day keys of a week */
export function daysOf(week: WeekKeys): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(week.start, i));
}
