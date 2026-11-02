// ============================================================================
// ADD-ON PRICES (#850): the admin's price list and the priced add-ons of a shop.
// A shop's add-on is a PlanLimitAddon row: its kind's column holds packSize × packs, so the limit check
// (`planLimitAddons.calculateTotal`) keeps summing the five columns.
// ============================================================================

import { prisma } from './client';
import type { AddonPrice, Payment, PlanLimitAddon } from '@prisma/client';
import type { AddonPriceCreateInput, AddonPriceUpdateInput, AddonQuote, AddonRenewalLine, LimitKind } from '@rentalshop/utils';
import { addonColumnsFor, isFeatureAddon, LIMIT_KINDS } from '@rentalshop/utils';
import { MODULE_KEY } from '@rentalshop/constants';
import { provisionDefaultLoyaltyProgram } from './loyalty-provision';

const LIMIT_KIND_SET = new Set<string>(LIMIT_KINDS);

/** #782: "+100" on a `packSize = 1` row (the typed amount), "× 2" on an older row with a larger pack. */
const amountText = (packSize: number, packs: number) => (packSize === 1 ? `+${packs}` : `× ${packs}`);

/** Items that still count: switched on and not past their end. */
const notEnded = (now: Date) => ({ isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] });

async function shopsUsingByRow(now = new Date()): Promise<Map<number, number>> {
  const rows = await prisma.planLimitAddon.findMany({
    where: { addonPriceId: { not: null }, ...notEnded(now) },
    select: { addonPriceId: true, merchantId: true },
    distinct: ['addonPriceId', 'merchantId'],
  });
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.addonPriceId as number, (counts.get(r.addonPriceId as number) || 0) + 1);
  return counts;
}

