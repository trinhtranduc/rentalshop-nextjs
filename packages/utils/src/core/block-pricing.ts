/**
 * Day-block rental pricing (#1189): a price table by number of days, e.g. 1 day 80.000, 2 days 100.000,
 * 3 days 120.000, then "+20.000 per extra day". One pure function shared by the API, the web, and (ported
 * with the same golden numbers) iOS and Android.
 *
 * - `tiers[i]` is the all-in price of renting exactly `startDay + i` days (not per day, not cumulative).
 * - Fewer days than `startDay` cost the first tier.
 * - Past the last tier: `EXTRA_PER_DAY` adds `extraPrice` for every day after the last tier day;
 *   `HOLD_LAST` keeps the last tier price (the owner has not chosen the default yet, both are supported).
 * - The result is rounded once, at the end, to the currency minor unit (VND 1, USD 0.01).
 *
 * The number of days comes from `countRentalDays` (Vietnam civil days, same-day pickup and return = 1);
 * this file knows nothing about dates.
 */

export type BlockExtraMode = 'EXTRA_PER_DAY' | 'HOLD_LAST';

export const BLOCK_EXTRA_MODES: readonly BlockExtraMode[] = ['EXTRA_PER_DAY', 'HOLD_LAST'];
export const BLOCK_MAX_TIERS = 31;
export const BLOCK_MAX_START_DAY = 31;

export interface BlockPricingTable {
  tiers: number[];
  startDay?: number | null;
  extraMode?: BlockExtraMode | string | null;
  extraPrice?: number | null;
}

export interface BlockRentDetail {
  /** Rounded price for the whole rental, one unit */
  total: number;
  /** Days the caller asked for (at least 1) */
  days: number;
  /** Day number of the last tier */
  lastTierDay: number;
  /** Days charged beyond the last tier (0 when inside the table or HOLD_LAST) */
  extraDays: number;
  /** Price of the tier that applies (last tier when past the table) */
  basePrice: number;
  /** Amount added for the extra days */
  extraAmount: number;
}

/** Currencies with no minor unit; every other code is treated as having cents */
const WHOLE_CURRENCIES = new Set(['VND', 'JPY', 'KRW', 'CLP', 'ISK']);

/** Smallest amount of a currency: VND 1, USD 0.01 (a missing code is the platform default, USD) */
export function currencyMinorUnit(currency?: string | null): number {
  return WHOLE_CURRENCIES.has(String(currency || '').toUpperCase()) ? 1 : 0.01;
}

/** Rounds half up to the minor unit; `toPrecision` removes float noise such as 1.005 * 100 = 100.49999999999999 */
export function roundToMinorUnit(value: number, minorUnit = 1): number {
  const per = Math.round(1 / minorUnit);
  return Math.round(Number((value * per).toPrecision(12))) / per;
}

const isMoney = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** A table the calculator accepts: 1..31 tiers of 0 or more, start day 1..31, a known mode, an extra of 0 or more */
export function isValidBlockTable(table: BlockPricingTable | null | undefined): boolean {
  if (!table || !Array.isArray(table.tiers)) return false;
  if (table.tiers.length < 1 || table.tiers.length > BLOCK_MAX_TIERS) return false;
  if (!table.tiers.every(isMoney)) return false;
  const start = table.startDay ?? 1;
  if (!Number.isInteger(start) || start < 1 || start > BLOCK_MAX_START_DAY) return false;
  const mode = table.extraMode ?? 'EXTRA_PER_DAY';
  if (!BLOCK_EXTRA_MODES.includes(mode as BlockExtraMode)) return false;
  if (table.extraPrice != null && !isMoney(table.extraPrice)) return false;
  return true;
}

/**
 * #1223 what a product SAVE accepts: a valid table, and "+X per extra day" must have its X (0 is a price).
 * `isValidBlockTable` stays lenient on purpose: a table already stored without X is still read (+0), never a 500.
 */
export function isCompleteBlockTable(table: BlockPricingTable | null | undefined): boolean {
  if (!isValidBlockTable(table)) return false;
  const mode = table!.extraMode ?? 'EXTRA_PER_DAY';
  return mode !== 'EXTRA_PER_DAY' || table!.extraPrice != null;
}

/** Price and breakdown for `days` days (one unit). Throws RangeError for a table `isValidBlockTable` refuses. */
export function calculateBlockRentDetail(
  tiers: number[],
  startDay: number | null | undefined,
  extraMode: BlockExtraMode | string | null | undefined,
  extraPrice: number | null | undefined,
  days: number,
  minorUnit = 1
): BlockRentDetail {
  const table: BlockPricingTable = { tiers, startDay, extraMode, extraPrice };
  if (!isValidBlockTable(table)) throw new RangeError('BLOCK_TABLE_INVALID');
  const start = startDay ?? 1;
  const mode = (extraMode ?? 'EXTRA_PER_DAY') as BlockExtraMode;
  const d = Math.max(1, Math.floor(Number(days) || 1));
  const lastTierDay = start + tiers.length - 1;

  let basePrice: number;
  let extraDays = 0;
  let extraAmount = 0;
  if (d <= start) {
    basePrice = tiers[0];
  } else if (d <= lastTierDay) {
    basePrice = tiers[d - start];
  } else {
    basePrice = tiers[tiers.length - 1];
    if (mode === 'EXTRA_PER_DAY') {
      extraDays = d - lastTierDay;
      extraAmount = extraDays * (extraPrice ?? 0);
    }
  }
  // Exact sum first, one rounding at the end (never per day)
  const total = roundToMinorUnit(basePrice + extraAmount, minorUnit);
  return { total, days: d, lastTierDay, extraDays, basePrice, extraAmount: roundToMinorUnit(extraAmount, minorUnit) };
}

/** Price of one unit rented for `days` days (see file header). */
export function calculateBlockRent(
  tiers: number[],
  startDay: number | null | undefined,
  extraMode: BlockExtraMode | string | null | undefined,
  extraPrice: number | null | undefined,
  days: number,
  minorUnit = 1
): number {
  return calculateBlockRentDetail(tiers, startDay, extraMode, extraPrice, days, minorUnit).total;
}

/** Same as `calculateBlockRent` for a stored table (option columns or an order line snapshot) */
export function calculateBlockRentForTable(table: BlockPricingTable, days: number, minorUnit = 1): number {
  return calculateBlockRent(table.tiers, table.startDay, table.extraMode, table.extraPrice, days, minorUnit);
}

/** Price of the first day = `price` of a BLOCK option (old apps read it as a plain FIXED price) */
export function blockFirstDayPrice(tiers: number[]): number {
  return tiers[0] ?? 0;
}
