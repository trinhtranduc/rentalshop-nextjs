/**
 * #1621 hour-block lines ("Khối 4 giờ") of a RENT order.
 *
 * A line on an hour block is priced flat like FIXED: the client's unit price × quantity (a typed "Giá cho đơn này"
 * is allowed), never × rental days. The server only stamps what the line is: `pricingType: 'HOURLY'`, the option id
 * and `pricingSnapshot = { type: 'HOURLY', hours, price }` taken from the product's option (the price of the block
 * when the order was made). A snapshot sent by the client is never kept.
 *
 * Editing an order: an installed Android app sends an HOURLY line back without `pricingOptionId`
 * (main-real `ApiClient.kt:740`), and the option row may have been deleted since (product saves replace the option
 * set, FK SetNull). Such a line keeps the option id and snapshot stored on the order.
 *
 * Self-contained on purpose (no workspace import): route tests mock `@rentalshop/utils`. Same rules as
 * `packages/utils/src/core/hour-blocks.ts`; `tests/hour-blocks.test.ts` checks both.
 */

export interface HourBlockSnapshot {
  type: 'HOURLY';
  hours: number;
  price: number;
}

type OptionLike = { id?: number | null; type?: string | null; price?: unknown; blockSize?: unknown; isActive?: boolean | null };
type LineLike = { pricingType?: string | null; pricingOptionId?: number | null };
type StoredLine = { pricingType?: string | null; pricingOptionId?: number | null; pricingSnapshot?: unknown };

const isHours = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 24;
const isPrice = (v: unknown): boolean => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;

/** The snapshot of a stored line when it is an hour-block one */
export function hourBlockSnapshotOf(snapshot: unknown): HourBlockSnapshot | null {
  const s = snapshot as Partial<HourBlockSnapshot> | null | undefined;
  if (!s || typeof s !== 'object' || s.type !== 'HOURLY' || !isHours(s.hours) || !isPrice(s.price)) return null;
  return { type: 'HOURLY', hours: s.hours, price: Number(s.price) };
}

/** The active hour-block option `id` names on this product, or null */
export function findHourBlockOption(
  product: { pricingOptions?: OptionLike[] | null } | null | undefined,
  optionId: number | null | undefined
): (OptionLike & { id: number; hours: number; price: number }) | null {
  if (optionId == null) return null;
  const option = (product?.pricingOptions ?? []).find((o) => o && o.id === optionId && o.isActive !== false);
  if (!option || String(option.type ?? '').toUpperCase() !== 'HOURLY') return null;
  const hours = Number(option.blockSize);
  if (!isHours(hours) || !isPrice(option.price)) return null;
  return { ...option, id: optionId, hours, price: Number(option.price) };
}

export interface HourBlockStamp {
  pricingType: 'HOURLY';
  pricingOptionId: number | null;
  pricingSnapshot: HourBlockSnapshot;
  rentalDays: 1;
}

/**
 * What to write on a RENT line that is an hour-block line, or null when it is not one:
 * - its `pricingOptionId` is an active hour block of the product → that block;
 * - else an HOURLY line matched to a stored hour-block line of the same order (edit) → the stored id and snapshot.
 * A line sent as FIXED / DAILY / BLOCK without a block id is not an hour-block line (the snapshot goes away).
 */
export function stampHourBlockLine(
  line: LineLike,
  product: { pricingOptions?: OptionLike[] | null } | null | undefined,
  stored?: StoredLine | null
): HourBlockStamp | null {
  const option = findHourBlockOption(product, line.pricingOptionId);
  if (option) {
    return {
      pricingType: 'HOURLY',
      pricingOptionId: option.id,
      pricingSnapshot: { type: 'HOURLY', hours: option.hours, price: option.price },
      rentalDays: 1,
    };
  }
  if (String(line.pricingType ?? '').toUpperCase() !== 'HOURLY' || !stored) return null;
  const snapshot = hourBlockSnapshotOf(stored.pricingSnapshot);
  if (!snapshot || String(stored.pricingType ?? '').toUpperCase() !== 'HOURLY') return null;
  // A block id the client sent that is no longer a block of the product is replaced by the stored one
  return { pricingType: 'HOURLY', pricingOptionId: stored.pricingOptionId ?? null, pricingSnapshot: snapshot, rentalDays: 1 };
}
