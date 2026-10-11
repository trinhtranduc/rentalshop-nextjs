// ============================================================================
// BILLING MODULES — add-ons (quantity) and modules (feature) sold per shop (#782)
// ============================================================================
// One catalog (BillingModule, admin-defined, VND price each) and what a shop bought (MerchantModule).
// A purchase copies name / kind / limits from the catalog, so a later catalog edit never changes a paid period.
// Pure rules (quote, limits, renewal total) live in @rentalshop/utils `module-pricing`.

import { prisma } from './client';
import {
  ApiError,
  ErrorCode,
  addsBranches,
  calculateModuleQuote,
  moduleMonthlyTotal,
  readModuleLimits,
  sumModuleLimits,
} from '@rentalshop/utils';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE } from '@rentalshop/constants';

export type ModuleKind = 'quantity' | 'feature';

export interface CatalogInput {
  name: string;
  kind: ModuleKind;
  featureKey?: string | null;
  limits?: Record<string, number> | null;
  monthlyPrice: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AddModuleInput {
  merchantId: number;
  moduleId: number;
  quantity: number;
  method: string;
  transactionId?: string;
  reference?: string;
  description?: string;
  paymentDate?: Date;
}

const ZERO_LIMITS = { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 };

/** Plan allows more than one branch (limit above 1, or unlimited). */
function planAllowsBranches(planLimits: unknown): boolean {
  const outlets = Number((planLimits as { outlets?: unknown } | null)?.outlets);
  return outlets === -1 || outlets > 1;
}

// ---------------------------------------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------------------------------------

export async function listCatalog(includeInactive = true) {
  return prisma.billingModule.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export async function findCatalogItem(id: number) {
  return prisma.billingModule.findUnique({ where: { id } });
}

export async function createCatalogItem(input: CatalogInput) {
  return prisma.billingModule.create({
    data: {
      name: input.name,
      kind: input.kind,
      featureKey: input.kind === 'feature' ? input.featureKey ?? null : null,
      limits: input.kind === 'quantity' ? (input.limits ?? {}) : undefined,
      monthlyPrice: input.monthlyPrice,
      currency: 'VND',
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

/** Name, price, order and visibility. `kind`, `featureKey` and `limits` never change once an item exists. */
export async function updateCatalogItem(
  id: number,
  input: Partial<Pick<CatalogInput, 'name' | 'monthlyPrice' | 'isActive' | 'sortOrder'>>
) {
  return prisma.billingModule.update({ where: { id }, data: input });
}

// ---------------------------------------------------------------------------------------------------------
// What a shop has
// ---------------------------------------------------------------------------------------------------------

export async function listForMerchant(merchantId: number, includeEnded = true) {
  return prisma.merchantModule.findMany({
    where: includeEnded ? { merchantId } : { merchantId, isActive: true },
    orderBy: [{ isActive: 'desc' }, { id: 'asc' }],
  });
}

export async function findForMerchant(merchantId: number, id: number) {
  return prisma.merchantModule.findFirst({ where: { id, merchantId } });
}

/** Active add-ons only (features add no limits). */
async function activeRows(merchantId: number) {
  return prisma.merchantModule.findMany({ where: { merchantId, isActive: true }, orderBy: { id: 'asc' } });
}

/** Σ quantity × per-unit limits of the shop's active add-ons. Same shape the plan-limit checks always used. */
export async function calculateTotalLimits(merchantId: number) {
  const rows = await activeRows(merchantId);
  return rows.length ? sumModuleLimits(rows) : { ...ZERO_LIMITS };
}

/**
 * Add an item to a shop in the middle of its period (admin): validates, prices the remaining Vietnam days,
 * records the payment and the row in one transaction.
 */
export async function addToMerchant(input: AddModuleInput) {
  const [catalogItem, subscription] = await Promise.all([
    prisma.billingModule.findUnique({ where: { id: input.moduleId } }),
    prisma.subscription.findUnique({ where: { merchantId: input.merchantId }, include: { plan: true } }),
  ]);
  if (!catalogItem) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
  if (!catalogItem.isActive) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
  if (!subscription) throw new ApiError(ErrorCode.SUBSCRIPTION_NOT_FOUND);

  const isFeature = catalogItem.kind === 'feature';
  const quantity = isFeature ? 1 : Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) throw new ApiError(ErrorCode.INVALID_QUANTITY);

  if (isFeature) {
    const already = await prisma.merchantModule.findFirst({
      where: { merchantId: input.merchantId, moduleId: catalogItem.id, isActive: true },
    });
    if (already) throw new ApiError(ErrorCode.MODULE_ALREADY_ACTIVE);
  }
  if (addsBranches({ kind: catalogItem.kind, limits: catalogItem.limits }) && !planAllowsBranches(subscription.plan?.limits)) {
    throw new ApiError(ErrorCode.MODULE_NOT_AVAILABLE_FOR_PLAN);
  }

  const quote = calculateModuleQuote({
    unitPrice: catalogItem.monthlyPrice,
    quantity,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  });
  const amount = quote.amountDueRounded;
  const paid = input.method === PAYMENT_METHOD.STRIPE;

  return prisma.$transaction(async (tx) => {
    const row = await tx.merchantModule.create({
      data: {
        merchantId: input.merchantId,
        moduleId: catalogItem.id,
        name: catalogItem.name,
        kind: catalogItem.kind,
        featureKey: catalogItem.featureKey,
        limits: catalogItem.limits ?? undefined,
        quantity,
        unitPrice: catalogItem.monthlyPrice,
      },
    });
    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        merchantId: input.merchantId,
        amount,
        currency: catalogItem.currency || 'VND',
        method: input.method as any,
        type: PAYMENT_TYPE.PLAN_CHANGE as any,
        status: (paid ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.PENDING) as any,
        transactionId: input.transactionId,
        reference: input.reference || undefined,
        description: input.description || `${catalogItem.name} × ${quantity} (${quote.remainingDays}/${quote.periodDays} days)`,
        processedAt: paid ? new Date() : input.paymentDate ?? null,
        createdAt: input.paymentDate ?? new Date(),
      },
    });
    return { module: row, payment, quote };
  });
}

/** The amount for adding an item now, without writing anything. */
export async function quoteForMerchant(merchantId: number, moduleId: number, quantity: number) {
  const [catalogItem, subscription] = await Promise.all([
    prisma.billingModule.findUnique({ where: { id: moduleId } }),
    prisma.subscription.findUnique({ where: { merchantId } }),
  ]);
  if (!catalogItem) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
  if (!subscription) throw new ApiError(ErrorCode.SUBSCRIPTION_NOT_FOUND);
  const qty = catalogItem.kind === 'feature' ? 1 : Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1) throw new ApiError(ErrorCode.INVALID_QUANTITY);
  const quote = calculateModuleQuote({
    unitPrice: catalogItem.monthlyPrice,
    quantity: qty,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  });
  return { ...quote, currency: catalogItem.currency || 'VND', quantity: qty, unitPrice: catalogItem.monthlyPrice };
}

/** Mark (or unmark) an item to end at the next renewal. The usage check is made by the caller. */
export async function setRemoveAtPeriodEnd(merchantId: number, id: number, remove: boolean) {
  const row = await prisma.merchantModule.findFirst({ where: { id, merchantId } });
  if (!row) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
  if (!row.isActive) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
  return prisma.merchantModule.update({ where: { id }, data: { removeAtPeriodEnd: remove } });
}

/** What removing a row would take away from the limits (per entity). */
export function limitsOfRow(row: { kind: string; quantity: number; limits: unknown }) {
  if (row.kind !== 'quantity') return { ...ZERO_LIMITS };
  const per = readModuleLimits(row.limits);
  const qty = Math.max(0, row.quantity);
  return {
    outlets: per.outlets * qty,
    users: per.users * qty,
    products: per.products * qty,
    customers: per.customers * qty,
    orders: per.orders * qty,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Renewal
// ---------------------------------------------------------------------------------------------------------

/** Items a renewal charges, at the catalog price of today (a migrated old add-on keeps its own price, 0). */
export async function renewalItems(merchantId: number) {
  const rows = await activeRows(merchantId);
  const ids = rows.map((r) => r.moduleId).filter((v): v is number => v != null);
  const catalog = ids.length ? await prisma.billingModule.findMany({ where: { id: { in: ids } } }) : [];
  const price = new Map(catalog.map((c) => [c.id, c.monthlyPrice]));
  return rows
    .filter((r) => !r.removeAtPeriodEnd)
    .map((r) => ({ ...r, unitPrice: r.moduleId != null && price.has(r.moduleId) ? (price.get(r.moduleId) as number) : r.unitPrice }));
}

/** Monthly price the next renewal adds for the shop's items. */
export async function renewalMonthlyTotal(merchantId: number) {
  return moduleMonthlyTotal(await renewalItems(merchantId));
}

/** At renewal (inside its transaction): items marked for removal end, the others take today's catalog price. */
export async function applyRenewal(
  tx: { merchantModule: typeof prisma.merchantModule; billingModule: typeof prisma.billingModule },
  merchantId: number
) {
  const now = new Date();
  await tx.merchantModule.updateMany({
    where: { merchantId, isActive: true, removeAtPeriodEnd: true },
    data: { isActive: false, endedAt: now },
  });
  const rows = await tx.merchantModule.findMany({ where: { merchantId, isActive: true, moduleId: { not: null } } });
  for (const row of rows) {
    const item = await tx.billingModule.findUnique({ where: { id: row.moduleId as number } });
    if (item && item.monthlyPrice !== row.unitPrice) {
      await tx.merchantModule.update({ where: { id: row.id }, data: { unitPrice: item.monthlyPrice } });
    }
  }
}

/** True when the shop has an active add-on that adds branches. */
export async function hasBranchModules(merchantId: number) {
  const rows = await activeRows(merchantId);
  return addsBranches(rows.map((r) => ({ kind: r.kind, limits: r.limits })));
}

export const simplifiedBillingModules = {
  listCatalog,
  findCatalogItem,
  createCatalogItem,
  updateCatalogItem,
  listForMerchant,
  findForMerchant,
  calculateTotalLimits,
  addToMerchant,
  quoteForMerchant,
  setRemoveAtPeriodEnd,
  renewalItems,
  renewalMonthlyTotal,
  applyRenewal,
  hasBranchModules,
  limitsOfRow,
};
