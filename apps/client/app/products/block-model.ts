/**
 * Giá thuê theo khối ngày (#1189) on the product pages: the draft behind the "Bảng giá theo ngày" card of the detail
 * page, its checks, the preview and the body of `PUT /api/products/[id]`. Pure; the money rule is
 * `calculateBlockRentDetail` from @rentalshop/utils (golden numbers in tests/fixtures/block-pricing-golden.json).
 */
import { BLOCK_MAX_TIERS, calculateBlockRentDetail, isValidBlockTable, type BlockExtraMode } from '@rentalshop/utils';

export type RentMode = 'FIXED' | 'DAILY' | 'BLOCK';

export interface BlockOptionSource {
  type?: string | null;
  price?: number | string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  blockTiers?: unknown;
  blockStartDay?: number | null;
  blockExtraMode?: string | null;
  blockExtraPrice?: number | null;
}

export interface BlockProductSource {
  pricingOptions?: BlockOptionSource[] | null;
  pricingType?: string | null;
  rentPrice?: number | string | null;
}

export type { BlockDraft } from './block-draft';
export { blockToSave, seedFromDaily } from './block-draft';
import type { BlockDraft } from './block-draft';

export interface PricingDraft {
  mode: RentMode;
  /** "Thuê theo lần" price, null = none */
  perRental: number | null;
  /** "Thuê theo ngày" price, null = none */
  perDay: number | null;
  block: BlockDraft;
}

const money = (n: unknown): number | null => {
  if (n == null || n === '') return null;
  const v = typeof n === 'string' ? Number(n) : (n as number);
  return Number.isFinite(v) && v >= 0 ? v : null;
};

const active = (p: BlockProductSource): BlockOptionSource[] => (p.pricingOptions || []).filter((o) => o && o.isActive !== false);
const typeOf = (o: BlockOptionSource) => String(o.type || '').toUpperCase();

/** The saved day table of a product, or null (valid tables only) */
export function savedBlock(p: BlockProductSource): BlockDraft | null {
  const o = active(p).find((x) => typeOf(x) === 'BLOCK');
  if (!o || !Array.isArray(o.blockTiers)) return null;
  const table = { tiers: o.blockTiers as number[], startDay: o.blockStartDay, extraMode: o.blockExtraMode, extraPrice: o.blockExtraPrice };
  if (!isValidBlockTable(table)) return null;
  return {
    tiers: [...(o.blockTiers as number[])],
    startDay: o.blockStartDay ?? 1,
    extraMode: (o.blockExtraMode as BlockExtraMode) ?? 'EXTRA_PER_DAY',
    extraPrice: o.blockExtraPrice ?? null,
  };
}

/** The draft the card starts from: the saved mode, prices and table */
export function draftFromProduct(p: BlockProductSource): PricingDraft {
  const options = active(p);
  const priceOf = (type: string) => money(options.find((o) => typeOf(o) === type)?.price);
  const block = savedBlock(p);
  let perRental = priceOf('FIXED');
  let perDay = priceOf('DAILY');
  if (options.length === 0) {
    const rent = money(p.rentPrice);
    if (String(p.pricingType || '').toUpperCase() === 'DAILY') perDay = rent;
    else perRental = rent;
  }
  const preferred = options.find((o) => o.isDefault) || options[0];
  let mode: RentMode = 'FIXED';
  if (block && (!preferred || typeOf(preferred) === 'BLOCK')) mode = 'BLOCK';
  else if (typeOf(preferred ?? {}) === 'DAILY' || (!preferred && String(p.pricingType || '').toUpperCase() === 'DAILY')) mode = 'DAILY';
  return {
    mode,
    perRental,
    perDay,
    block: block ?? { tiers: [perDay ?? perRental], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: null },
  };
}

export const canAddDay = (b: BlockDraft): boolean => b.tiers.length < BLOCK_MAX_TIERS;

/** "+ Thêm ngày N+1": the new day starts at the last price (the owner edits it) */
export function addDay(b: BlockDraft): BlockDraft {
  if (!canAddDay(b)) return b;
  return { ...b, tiers: [...b.tiers, b.tiers[b.tiers.length - 1] ?? null] };
}

/** ✕ removes the last day only (days stay numbered 1..N); the first day stays */
export function removeLastDay(b: BlockDraft): BlockDraft {
  return b.tiers.length <= 1 ? b : { ...b, tiers: b.tiers.slice(0, -1) };
}

export function setTier(b: BlockDraft, index: number, price: number | null): BlockDraft {
  return { ...b, tiers: b.tiers.map((t, i) => (i === index ? price : t)) };
}

/** A table the calculator accepts, or null while a box is empty */
function toTable(b: BlockDraft) {
  if (b.tiers.some((t) => t == null)) return null;
  return { tiers: b.tiers as number[], startDay: b.startDay, extraMode: b.extraMode, extraPrice: b.extraMode === 'EXTRA_PER_DAY' ? b.extraPrice ?? 0 : null };
}

export interface Preview {
  days: number;
  total: number;
  /** price of the block that applies (the last block past the table) */
  basePrice: number;
  /** days charged on top of the last block */
  extraDays: number;
  /** days the block covers (the days asked, or the last block day) */
  blockDays: number;
  /** price of one extra day */
  extraPrice: number;
}

/** "Xem thử N ngày": the price and the pieces of the formula, null while the table is incomplete */
export function previewFor(b: BlockDraft, days: number, minorUnit = 1): Preview | null {
  const table = toTable(b);
  if (!table || !isValidBlockTable(table)) return null;
  const d = calculateBlockRentDetail(table.tiers, table.startDay, table.extraMode, table.extraPrice, days, minorUnit);
  return {
    days: d.days,
    total: d.total,
    basePrice: d.basePrice,
    extraDays: d.extraDays,
    blockDays: Math.max(1, d.days - d.extraDays),
    extraPrice: table.extraPrice ?? 0,
  };
}

/** "Giữ nguyên giá khối cuối: thuê 5 ngày vẫn tính 120.000đ" */
export const holdLastExample = (b: BlockDraft): { days: number; price: number } | null => {
  const last = b.tiers[b.tiers.length - 1];
  if (last == null) return null;
  return { days: b.startDay + b.tiers.length + 1, price: last };
};
