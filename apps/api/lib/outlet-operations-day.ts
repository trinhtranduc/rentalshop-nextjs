import { toAvailabilityCivilDateKey } from './availability-calendar-days';

/**
 * The Vietnam civil day the operations panel works on (#350): `dateKey` plus its UTC bounds for SQL.
 * Same day model as Order Check (availability-calendar-days), and kept free of the @rentalshop/utils
 * barrel so unit tests stay light. Vietnam has no DST: the day starts at 17:00Z the day before.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getOperationsDay(now: Date = new Date()) {
  const dateKey = toAvailabilityCivilDateKey(now);
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - VN_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { dateKey, start, end };
}

/** Civil day key (Asia/Ho_Chi_Minh) of a stored instant. */
export const toOperationsDateKey = toAvailabilityCivilDateKey;

/** Whole civil days from `fromKey` to `toKey` (both `YYYY-MM-DD`). */
export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const toUtcMidnight = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtcMidnight(toKey) - toUtcMidnight(fromKey)) / DAY_MS);
}

/** The 7 Vietnam civil days ending today, oldest first (sparkline on the Today dashboard). */
export function getOperationsWeek(now: Date = new Date()) {
  const today = getOperationsDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const start = new Date(today.start.getTime() - (6 - i) * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS - 1);
    return { dateKey: toAvailabilityCivilDateKey(start), start, end };
  });
}

/** UTC bounds of Vietnam civil days `fromKey`..`toKey` (both `YYYY-MM-DD`, inclusive). */
export function civilDayRange(fromKey: string, toKey: string): { start: Date; end: Date } {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const start = new Date(Date.UTC(fy, fm - 1, fd) - VN_OFFSET_MS);
  const end = new Date(Date.UTC(ty, tm - 1, td) - VN_OFFSET_MS + DAY_MS - 1);
  return { start, end };
}
