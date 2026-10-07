/**
 * Vietnam civil-day helpers for the admin dashboard (#578 ADM-1 / ADM-7).
 * Kept free of the @rentalshop/utils barrel so unit tests stay light (same idea as `availability-days` in ui).
 * Vietnam is UTC+7 with no DST: a day starts at 17:00Z the day before.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Vietnam wall-clock fields of an instant. */
export function vnParts(instant: Date): { year: number; month: number; day: number; hour: number } {
  const shifted = new Date(instant.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

/** Vietnam day key (`YYYY-MM-DD`) of an instant. */
export function vnDayKey(instant: Date): string {
  const p = vnParts(instant);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Today in Vietnam. */
export function vnTodayKey(now: Date = new Date()): string {
  return vnDayKey(now);
}

/** Last day of the month that contains `key`. */
export function vnEndOfMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${key.slice(0, 7)}-${pad2(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}

/** 00:00 Vietnam time of `fromKey` to 23:59:59.999 Vietnam time of `toKey`. */
export function vnDayBounds(fromKey: string, toKey: string): { start: Date; end: Date } {
  return {
    start: new Date(Date.parse(`${fromKey}T00:00:00Z`) - VN_OFFSET_MS),
    end: new Date(Date.parse(`${toKey}T00:00:00Z`) - VN_OFFSET_MS + DAY_MS - 1),
  };
}

/** Every day key from `fromKey` to `toKey`, inclusive. */
export function vnDayKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  for (let ms = Date.parse(`${fromKey}T00:00:00Z`); ms <= Date.parse(`${toKey}T00:00:00Z`); ms += DAY_MS) {
    keys.push(new Date(ms).toISOString().slice(0, 10));
  }
  return keys;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Oct 7` for a day key, `Oct 2026` / `Oct` for a month key (en-US labels like the rest of the dashboard). */
export function vnKeyLabel(key: string, withYear = true): string {
  const [y, m, d] = key.split('-').map(Number);
  if (d) return `${MONTHS[m - 1]} ${d}`;
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}
