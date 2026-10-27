/**
 * #1249 the day-block table as the product form holds it. Pure and import-free (form-model must not import
 * @rentalshop/*); `block-model.ts` adds the money maths and the detail-page card.
 */
export type BlockExtraKind = 'EXTRA_PER_DAY' | 'HOLD_LAST';

export interface BlockDraft {
  /** `tiers[i]` is the price of renting exactly `startDay + i` days; null = an empty box */
  tiers: Array<number | null>;
  startDay: number;
  extraMode: BlockExtraKind;
  extraPrice: number | null;
}

export type BlockFormProblem = 'blockEmpty' | 'blockIncomplete';

export const MAX_BLOCK_TIERS = 31;

/** An empty table (new product): one empty day, "mỗi ngày thêm" chosen */
export const emptyBlock = (): BlockDraft => ({ tiers: [null], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: null });

/**
 * A product priced per day without a table opens with its day price on row 1 and the same price for each extra day.
 * That table charges exactly day price × days, so it is the old price shown as a table.
 */
export function seedFromDaily(perDay: number | null): BlockDraft {
  if (perDay == null) return emptyBlock();
  return { tiers: [perDay], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: perDay };
}

const sameBlock = (a: BlockDraft, b: BlockDraft): boolean =>
  a.startDay === b.startDay && a.extraMode === b.extraMode && a.extraPrice === b.extraPrice && a.tiers.length === b.tiers.length && a.tiers.every((t, i) => t === b.tiers[i]);

const isBlank = (b: BlockDraft): boolean => b.tiers.every((t) => t == null) && b.extraPrice == null;

/**
 * The table to send, or null when the form sends no table: nothing typed, or the table is still the one shown from
 * the old day price (then the product is saved as the DAILY price it was).
 */
export function blockToSave(b: BlockDraft, perDay: number | null): BlockDraft | null {
  if (isBlank(b)) return null;
  if (perDay != null && sameBlock(b, seedFromDaily(perDay))) return null;
  return b;
}

/** True when every box the table needs is filled (an `EXTRA_PER_DAY` table needs its extra price; 0 is a price) */
export function blockComplete(b: BlockDraft): boolean {
  if (b.tiers.length < 1 || b.tiers.length > MAX_BLOCK_TIERS || b.tiers.some((t) => t == null || t < 0)) return false;
  return b.extraMode !== 'EXTRA_PER_DAY' || (b.extraPrice != null && b.extraPrice >= 0);
}

/** What stops "Theo ngày" from saving: nothing typed and no old day price, or a table with an empty box */
export function blockProblem(b: BlockDraft, perDay: number | null): BlockFormProblem | null {
  if (isBlank(b) && perDay == null) return 'blockEmpty';
  if (blockToSave(b, perDay) == null) return null;
  return blockComplete(b) ? null : 'blockIncomplete';
}
