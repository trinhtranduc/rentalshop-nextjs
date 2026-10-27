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

export const MAX_BLOCK_TIERS = 31;

/** A new table for the setup screen: one empty day, "mỗi ngày thêm" chosen */
export const emptyBlock = (): BlockDraft => ({ tiers: [null], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: null });

/** True when every box the table needs is filled (an `EXTRA_PER_DAY` table needs its extra price; 0 is a price) */
export function blockComplete(b: BlockDraft): boolean {
  if (b.tiers.length < 1 || b.tiers.length > MAX_BLOCK_TIERS || b.tiers.some((t) => t == null || t < 0)) return false;
  return b.extraMode !== 'EXTRA_PER_DAY' || (b.extraPrice != null && b.extraPrice >= 0);
}

/** "Tạo nhanh": the first day's price plus a step for each extra day makes `days` rows (1 … 31); the step is also the extra price past the table */
export function quickTable(first: number, step: number, days: number): BlockDraft {
  const n = Math.max(1, Math.min(MAX_BLOCK_TIERS, Math.floor(days)));
  return { tiers: Array.from({ length: n }, (_, i) => first + i * step), startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: step };
}
