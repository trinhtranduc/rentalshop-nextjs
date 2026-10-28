/**
 * #1189 day-block pricing on the order routes (POST /api/orders, PUT /api/orders/[orderId]).
 *
 * A line is a BLOCK line when its product has an active BLOCK option the line points at. Installed apps cannot
 * tell: they send FIXED, no option id and a price of 0 (iOS) or the day-1 price (Android) (e2e-old-app-baseline.md
 * rows 12-13). So for a line that is not explicitly DAILY and does not point at a FIXED/DAILY option, the BLOCK
 * option wins when it is the product's default option.
 *
 * Client WITHOUT the `block-pricing` capability (every installed app): the server prices the line from the table
 * and the Vietnam civil days of pickup..return (`oldApps: 'recompute'`, default) or refuses the new line
 * (`oldApps: 'block'`, 400 PRICING_TYPE_REQUIRES_UPDATE). Client WITH the capability: its price is checked against
 * the same function (400 BLOCK_PRICE_MISMATCH) unless it marks the line `priceOverridden`.
 * An existing order keeps the table stored in `pricingSnapshot` (editing the product later changes nothing).
 */
import {
  calculateBlockRentDetail,
  countRentalDays,
  currencyMinorUnit,
  isValidBlockTable,
  roundToMinorUnit,
  type BlockPricingTable,
} from '@rentalshop/utils';

import { readOldAppsMode, type OldAppsMode } from './block-pricing-settings';
export type { OldAppsMode };

export interface BlockOptionLike {
  id?: number | null;
  type?: string | null;
  price?: number | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  blockTiers?: unknown;
  blockStartDay?: number | null;
  blockExtraMode?: string | null;
  blockExtraPrice?: number | null;
}

export interface BlockSnapshot {
  version: 1;
  type: 'BLOCK';
  optionId: number | null;
  tiers: number[];
  startDay: number;
  extraMode: string;
  extraPrice: number | null;
  currency: string;
  days: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  basePrice: number;
  extraDays: number;
  extraAmount: number;
  /** true = the staff typed the price by hand (a client that knows BLOCK); the table is kept for reference */
  overridden?: boolean;
}

export { readOldAppsMode };

export function tableOf(option: BlockOptionLike | null | undefined): BlockPricingTable | null {
  if (!option || option.type !== 'BLOCK' || !Array.isArray(option.blockTiers)) return null;
  const table: BlockPricingTable = {
    tiers: option.blockTiers as number[],
    startDay: option.blockStartDay,
    extraMode: option.blockExtraMode,
    extraPrice: option.blockExtraPrice,
  };
  return isValidBlockTable(table) ? table : null;
}

/** The table of a stored line snapshot, when it is still a usable one */
export function tableOfSnapshot(snapshot: unknown): BlockPricingTable | null {
  const s = snapshot as Partial<BlockSnapshot> | null | undefined;
  if (!s || s.type !== 'BLOCK' || !Array.isArray(s.tiers)) return null;
  const table: BlockPricingTable = { tiers: s.tiers, startDay: s.startDay, extraMode: s.extraMode, extraPrice: s.extraPrice };
  return isValidBlockTable(table) ? table : null;
}

/** The BLOCK option a request line means, or null when it is not a BLOCK line (see file header) */
export function findBlockOption(
  product: { pricingOptions?: BlockOptionLike[] | null } | null | undefined,
  line: { pricingOptionId?: number | null; pricingType?: string | null }
): BlockOptionLike | null {
  const options = (product?.pricingOptions ?? []).filter((o) => o && o.isActive !== false);
  const blocks = options.filter((o) => tableOf(o));
  if (blocks.length === 0) return null;
  const chosen = line.pricingOptionId != null ? options.find((o) => o.id === line.pricingOptionId) : undefined;
  if (chosen) return chosen.type === 'BLOCK' && tableOf(chosen) ? chosen : null;
  const type = (line.pricingType || '').toUpperCase();
  if (type === 'BLOCK') return blocks[0];
  if (type === 'DAILY' || type === 'HOURLY') return null;
  const preferred = options.find((o) => o.isDefault) || options[0];
  return preferred && preferred.type === 'BLOCK' && tableOf(preferred) ? preferred : null;
}

