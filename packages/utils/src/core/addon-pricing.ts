import { z } from 'zod';
import { MODULES } from '@rentalshop/constants';
import { civilDaysBetween } from './billing-dates';
import { storedBillingInterval } from './billing-interval';
import { calculateSubscriptionPrice } from './pricing-calculator';

/**
 * Priced add-ons (#850, owner decisions 2026-10-11; logic carried over from #782).
 *
 * A row of the price list (`AddonPrice`) adds one limit kind: `packSize` units per pack, `monthlyPrice` VND per pack
 * per month. A shop's item (`PlanLimitAddon`) stores `packSize × packs` in the column of its kind, so the limit check
 * keeps summing the five columns. Money is whole VND; days are Vietnam civil days.
 * #782: `packSize = 1` means "price of one unit": the number admin types goes in `packs` (+100 products = 100 packs).
 */

export const LIMIT_KINDS = ['outlets', 'users', 'products', 'customers', 'orders'] as const;
export type LimitKind = (typeof LIMIT_KINDS)[number];
export type AddonColumns = Record<LimitKind, number>;

/** #943: a feature add-on (on/off module, no packs) is a price-list row of this kind with a `featureKey`. */
export const FEATURE_KIND = 'feature' as const;
export const ADDON_KINDS = [...LIMIT_KINDS, FEATURE_KIND] as const;
export type AddonKind = (typeof ADDON_KINDS)[number];

/** #782: most packs on one item: +100,000 products on a `packSize = 1` row. */
export const MAX_ADDON_PACKS = 100_000;
/** The kind columns of `PlanLimitAddon` are 32-bit `Int`. */
const MAX_ADDON_UNITS = 2_147_483_647;

/** `packSize × packs` fits the kind column. Only a very large old pack size × a large number can overflow it. */
export function addonUnitsFit(packSize: number, packs: number): boolean {
  return Math.max(0, Math.floor(packSize)) * Math.max(0, Math.floor(packs)) <= MAX_ADDON_UNITS;
}

const emptyColumns = (): AddonColumns => ({ outlets: 0, users: 0, products: 0, customers: 0, orders: 0 });

/** The five limit columns of an item: `packSize × packs` in its kind, 0 elsewhere (all 0 for a feature, #943). */
export function addonColumnsFor(limitKind: LimitKind | AddonKind, packSize: number, packs: number): AddonColumns {
  const cols = emptyColumns();
  if (!(LIMIT_KINDS as readonly string[]).includes(limitKind)) return cols;
  cols[limitKind as LimitKind] = Math.max(0, Math.floor(packSize)) * Math.max(0, Math.floor(packs));
  return cols;
}

/** #943: a feature row / item (attendance…): kind `feature`, one per shop, packs fixed at 1. */
export function isFeatureAddon(item: { limitKind?: string | null; featureKey?: string | null } | null | undefined): boolean {
  return !!item && item.limitKind === FEATURE_KIND;
}

export interface AddonItemLike {
  id?: number;
  addonPriceId?: number | null;
  packs?: number | null;
  /** #870: fewer packs from the next renewal (NULL = no change). */
  nextPacks?: number | null;
  limitKind?: string | null;
  packSize?: number | null;
  unitPrice?: number | null;
  isActive?: boolean | null;
  removeAtPeriodEnd?: boolean | null;
  endsAt?: Date | string | null;
  outlets?: number | null;
  users?: number | null;
  products?: number | null;
  customers?: number | null;
  orders?: number | null;
}

/** Ended = switched off, or its end (set by a removal or a non-renewal) has passed. */
export function isAddonEnded(item: Pick<AddonItemLike, 'isActive' | 'endsAt'>, now: Date = new Date()): boolean {
  if (item.isActive === false) return true;
  if (!item.endsAt) return false;
  return new Date(item.endsAt).getTime() <= now.getTime();
}

/** Σ of the five columns over the items that have not ended. */
export function sumAddonLimits(items: AddonItemLike[], now: Date = new Date()): AddonColumns {
  const total = emptyColumns();
  for (const item of items) {
    if (!item || isAddonEnded(item, now)) continue;
    for (const key of LIMIT_KINDS) total[key] += Number(item[key]) || 0;
  }
  return total;
}

