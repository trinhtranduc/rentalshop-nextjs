/**
 * Renewal bar (#589, WEB-4): how many days ago the subscription expired, in civil days of the shop.
 * Pure, no @rentalshop/* imports, so Jest loads it; the caller passes the Vietnam day-key formatter.
 */
type ToKey = (instant: Date) => string;

const keyMs = (key: string): number => Date.parse(`${key}T00:00:00Z`);

/** Civil days from the end's day to today's day; null when there is no valid end or it is not past yet. */
export function expiredDaysAgo(end: string | Date | null | undefined, now: Date, toKey: ToKey): number | null {
  if (!end) return null;
  const endAt = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(endAt.getTime()) || endAt.getTime() >= now.getTime()) return null;
  return Math.round((keyMs(toKey(now)) - keyMs(toKey(endAt))) / 86400000);
}