/** Days of the rental: Vietnam (shop) civil days, both ends counted; without both dates the line's own days, else 1 */
export function rentalDaysFor(
  pickup: string | Date | null | undefined,
  returnDate: string | Date | null | undefined,
  timeZone: string | undefined,
  fallback?: number | null
): number {
  if (pickup && returnDate) return countRentalDays(pickup, returnDate, timeZone);
  return fallback && fallback >= 1 ? Math.floor(fallback) : 1;
}

/** Price of one line from a table; the line total is the unit price × quantity */
export function priceBlockLine(args: {
  table: BlockPricingTable;
  optionId: number | null;
  days: number;
  quantity: number;
  currency?: string | null;
}): { unitPrice: number; totalPrice: number; rentalDays: number; snapshot: BlockSnapshot } {
  const unit = currencyMinorUnit(args.currency);
  const detail = calculateBlockRentDetail(
    args.table.tiers, args.table.startDay, args.table.extraMode, args.table.extraPrice, args.days, unit
  );
  const quantity = Math.max(1, args.quantity || 1);
  const totalPrice = roundToMinorUnit(detail.total * quantity, unit);
  return {
    unitPrice: detail.total,
    totalPrice,
    rentalDays: detail.days,
    snapshot: {
      version: 1,
      type: 'BLOCK',
      optionId: args.optionId,
      tiers: args.table.tiers,
      startDay: args.table.startDay ?? 1,
      extraMode: (args.table.extraMode as string) ?? 'EXTRA_PER_DAY',
      extraPrice: args.table.extraPrice ?? null,
      currency: (args.currency || 'USD').toUpperCase(),
      days: detail.days,
      quantity,
      unitPrice: detail.total,
      totalPrice,
      basePrice: detail.basePrice,
      extraDays: detail.extraDays,
      extraAmount: detail.extraAmount,
    },
  };
}

/** Is the price a client sent for a line the one the server computes (within half a minor unit)? */
export function sameLinePrice(sent: number | null | undefined, computed: number, currency?: string | null): boolean {
  if (sent == null || !Number.isFinite(sent)) return false;
  return Math.abs(sent - computed) <= currencyMinorUnit(currency) / 2 + 1e-9;
}

/**
 * Order total after the lines were repriced: Σ lines − discount, never below 0. A percentage discount is a
 * percentage of the NEW lines (the app computed it from its own day-1 lines); an amount discount is kept, up to the lines.
 */
