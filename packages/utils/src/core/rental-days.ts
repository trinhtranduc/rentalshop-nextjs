/**
 * Rental days (#351): Vietnam civil days from the pickup day to the return day, both included,
 * minimum 1. 03/10 → 04/10 = 2 days, as on iOS (`Cart.calculateRentalDays`) and Android
 * (`CartStore.rentalDaysInclusive`). Vietnam has no DST, so a civil day is UTC+7.
 * Kept free of other imports so pricing code and tests can use it directly.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Civil day number: a `YYYY-MM-DD` key as is, an instant by its Vietnam day. NaN when unknown. */
function civilDayNumber(value: string | Date | null | undefined): number {
  if (!value) return NaN;
  if (typeof value === 'string' && DATE_KEY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / DAY_MS;
  }
  const ms = typeof value === 'string' ? Date.parse(value) : value.getTime();
  return Number.isNaN(ms) ? NaN : Math.floor((ms + VN_OFFSET_MS) / DAY_MS);
}

export function countRentalDays(pickup: string | Date | null | undefined, returnDate: string | Date | null | undefined): number {
  const from = civilDayNumber(pickup);
  const to = civilDayNumber(returnDate);
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.max(1, to - from + 1);
}
