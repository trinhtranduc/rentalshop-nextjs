/**
 * Pricing options as stored (#460, #951, #1189). Pure, no Prisma import, so it is unit-tested on its own.
 * - keep only FIXED / DAILY with a price of 0 or more (#951: 0đ is a price; a missing or negative price is
 *   dropped), plus ONE BLOCK option (day-block table, #1189) when the caller passes `allowBlock`
 *   (a client that sent `pricingSchemaVersion: 2`); BLOCK from any other caller is dropped as before;
 * - a BLOCK option stores its table; its `price` is forced to the day-1 price (old apps read it as FIXED);
 * - exactly one isDefault (the first one when none or several are marked).
 * - #1621 hour blocks: HOURLY rows with `blockSize` 1–24 hours when the caller passes `allowHourly` (a client with the
 *   `hour-blocks` capability); never the default, stored after the other options, shortest first.
 */
/**
 * #1200: which existing options a "replace the option set" save deletes. A client that does not send
 * `pricingSchemaVersion` (installed apps) only knows FIXED / DAILY, so it must not wipe a BLOCK option it
 * cannot see: BLOCK rows survive unless the payload itself carries BLOCK rows.
 */
export function pricingOptionsDeleteWhere(
  productId: number,
  opts: { keepBlockOptions?: boolean; payloadHasBlock?: boolean; keepHourlyOptions?: boolean } = {}
): { productId: number; type?: { not: 'BLOCK' } | { notIn: Array<'BLOCK' | 'HOURLY'> } } {
  const keepBlock = !!opts.keepBlockOptions && !opts.payloadHasBlock;
  // #1621: a client without the `hour-blocks` capability (installed apps, an old web tab) cannot see hour blocks
  if (opts.keepHourlyOptions) return { productId, type: { notIn: keepBlock ? ['BLOCK', 'HOURLY'] : ['HOURLY'] } };
  return keepBlock ? { productId, type: { not: 'BLOCK' } } : { productId };
}

/**
 * #1215: an installed app shows a BLOCK option as a FIXED option at the day-1 price (#1189) and sends it back on save
 * as { type, price, isDefault } (no id). Saving for such a client (`keepBlockOptions`), on a product that stores a
 * BLOCK option:
 * - that echoed FIXED row (same price as day 1, and no real FIXED option is stored) is dropped, so it is not created
 *   next to the BLOCK row it came from;
 * - while the stored BLOCK option is the default it stays the only default: the payload rows are created
 *   non-default and `blockIsDefault` tells the caller not to take the product price from them.
 * A product without BLOCK, or a payload row that is not the echo (another price, a real FIXED stored), is untouched.
 */
export function withoutEchoedBlockShim<T extends { type: string; price: number; isDefault: boolean }>(
  normalized: T[],
  stored: Array<{ type: string; price: number; isDefault: boolean }>
): { options: T[]; blockIsDefault: boolean } {
  const block = stored.find((o) => o.type === 'BLOCK');
  if (!block) return { options: normalized, blockIsDefault: false };
  const hasRealFixed = stored.some((o) => o.type === 'FIXED');
  const kept = hasRealFixed ? normalized : normalized.filter((o) => !(o.type === 'FIXED' && o.price === block.price));
  return {
    options: block.isDefault ? kept.map((o) => (o.isDefault ? { ...o, isDefault: false } : o)) : kept,
    blockIsDefault: block.isDefault,
  };
}

export interface NormalizePricingOptions {
  /** Accept a BLOCK option (the caller sent `pricingSchemaVersion: 2`) */
  allowBlock?: boolean;
  /** #1621: accept HOURLY hour-block rows (the caller has the `hour-blocks` capability) */
  allowHourly?: boolean;
}

/** #1621 whole hours 1–24 of an HOURLY row, else null */
function blockHours(o: any): number | null {
  const n = Number(o?.blockSize);
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : null;
}

const validPrice = (o: any): boolean => {
  if (o?.price == null || o.price === '') return false;
  const price = Number(o.price);
  return Number.isFinite(price) && price >= 0;
};

const BLOCK_MODES = ['EXTRA_PER_DAY', 'HOLD_LAST'];

/** Defensive shape check; the API validates the same rules with zod (`isValidBlockTable` in @rentalshop/utils) */
function blockTable(o: any): { tiers: number[]; startDay: number | null; mode: string; extra: number | null } | null {
  const tiers = o?.blockTiers;
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > 31) return null;
  if (!tiers.every((t: unknown) => typeof t === 'number' && Number.isFinite(t) && t >= 0)) return null;
  const start = o.blockStartDay == null ? null : Number(o.blockStartDay);
  if (start != null && (!Number.isInteger(start) || start < 1 || start > 31)) return null;
  const mode = o.blockExtraMode == null ? 'EXTRA_PER_DAY' : String(o.blockExtraMode);
  if (!BLOCK_MODES.includes(mode)) return null;
  const extra = o.blockExtraPrice == null ? null : Number(o.blockExtraPrice);
  if (extra != null && (!Number.isFinite(extra) || extra < 0)) return null;
  return { tiers, startDay: start === 1 ? null : start, mode, extra };
}

export function normalizePricingOptions(options: any[] | undefined, opts: NormalizePricingOptions = {}): any[] {
  let blockSeen = false;
  const hoursSeen = new Set<number>();
  const allowed = (options || []).filter((o) => {
    if (!o) return false;
    if (o.type === 'BLOCK') {
      if (!opts.allowBlock || blockSeen || !blockTable(o)) return false;
      blockSeen = true;
      return true;
    }
    if (o.type === 'HOURLY') {
      // #1621: one row per number of hours; the API refuses a bad set first (hourBlocksIssue)
      const hours = blockHours(o);
      if (!opts.allowHourly || hours == null || hoursSeen.has(hours) || !validPrice(o)) return false;
      hoursSeen.add(hours);
      return true;
    }
    if (o.type !== 'FIXED' && o.type !== 'DAILY') return false;
    return validPrice(o);
  });
  // #1621: hour blocks never stand alone (a block is never the default price) and come last, shortest first
  const others = allowed.filter((o) => o.type !== 'HOURLY');
  if (others.length === 0) return [];
  const hourly = allowed.filter((o) => o.type === 'HOURLY').sort((a, b) => blockHours(a)! - blockHours(b)!);
  let defaultAssigned = false;
  const normalized = others.map((o, i) => {
    const isDefault = !!o.isDefault && !defaultAssigned;
    if (isDefault) defaultAssigned = true;
    const block = o.type === 'BLOCK' ? blockTable(o) : null;
    return {
      type: o.type,
      price: block ? block.tiers[0] : Number(o.price),
      unit: o.unit ?? null,
      blockSize: o.blockSize ?? null,
      ...(block
        ? {
            blockTiers: block.tiers,
            blockStartDay: block.startDay,
            blockExtraMode: block.mode,
            blockExtraPrice: block.extra,
          }
        : {}),
      isDefault,
      isActive: o.isActive ?? true,
      sortOrder: o.sortOrder ?? i,
    };
  });
  if (!defaultAssigned) normalized[0].isDefault = true;
  const after = Math.max(...normalized.map((o) => Number(o.sortOrder) || 0)) + 1;
  hourly.forEach((o, i) => {
    normalized.push({
      type: 'HOURLY',
      price: Number(o.price),
      unit: 'HOUR',
      blockSize: blockHours(o),
      isDefault: false,
      isActive: o.isActive ?? true,
      sortOrder: after + i,
    });
  });
  return normalized;
}