export interface AddonQuote {
  /** Vietnam civil days of the current subscription period (≥ 1). */
  periodDays: number;
  /** Vietnam civil days from today to the end of the period (0 when ended; not capped: an extended period counts all). */
  remainingDays: number;
  /** monthlyPrice × packs. */
  monthlyAmount: number;
  /** monthlyAmount for the subscription's cycle, with the cycle discount (same as renewal). */
  cyclePrice: number;
  /** Price per pack per month after the cycle discount (cycle price of one pack ÷ months of the cycle). */
  discountedMonthlyPrice: number;
  /** Whole VND charged now. */
  amountDue: number;
  /** `prorated`, or why nothing is charged now. */
  reason: 'prorated' | 'trial' | 'ended';
  currency: 'VND';
}

/**
 * Price of buying `packs` packs now (owner decision 2026-10-11, #870): monthly price per pack after the cycle discount
 * ÷ 30 × packs × Vietnam days left until the period end, whole VND. The length of the period does not matter, so an
 * extended or early-renewed period with ~60 days left charges ~2 months. Monthly: 40,000 ÷ 30 × 1 × 18 = 24,000.
 * A trial shop or an ended period pays 0 now; the item is charged from the next renewal.
 */
export function calculateAddonQuote(params: {
  monthlyPrice: number;
  packs: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  interval?: string | null;
  intervalCount?: number | null;
  status?: string | null;
  now?: Date;
}): AddonQuote {
  const now = params.now ?? new Date();
  const periodDays = Math.max(1, civilDaysBetween(new Date(params.periodStart), new Date(params.periodEnd)));
  const left = civilDaysBetween(now, new Date(params.periodEnd));
  const ended = new Date(params.periodEnd).getTime() <= now.getTime();
  const remainingDays = ended ? 0 : Math.max(0, left);
  const monthlyAmount = Math.max(0, Math.round(params.monthlyPrice)) * Math.max(0, Math.floor(params.packs));
  const cycle = storedBillingInterval(params.interval ?? 'month', params.intervalCount ?? 1);
  const cyclePrice = Math.round(calculateSubscriptionPrice({ basePrice: monthlyAmount } as any, cycle));
  const months = CYCLE_MONTHS[cycle] ?? 1;
  const discountedMonthlyPrice = calculateSubscriptionPrice({ basePrice: Math.max(0, Math.round(params.monthlyPrice)) } as any, cycle) / months;
  const packs = Math.max(0, Math.floor(params.packs));
  const trial = String(params.status || '').toUpperCase() === 'TRIAL';
  const reason: AddonQuote['reason'] = trial ? 'trial' : remainingDays === 0 ? 'ended' : 'prorated';
  const amountDue = reason === 'prorated' ? Math.round((discountedMonthlyPrice / 30) * packs * remainingDays) : 0;
  return { periodDays, remainingDays, monthlyAmount, cyclePrice, discountedMonthlyPrice, amountDue, reason, currency: 'VND' };
}

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 };

export interface AddonPriceLike {
  id: number;
  monthlyPrice: number;
  isActive: boolean;
  packSize?: number | null;
}

export interface AddonRenewalLine {
  id: number;
  /** Charged and kept for the next period. */
  renew: boolean;
  /** Price per pack per month for the next period (today's list price), or the item's own price when not renewed. */
  unitPrice: number;
  /** Packs for the next period: `nextPacks` when a reduction is pending, else the item's packs (#870). */
  packs: number;
  /** Units per pack for the next period: the row's current pack size when renewed, else the item's (#870). */
  packSize: number | null;
  limitKind: string | null;
  /** unitPrice × packs when renewed, else 0. */
  monthlyAmount: number;
  /** Captured price × current packs: what the current period was paid at (#870, plan-change credit). */
  paidMonthlyAmount: number;
}

/**
 * What a renewal does with each item that has not ended: renewed at today's list price and pack size when its row is on
 * sale and it is not marked for removal; an old free item (no row) keeps running at its own price (0). Marked items and
 * items of a paused row are not renewed (they end with the period they were paid for). A pending reduction
 * (`nextPacks`) applies to a renewed item. Shared by every path that starts or extends a paid period (#870): renew,
 * extend, change-plan.
 */
