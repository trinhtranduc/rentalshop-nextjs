/**
 * #1621 "Theo khối giờ" as the product form holds it: the rows of the "Giá theo khối giờ" dialog and the saved blocks.
 * Pure and import-free (form-model must not import @rentalshop/*). Same rules as `hourBlocksIssue` in
 * packages/utils/src/core/hour-blocks.ts (the API check): whole hours 1–24, each number of hours once, a price of 0 or
 * more, at most 10 blocks. tests/web-hour-blocks.test.ts checks the two agree.
 */

export const HOUR_BLOCK_MIN_HOURS = 1;
export const HOUR_BLOCK_MAX_HOURS = 24;
export const HOUR_BLOCK_MAX_COUNT = 10;

/** A saved block: the hours and the price of the whole block */
export interface HourBlock {
  hours: number;
  price: number;
}

/** A dialog row; null = an empty box */
export interface HourBlockRow {
  hours: number | null;
  price: number | null;
}

export type HourRowProblem = 'hours' | 'repeated' | 'price';

const isHours = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= HOUR_BLOCK_MIN_HOURS && n <= HOUR_BLOCK_MAX_HOURS;

const isPrice = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

const blank = (r: HourBlockRow): boolean => r.hours == null && r.price == null;

/** The dialog starts from the saved blocks, or one empty row ("Chưa cài") */
export function rowsFromBlocks(blocks: HourBlock[]): HourBlockRow[] {
  return blocks.length > 0 ? blocks.map((b) => ({ hours: b.hours, price: b.price })) : [{ hours: null, price: null }];
}

export const canAddHourRow = (rows: HourBlockRow[]): boolean => rows.length < HOUR_BLOCK_MAX_COUNT;

/** "+ Thêm khối": a new empty row (at most 10) */
export function addHourRow(rows: HourBlockRow[]): HourBlockRow[] {
  return canAddHourRow(rows) ? [...rows, { hours: null, price: null }] : rows;
}

export function removeHourRow(rows: HourBlockRow[], index: number): HourBlockRow[] {
  return rows.filter((_, i) => i !== index);
}

export function setHourRow(rows: HourBlockRow[], index: number, patch: Partial<HourBlockRow>): HourBlockRow[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
}

/**
 * What is wrong with each row (null = fine). A row left fully empty is not a problem: it is dropped on save.
 * A number of hours used twice marks every row that has it.
 */
export function hourRowProblems(rows: HourBlockRow[]): Array<HourRowProblem | null> {
  const count = new Map<number, number>();
  for (const r of rows) if (!blank(r) && isHours(r.hours)) count.set(r.hours, (count.get(r.hours) ?? 0) + 1);
  return rows.map((r) => {
    if (blank(r)) return null;
    if (!isHours(r.hours)) return 'hours';
    if ((count.get(r.hours) ?? 0) > 1) return 'repeated';
    if (!isPrice(r.price)) return 'price';
    return null;
  });
}

/**
 * "Lưu bảng giá": the blocks to keep, shortest first, or null while a row is wrong. Fully empty rows are dropped, so
 * saving with no block left is the same as "Tắt giá theo khối giờ" (an empty list).
 */
export function hourBlocksFromRows(rows: HourBlockRow[]): HourBlock[] | null {
  const kept = rows.filter((r) => !blank(r));
  if (kept.length > HOUR_BLOCK_MAX_COUNT || hourRowProblems(kept).some((p) => p != null)) return null;
  return kept.map((r) => ({ hours: r.hours as number, price: r.price as number })).sort((a, b) => a.hours - b.hours);
}

/** The usable hour block of a saved option row (an HOURLY option with whole hours 1–24 and a price), else null */
export function hourBlockOfOption(o: { type?: string | null; price?: unknown; blockSize?: unknown; isActive?: boolean | null } | null | undefined): HourBlock | null {
  if (!o || o.isActive === false || String(o.type ?? '').toUpperCase() !== 'HOURLY') return null;
  const hours = Number(o.blockSize);
  if (o.blockSize == null || !isHours(hours)) return null;
  if (o.price == null || o.price === '') return null;
  const price = Number(o.price);
  return isPrice(price) ? { hours, price } : null;
}

/** The saved blocks of a product, shortest first (a repeated number of hours keeps the first row) */
export function savedHourBlocksOf(options: Array<Parameters<typeof hourBlockOfOption>[0]> | null | undefined): HourBlock[] {
  const out: HourBlock[] = [];
  for (const o of options ?? []) {
    const b = hourBlockOfOption(o);
    if (b && !out.some((x) => x.hours === b.hours)) out.push(b);
  }
  return out.sort((a, b) => a.hours - b.hours);
}

/** Lowest and highest block price ("150.000 – 400.000"), null without blocks */
export function hourBlockPriceRange(blocks: HourBlock[]): { min: number; max: number } | null {
  if (blocks.length === 0) return null;
  const prices = blocks.map((b) => b.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