export const simplifiedAddonPrices = {
  /** Every row of the price list with `shopsUsing` (shops with an item of that row that has not ended). */
  list: async () => {
    const [rows, counts] = await Promise.all([
      prisma.addonPrice.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      shopsUsingByRow(),
    ]);
    return rows.map((row) => ({ ...row, shopsUsing: counts.get(row.id) || 0 }));
  },

  findById: async (id: number) => prisma.addonPrice.findUnique({ where: { id } }),

  findManyByIds: async (ids: number[]) =>
    ids.length ? prisma.addonPrice.findMany({ where: { id: { in: ids } } }) : [],

  create: async (data: AddonPriceCreateInput) =>
    prisma.addonPrice.create({
      data: {
        name: data.name,
        limitKind: data.limitKind,
        // #943: a feature row carries its module key; a limit row has none
        featureKey: data.featureKey ?? null,
        packSize: data.packSize,
        monthlyPrice: data.monthlyPrice,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    }),

  update: async (id: number, data: AddonPriceUpdateInput) => prisma.addonPrice.update({ where: { id }, data }),

  /** Shops holding an item of this row that has not ended. */
  countShopsUsing: async (id: number) => {
    const rows = await prisma.planLimitAddon.findMany({
      where: { addonPriceId: id, ...notEnded(new Date()) },
      select: { merchantId: true },
      distinct: ['merchantId'],
    });
    return rows.length;
  },
};

export interface AddMerchantAddonInput {
  merchantId: number;
  subscriptionId: number | null;
  addonPrice: { id: number; name: string; limitKind: string; packSize: number; monthlyPrice: number; featureKey?: string | null };
  packs: number;
  quote: AddonQuote;
  method?: 'TRANSFER' | 'STRIPE' | 'CASH';
  transactionId?: string;
  reference?: string;
  createdBy?: string;
}

export const simplifiedMerchantAddons = {
  /** The shop's add-ons that still count, oldest first. */
  listForMerchant: async (merchantId: number, now = new Date()) =>
    prisma.planLimitAddon.findMany({
      where: { merchantId, ...notEnded(now) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),

  findById: async (id: number) => prisma.planLimitAddon.findUnique({ where: { id } }),

  /** #943: the shop's un-ended item of a feature (one per shop), or null. */
  findActiveFeature: async (merchantId: number, featureKey: string, now = new Date()) =>
    prisma.planLimitAddon.findFirst({ where: { merchantId, featureKey, ...notEnded(now) } }),

  /**
   * Buy `packs` packs of a price-list row: one PlanLimitAddon with the price captured now, and a payment when
   * something is charged now (type PLAN_CHANGE, as an in-period change; method / status as in renew).
   */
  add: async (input: AddMerchantAddonInput) => {
    const { addonPrice, packs, quote } = input;
    // #943: a feature (attendance…) has no limit columns and no packs; it carries its module key
    const feature = isFeatureAddon(addonPrice);
    const featureKey = feature ? addonPrice.featureKey ?? null : null;
    const columns = addonColumnsFor(addonPrice.limitKind as LimitKind, addonPrice.packSize, packs);
    const method = input.method || 'TRANSFER';
    return prisma.$transaction(async (tx) => {
      const addon = await tx.planLimitAddon.create({
        data: {
          merchantId: input.merchantId,
          ...columns,
          notes: feature ? addonPrice.name : `${addonPrice.name} ${amountText(addonPrice.packSize, packs)}`,
          isActive: true,
          addonPriceId: addonPrice.id,
          name: addonPrice.name,
          limitKind: addonPrice.limitKind,
          packSize: feature ? 1 : addonPrice.packSize,
          packs: feature ? 1 : packs,
          unitPrice: addonPrice.monthlyPrice,
          featureKey,
        },
      });
      // #943: the add-on replaces a legacy #907 switch of the same module (row kept, switched off), so turning the
      // add-on off later really ends the module
      if (featureKey) {
        await tx.merchantModule.updateMany({ where: { merchantId: input.merchantId, key: featureKey, enabled: true }, data: { enabled: false } });
      }
      // #782: buying loyalty runs the program at once: earning stops while `isActive` is false, and admin has no second switch to find
      if (featureKey === MODULE_KEY.LOYALTY) {
        await provisionDefaultLoyaltyProgram(tx as any, input.merchantId);
        await tx.loyaltyProgram.update({ where: { merchantId: input.merchantId }, data: { isActive: true } });
      }
      let payment: Payment | null = null;
      if (quote.amountDue > 0) {
        payment = await tx.payment.create({
          data: {
            merchantId: input.merchantId,
            subscriptionId: input.subscriptionId ?? undefined,
            amount: quote.amountDue,
            currency: 'VND',
            method: method as any,
            type: 'PLAN_CHANGE' as any,
            status: (method === 'STRIPE' ? 'COMPLETED' : 'PENDING') as any,
            transactionId: input.transactionId || undefined,
            reference: input.reference || undefined,
            description: feature
              ? `Add-on: ${addonPrice.name} (tính năng), còn ${quote.remainingDays} ngày`
              : `Add-on: ${addonPrice.name} ${amountText(addonPrice.packSize, packs)}${addonPrice.packSize === 1 ? ` ${addonPrice.limitKind}` : ` (+${packs * addonPrice.packSize} ${addonPrice.limitKind})`}, còn ${quote.remainingDays} ngày`,
            metadata: JSON.stringify({ addonId: addon.id, addonPriceId: addonPrice.id, packs: feature ? 1 : packs, unitPrice: addonPrice.monthlyPrice, ...(featureKey ? { featureKey } : {}), ...quote }),
            processedAt: method === 'STRIPE' ? new Date() : null,
            processedBy: input.createdBy,
          },
        });
      }
      return { addon, payment };
    });
  },

  /**
   * #870: more packs of an item, at once: the kind column grows by the item's pack size × extra packs, a pending
   * reduction is dropped, and the extra packs are charged now (same payment as a purchase) when the quote is > 0.
   */
  addPacks: async (input: {
    itemId: number;
    merchantId: number;
    subscriptionId: number | null;
    name: string;
    packs: number;
    extraPacks: number;
    columns: Record<LimitKind, number>;
    addonPriceId: number;
    unitPrice: number;
    quote: AddonQuote;
    method?: 'TRANSFER' | 'STRIPE';
    transactionId?: string;
    reference?: string;
    createdBy?: string;
  }) => {
    const method = input.method || 'TRANSFER';
    return prisma.$transaction(async (tx) => {
      const addon = await tx.planLimitAddon.update({
        where: { id: input.itemId },
        data: { packs: input.packs, nextPacks: null, ...input.columns },
      });
      let payment: Payment | null = null;
      if (input.quote.amountDue > 0) {
        payment = await tx.payment.create({
          data: {
            merchantId: input.merchantId,
            subscriptionId: input.subscriptionId ?? undefined,
            amount: input.quote.amountDue,
            currency: 'VND',
            method: method as any,
            type: 'PLAN_CHANGE' as any,
            status: (method === 'STRIPE' ? 'COMPLETED' : 'PENDING') as any,
            transactionId: input.transactionId || undefined,
            reference: input.reference || undefined,
            description: `Add-on: ${input.name} +${input.extraPacks} gói (${input.packs} gói), còn ${input.quote.remainingDays} ngày`,
            metadata: JSON.stringify({ addonId: input.itemId, addonPriceId: input.addonPriceId, packs: input.packs, extraPacks: input.extraPacks, unitPrice: input.unitPrice, ...input.quote }),
            processedAt: method === 'STRIPE' ? new Date() : null,
            processedBy: input.createdBy,
          },
        });
      }
      return { addon, payment };
    });
  },

  /** #870: fewer packs from the next renewal (`null` cancels a pending reduction). Nothing changes now. */
  setNextPacks: async (id: number, nextPacks: number | null) =>
    prisma.planLimitAddon.update({ where: { id }, data: { nextPacks } }),

  /** Mark (endsAt = the period end) or unmark (endsAt null) an item for removal at the end of the period. */
  setRemoveAtPeriodEnd: async (id: number, removeAtPeriodEnd: boolean, endsAt: Date | null) =>
    prisma.planLimitAddon.update({ where: { id }, data: { removeAtPeriodEnd, endsAt } }),

  /** Items a renewal looks at and the price-list rows they come from. */
  renewalItems: async (merchantId: number, now = new Date()) => {
    const items: PlanLimitAddon[] = await prisma.planLimitAddon.findMany({
      where: { merchantId, ...notEnded(now) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const ids = Array.from(new Set(items.map((i) => i.addonPriceId).filter((v): v is number => v != null)));
    const rows: AddonPrice[] = ids.length ? await prisma.addonPrice.findMany({ where: { id: { in: ids } } }) : [];
    const catalog = new Map<number, AddonPrice>(rows.map((r) => [r.id, r] as [number, AddonPrice]));
    return { items, catalog };
  },

  /**
   * Inside the transaction of a renewal, an extension or a plan change (#870): renewed items take today's list price
   * and pack size, and a pending reduction (their kind column = packSize × packs); the others end at the old period
   * end (still counting until then).
   */
  applyRenewal: async (tx: any, lines: AddonRenewalLine[], oldPeriodEnd: Date | null, now = new Date()) => {
    for (const line of lines) {
      if (line.renew) {
        const kind = line.limitKind as LimitKind | null;
        const sized = kind && line.packSize != null && (LIMIT_KIND_SET as Set<string>).has(kind);
        await tx.planLimitAddon.update({
          where: { id: line.id },
          data: {
            unitPrice: line.unitPrice,
            ...(sized ? { packSize: line.packSize, packs: line.packs, nextPacks: null, ...addonColumnsFor(kind as LimitKind, line.packSize as number, line.packs) } : {}),
          },
        });
        continue;
      }
      const item = await tx.planLimitAddon.findUnique({ where: { id: line.id }, select: { endsAt: true } });
      const endsAt = item?.endsAt ?? oldPeriodEnd ?? now;
      await tx.planLimitAddon.update({
        where: { id: line.id },
        data: {
          removeAtPeriodEnd: true,
          endsAt,
          endedAt: endsAt,
          ...(new Date(endsAt).getTime() <= now.getTime() ? { isActive: false } : {}),
        },
      });
    }
  },
};