export function totalAfterReprice(args: {
  lineTotals: number[];
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  currency?: string | null;
}): { subtotal: number; discountAmount: number; totalAmount: number } {
  const unit = currencyMinorUnit(args.currency);
  const subtotal = roundToMinorUnit(args.lineTotals.reduce((s, t) => s + (Number(t) || 0), 0), unit);
  const isPct = args.discountType === 'percentage' || args.discountType === 'percent';
  const value = Math.max(0, Number(args.discountValue) || 0);
  let discountAmount: number;
  if (isPct) discountAmount = roundToMinorUnit((subtotal * Math.min(100, value)) / 100, unit);
  else discountAmount = Math.min(subtotal, Math.max(0, Number(args.discountAmount ?? args.discountValue) || 0));
  return { subtotal, discountAmount, totalAmount: Math.max(0, roundToMinorUnit(subtotal - discountAmount, unit)) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- order lines are loose request/DB rows
type EditItem = Record<string, any>;

export interface RepriceEditArgs {
  /** Lines stored on the order (with `pricingSnapshot`) */
  existingItems: EditItem[];
  /** Lines of the PUT body, already merged with the stored pricing fields; undefined = lines not sent */
  bodyItems?: EditItem[] | null;
  /** Effective pickup / return (body, else stored) */
  pickup: string | Date | null | undefined;
  returnDate: string | Date | null | undefined;
  /** Did the body send pickup or return? */
  datesSent: boolean;
  /** Did the body send totalAmount or a discount field? */
  totalOrDiscountSent: boolean;
  timeZone?: string;
  currency?: string | null;
  clientKnowsBlock: boolean;
  loadProduct: (productId: number) => Promise<{ pricingOptions?: BlockOptionLike[] | null } | null>;
  loadOldAppsMode: () => Promise<OldAppsMode>;
  discount: { type?: string | null; value?: number | null; amount?: number | null };
}

export interface RepriceEditResult {
  error?: 'PRICING_TYPE_REQUIRES_UPDATE' | 'BLOCK_PRICE_MISMATCH';
  /** Lines to write (replace-all) when the lines changed; undefined = write none */
  items?: EditItem[];
  totalAmount?: number;
  discountAmount?: number;
}

const lineTotal = (i: EditItem) => Number(i.totalPrice ?? (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0)) || 0;

/**
 * PUT /api/orders/[orderId] (#1189): reprice the day-block lines of a RENT order for a client that does not know
 * them, check them for one that does. An existing line keeps the table of its snapshot (changing the product later
 * does not change an order); a new line uses the product's current table.
 */
export async function repriceOrderEdit(a: RepriceEditArgs): Promise<RepriceEditResult> {
  const hasStoredBlock = a.existingItems.some((e) => e.pricingType === 'BLOCK' && tableOfSnapshot(e.pricingSnapshot));
  const sentLines = Array.isArray(a.bodyItems);
  if (!sentLines && !hasStoredBlock) return {};
  // Lines not in the body are the stored ones; they are rewritten only when the days change
  const rebuild = !sentLines && a.datesSent;
  const source: EditItem[] | null = sentLines
    ? (a.bodyItems as EditItem[])
    : a.existingItems.map((e) => ({
        productId: e.productId, quantity: e.quantity, unitPrice: e.unitPrice, totalPrice: e.totalPrice, deposit: e.deposit,
        notes: e.notes, rentalDays: e.rentalDays, pricingType: e.pricingType, pricingOptionId: e.pricingOptionId,
        pricingSnapshot: e.pricingSnapshot,
      }));

  const days = rentalDaysFor(a.pickup, a.returnDate, a.timeZone);
  let sawBlock = false;
  const used = new Set<number>();
  const out: EditItem[] = [];
  for (const item of source) {
    // The match by product is the one the route already uses for stored pricing fields
    const idx = a.existingItems.findIndex((e, i) => e.productId === item.productId && !used.has(i));
    const existing = idx >= 0 ? a.existingItems[idx] : undefined;
    if (idx >= 0) used.add(idx);
    const type = (item.pricingType || '').toUpperCase();
    let table = existing && existing.pricingType === 'BLOCK' && type !== 'DAILY' ? tableOfSnapshot(existing.pricingSnapshot) : null;
    let optionId: number | null = table ? existing?.pricingOptionId ?? null : null;
    const isNewLine = !table;
    if (!table) {
      const product = await a.loadProduct(item.productId);
      const option = findBlockOption(product, item);
      table = tableOf(option);
      optionId = option?.id ?? null;
    }
    if (!table) {
      // Not a BLOCK line: never keep a snapshot sent by the client
      out.push({ ...item, pricingSnapshot: undefined });
      continue;
    }
    sawBlock = true;
    if (!a.clientKnowsBlock && isNewLine && (await a.loadOldAppsMode()) === 'block') return { error: 'PRICING_TYPE_REQUIRES_UPDATE' };
    const quantity = item.quantity || 1;
    const priced = priceBlockLine({ table, optionId, days, quantity, currency: a.currency });
    if (a.clientKnowsBlock) {
      if (!item.priceOverridden && sentLines && !sameLinePrice(item.totalPrice, priced.totalPrice, a.currency)) return { error: 'BLOCK_PRICE_MISMATCH' };
      out.push({ ...item, rentalDays: priced.rentalDays, pricingType: 'BLOCK', pricingOptionId: optionId ?? item.pricingOptionId ?? null,
        pricingSnapshot: { ...priced.snapshot, ...(item.priceOverridden ? { overridden: true } : {}) } });
    } else {
      out.push({ ...item, unitPrice: priced.unitPrice, totalPrice: priced.totalPrice, rentalDays: priced.rentalDays, pricingType: 'BLOCK',
        pricingOptionId: optionId ?? item.pricingOptionId ?? null, pricingSnapshot: priced.snapshot });
    }
  }

  const result: RepriceEditResult = {};
  if (sentLines || (rebuild && sawBlock)) result.items = out;
  // A client that knows BLOCK sends its own total; an old one gets Σ lines − discount whenever it touched prices
  if (!a.clientKnowsBlock && sawBlock && (sentLines || a.datesSent || a.totalOrDiscountSent)) {
    const totals = totalAfterReprice({
      lineTotals: out.map(lineTotal),
      discountType: a.discount.type,
      discountValue: a.discount.value,
      discountAmount: a.discount.amount,
      currency: a.currency,
    });
    result.totalAmount = totals.totalAmount;
    result.discountAmount = totals.discountAmount;
  }
  return result;
}
