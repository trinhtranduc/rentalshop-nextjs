/**
 * #1621 save-time check of the hour blocks ("Theo khối giờ") a client with the `hour-blocks` capability sends:
 * hours whole 1–24 and not repeated, price 0 or more, at most 10 blocks, and at least one other price (Theo lần /
 * Theo ngày / khối ngày) next to them, because a block is never the default price. Returns the error code or null.
 * Other clients are not checked: their HOURLY rows are ignored on save and the stored ones kept.
 *
 * Self-contained on purpose (no workspace import): route tests mock `@rentalshop/utils`. The rules are the ones of
 * `hourBlocksIssue` (packages/utils/src/core/hour-blocks.ts); `tests/hour-blocks.test.ts` keeps them equal.
 */
type OptionLike = { type?: string | null; price?: unknown; blockSize?: unknown } | null | undefined;

const MAX_BLOCKS = 10;

const isHours = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 24;
const isPrice = (v: unknown): boolean => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;

export function hourBlocksIssue(options: OptionLike[] | null | undefined): 'HOUR_BLOCKS_INVALID' | null {
  const list = (options ?? []).filter(Boolean);
  const hourly = list.filter((o) => String(o!.type ?? '').toUpperCase() === 'HOURLY');
  if (hourly.length === 0) return null;
  if (hourly.length > MAX_BLOCKS || hourly.length === list.length) return 'HOUR_BLOCKS_INVALID';
  const seen = new Set<number>();
  for (const o of hourly) {
    const hours = Number(o!.blockSize);
    if (!isHours(hours) || !isPrice(o!.price) || seen.has(hours)) return 'HOUR_BLOCKS_INVALID';
    seen.add(hours);
  }
  return null;
}