export function addonRenewalLines(
  items: AddonItemLike[],
  catalog: Record<number, AddonPriceLike> | Map<number, AddonPriceLike>,
  now: Date = new Date()
): { lines: AddonRenewalLine[]; monthlyTotal: number; paidMonthlyTotal: number } {
  const lookup = (id: number) => (catalog instanceof Map ? catalog.get(id) : catalog[id]);
  const lines: AddonRenewalLine[] = [];
  for (const item of items) {
    if (!item || isAddonEnded(item, now)) continue;
    const currentPacks = Math.max(0, Math.floor(Number(item.packs ?? 1) || 0));
    const own = Math.max(0, Math.round(Number(item.unitPrice) || 0));
    let renew = !item.removeAtPeriodEnd;
    let unitPrice = own;
    let packSize = item.packSize == null ? null : Number(item.packSize);
    if (item.addonPriceId != null) {
      const row = lookup(Number(item.addonPriceId));
      if (!row || !row.isActive) renew = false;
      else if (renew) {
        unitPrice = Math.max(0, Math.round(row.monthlyPrice));
        if (row.packSize != null && Number(row.packSize) >= 1) packSize = Number(row.packSize);
      }
    }
    const next = item.nextPacks != null && Number(item.nextPacks) >= 1 ? Math.floor(Number(item.nextPacks)) : null;
    const packs = renew && next != null ? next : currentPacks;
    lines.push({
      id: Number(item.id),
      renew,
      unitPrice,
      packs,
      packSize,
      limitKind: item.limitKind ?? null,
      monthlyAmount: renew ? unitPrice * packs : 0,
      paidMonthlyAmount: renew ? own * currentPacks : 0,
    });
  }
  return {
    lines,
    monthlyTotal: lines.reduce((sum, l) => sum + l.monthlyAmount, 0),
    paidMonthlyTotal: lines.reduce((sum, l) => sum + l.paidMonthlyAmount, 0),
  };
}

// ============================================================================
// Schemas
// ============================================================================

const vnd = z.coerce.number().int().min(0).max(1_000_000_000);
const MODULE_KEYS = MODULES.map((m) => m.key);

/**
 * A limit row: one of the five kinds + pack size. #943 a feature row: kind `feature` + a module `featureKey`;
 * its pack size is always 1 (whatever is sent).
 */
export const addonPriceCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    limitKind: z.enum(ADDON_KINDS),
    featureKey: z.string().trim().max(50).nullable().optional(),
    packSize: z.coerce.number().int().min(1).max(1_000_000).optional(),
    monthlyPrice: vnd,
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.limitKind === FEATURE_KIND) {
      if (!d.featureKey || !MODULE_KEYS.includes(d.featureKey)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['featureKey'], message: 'unknown featureKey' });
      }
    } else {
      if (d.featureKey) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['featureKey'], message: 'only for a feature row' });
      if (d.packSize === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packSize'], message: 'required' });
    }
  })
  .transform((d) =>
    d.limitKind === FEATURE_KIND
      ? { ...d, packSize: 1, featureKey: d.featureKey as string }
      : { ...d, packSize: d.packSize as number, featureKey: null }
  );

/** `limitKind` and `featureKey` are not editable: they are dropped from the body. */
export const addonPriceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    packSize: z.coerce.number().int().min(1).max(1_000_000).optional(),
    monthlyPrice: vnd.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .strip();

/** The price is never taken from the body: only the row and the number of packs. */
export const merchantAddonCreateSchema = z
  .object({
    addonPriceId: z.coerce.number().int().positive(),
    packs: z.coerce.number().int().min(1).max(MAX_ADDON_PACKS),
    /** #943: cash as in the mockup ("Tiền mặt"); recorded PENDING like a transfer */
    method: z.enum(['TRANSFER', 'STRIPE', 'CASH']).optional(),
    transactionId: z.string().trim().max(200).optional(),
    reference: z.string().trim().max(200).optional(),
  })
  .strip();

/** `removeAtPeriodEnd` (#850), or a new number of packs (#870: more now and charged, fewer from the next period). */
export const merchantAddonUpdateSchema = z
  .object({
    removeAtPeriodEnd: z.boolean().optional(),
    packs: z.coerce.number().int().min(1).max(MAX_ADDON_PACKS).optional(),
    method: z.enum(['TRANSFER', 'STRIPE']).optional(),
    transactionId: z.string().trim().max(200).optional(),
    reference: z.string().trim().max(200).optional(),
  })
  .strip()
  .refine((d) => d.removeAtPeriodEnd !== undefined || d.packs !== undefined, { message: 'removeAtPeriodEnd or packs' });

export const addonQuoteQuerySchema = z.object({
  addonPriceId: z.coerce.number().int().positive(),
  packs: z.coerce.number().int().min(1).max(MAX_ADDON_PACKS),
});

export type AddonPriceCreateInput = z.output<typeof addonPriceCreateSchema>;
export type AddonPriceUpdateInput = z.infer<typeof addonPriceUpdateSchema>;
export type MerchantAddonCreateInput = z.infer<typeof merchantAddonCreateSchema>;
