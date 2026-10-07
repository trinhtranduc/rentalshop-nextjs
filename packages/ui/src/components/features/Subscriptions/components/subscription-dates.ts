/**
 * Admin subscription dates (#578 batch C, ADM-5 / ADM-6). Day math is on Vietnam civil-day keys, whatever the
 * browser zone; an extension ends at 23:59:59.999 Vietnam time of the chosen day.
 * Kept free of the @rentalshop/utils barrel (like `availability-days`) so unit tests stay light.
 */
import { addDaysToKey, shopDateKey, shopDayRangeIso, todayShopKey } from '../../Availability/availability-days';

type DateInput = Date | string | null | undefined;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Vietnam: UTC+7, no DST

function toInstant(value: DateInput): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `YYYY-MM-DD` plus whole calendar months, clamped to the end of the target month
 * (31 Jan + 1 month = 28 Feb, 29 Feb in a leap year).
 */
export function addMonthsClamped(key: string, months: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12 + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** Vietnam day of the current period end, or the Vietnam today when there is none. */
export function extensionBaseKey(currentPeriodEnd: DateInput, now: Date = new Date()): string {
  const end = toInstant(currentPeriodEnd);
  return end ? shopDateKey(end) : todayShopKey(now);
}

/** New end day = base day + `months` calendar months (end-of-month clamp). */
export function extensionEndKeyForMonths(currentPeriodEnd: DateInput, months: number, now: Date = new Date()): string {
  return addMonthsClamped(extensionBaseKey(currentPeriodEnd, now), months);
}

/** Custom extension default: base day + 30 days. */
export function defaultCustomExtensionKey(currentPeriodEnd: DateInput, now: Date = new Date()): string {
  return addDaysToKey(extensionBaseKey(currentPeriodEnd, now), 30);
}

/** The instant saved for an extension that ends on `key`: 23:59:59.999 Vietnam time. */
export function extensionEndInstant(key: string): Date {
  return new Date(shopDayRangeIso(key, key).endDate);
}

interface SubscriptionFormDateSource {
  startDate?: DateInput;
  endDate?: DateInput;
  nextBillingDate?: DateInput;
  currentPeriodStart?: DateInput;
  currentPeriodEnd?: DateInput;
}

/**
 * Dates the subscription form starts from. The edit page passes `startDate` / `endDate` / `nextBillingDate`;
 * older callers pass `currentPeriodStart` / `currentPeriodEnd`. Saving without edits keeps these instants.
 */
export function initialSubscriptionFormDates(
  source: SubscriptionFormDateSource | null | undefined,
  now: Date = new Date()
): { startDate: Date; endDate: Date; nextBillingDate: Date } {
  const start = toInstant(source?.startDate) || toInstant(source?.currentPeriodStart) || now;
  const end = toInstant(source?.endDate) || toInstant(source?.currentPeriodEnd) || now;
  const nextBilling = toInstant(source?.nextBillingDate) || toInstant(source?.currentPeriodEnd) || end;
  return { startDate: start, endDate: end, nextBillingDate: nextBilling };
}

/**
 * `instant` moved by whole calendar days / months on the Vietnam calendar, keeping its Vietnam wall-clock time
 * (months clamp to the end of the month). Used for the trial / period end the form proposes.
 */
export function shiftShopDate(instant: Date, { days = 0, months = 0 }: { days?: number; months?: number }): Date {
  if (Number.isNaN(instant.getTime())) return instant;
  let key = shopDateKey(instant);
  const timeOfDayMs = (instant.getTime() + VN_OFFSET_MS) % 86_400_000;
  if (months) key = addMonthsClamped(key, months);
  if (days) key = addDaysToKey(key, days);
  return new Date(new Date(shopDayRangeIso(key, key).startDate).getTime() + timeOfDayMs);
}
