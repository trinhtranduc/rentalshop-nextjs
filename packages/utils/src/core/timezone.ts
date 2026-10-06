/**
 * Shop time zone (#567) — import-free so date helpers, pricing code and tests can use it directly.
 *
 * Each shop (Merchant) has an IANA zone (`Merchant.timezone`). Every shop that existed before #567, and every
 * register call without a zone, is on `Asia/Ho_Chi_Minh`. Day helpers take an optional zone that defaults to
 * this one, so a caller that passes nothing gets exactly the Vietnam answers it got before.
 */

/** Zone of every shop that did not choose one (Vietnam, UTC+7, no DST). */
export const DEFAULT_SHOP_TIMEZONE = 'Asia/Ho_Chi_Minh';

const MAX_TIMEZONE_LENGTH = 64;
const validity = new Map<string, boolean>();

/**
 * True when `tz` is a time zone id that `Intl.DateTimeFormat` accepts (e.g. `Asia/Tokyo`, `America/New_York`,
 * `UTC`). Anything else — empty, not a string, unknown id — is false. Never throws.
 */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string') return false;
  const value = tz.trim();
  if (!value || value !== tz || value.length > MAX_TIMEZONE_LENGTH) return false;
  const known = validity.get(value);
  if (known !== undefined) return known;
  let ok = false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    ok = true;
  } catch {
    ok = false;
  }
  validity.set(value, ok);
  return ok;
}

/** `tz` when it is a valid zone, else the default (Vietnam). For lenient inputs (register, stored rows). */
export function resolveShopTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_SHOP_TIMEZONE;
}

/**
 * True when a helper should take its historical Vietnam path (fixed UTC+7 math): no zone, the default zone, or
 * an invalid zone. Only a valid, non-default zone switches a helper to IANA math.
 */
export function usesDefaultShopTimeZone(tz: string | null | undefined): boolean {
  return !tz || tz === DEFAULT_SHOP_TIMEZONE || !isValidTimeZone(tz);
}
