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
