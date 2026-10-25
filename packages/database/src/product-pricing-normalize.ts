/**
 * Pricing options as stored (#460, #951, #1189). Pure, no Prisma import, so it is unit-tested on its own.
 * - keep only FIXED / DAILY with a price of 0 or more (#951: 0đ is a price; a missing or negative price is
 *   dropped), plus ONE BLOCK option (day-block table, #1189) when the caller passes `allowBlock`
 *   (a client that sent `pricingSchemaVersion: 2`); BLOCK from any other caller is dropped as before;
 * - a BLOCK option stores its table; its `price` is forced to the day-1 price (old apps read it as FIXED);
 * - exactly one isDefault (the first one when none or several are marked).
 */
export interface NormalizePricingOptions {
  /** Accept a BLOCK option (the caller sent `pricingSchemaVersion: 2`) */
  allowBlock?: boolean;
}

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
  const allowed = (options || []).filter((o) => {
    if (!o) return false;
    if (o.type === 'BLOCK') {
      if (!opts.allowBlock || blockSeen || !blockTable(o)) return false;
      blockSeen = true;
      return true;
    }
    if (o.type !== 'FIXED' && o.type !== 'DAILY') return false;
    if (o.price == null || o.price === '') return false;
    const price = Number(o.price);
    return Number.isFinite(price) && price >= 0;
  });
  if (allowed.length === 0) return [];
  let defaultAssigned = false;
  const normalized = allowed.map((o, i) => {
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
  return normalized;
}
