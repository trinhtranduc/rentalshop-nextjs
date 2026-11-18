/**
 * #1621 hour-block pricing ("Theo khối giờ"). Each block is one pricing option row:
 * `type: 'HOURLY'`, `unit: 'HOUR'`, `blockSize` = hours (1–24), `price` = the price of the whole block.
 * A line on a block is priced flat like FIXED (unit × quantity, never × rental days), so the shared
 * `computeOrderLineTotal` already gives its total. The order line keeps `pricingSnapshot = { type: 'HOURLY', hours, price }`
 * so its label ("Khối 4 giờ") survives later edits of the product.
 * Pure: the API, the database layer and the web share these rules.
 */

export const HOUR_BLOCK_MIN_HOURS = 1;
export const HOUR_BLOCK_MAX_HOURS = 24;
export const HOUR_BLOCK_MAX_COUNT = 10;

export interface HourBlock {
  hours: number;
  price: number;
}

export interface HourBlockSnapshot extends HourBlock {
  type: 'HOURLY';
}

type OptionLike = {
  type?: string | null;
  price?: unknown;
  blockSize?: unknown;
  unit?: string | null;
  isActive?: boolean | null;
} | null | undefined;

const isHours = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= HOUR_BLOCK_MIN_HOURS && n <= HOUR_BLOCK_MAX_HOURS;

const isPrice = (n: unknown): boolean => {
  if (n == null || n === '') return false;
  const v = Number(n);
  return Number.isFinite(v) && v >= 0;
};

/** True for an hour-block option row (an HOURLY option with a usable number of hours) */
export function isHourBlockOption(option: OptionLike): boolean {
  return !!option && String(option.type ?? '').toUpperCase() === 'HOURLY' && isHours(Number(option.blockSize));
}

/** The block of an option row, or null when it is not a usable hour block */
export function hourBlockOf(option: OptionLike): HourBlock | null {
  if (!isHourBlockOption(option) || !isPrice(option!.price)) return null;
  return { hours: Number(option!.blockSize), price: Number(option!.price) };
}

/** Active hour blocks of a product, shortest first */
export function hourBlocksOf(options: OptionLike[] | null | undefined): HourBlock[] {
  return (options ?? [])
    .filter((o) => o && o.isActive !== false)
    .map(hourBlockOf)
    .filter((b): b is HourBlock => b != null)
    .sort((a, b) => a.hours - b.hours);
}

/** The snapshot of a stored order line, when it is an hour-block one */
export function hourBlockSnapshotOf(snapshot: unknown): HourBlockSnapshot | null {
  const s = snapshot as Partial<HourBlockSnapshot> | null | undefined;
  if (!s || typeof s !== 'object' || s.type !== 'HOURLY') return null;
  if (!isHours(s.hours) || !isPrice(s.price)) return null;
  return { type: 'HOURLY', hours: s.hours, price: Number(s.price) };
}

export function hourBlockSnapshot(block: HourBlock): HourBlockSnapshot {
  return { type: 'HOURLY', hours: block.hours, price: block.price };
}

export type HourBlocksIssue = 'HOUR_BLOCKS_INVALID';

/**
 * Save-time check of the option set a client that knows hour blocks sends (#1621 spec 2–4):
 * hours whole 1–24 and not repeated, price 0 or more, at most 10 blocks, and at least one other price
 * (Theo lần / Theo ngày / khối ngày) next to them, because a block is never the default price.
 * Null when the set has no HOURLY row or is fine.
 */
export function hourBlocksIssue(options: OptionLike[] | null | undefined): HourBlocksIssue | null {
  const list = (options ?? []).filter(Boolean);
  const hourly = list.filter((o) => String(o!.type ?? '').toUpperCase() === 'HOURLY');
  if (hourly.length === 0) return null;
  if (hourly.length > HOUR_BLOCK_MAX_COUNT) return 'HOUR_BLOCKS_INVALID';
  const seen = new Set<number>();
  for (const o of hourly) {
    const hours = Number(o!.blockSize);
    if (!isHours(hours) || !isPrice(o!.price) || seen.has(hours)) return 'HOUR_BLOCKS_INVALID';
    seen.add(hours);
  }
  if (hourly.length === list.length) return 'HOUR_BLOCKS_INVALID';
  return null;
}
