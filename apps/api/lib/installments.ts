/**
 * Staged deposits on the server (#1199): shop settings, the stages in an API response, `depositAmount` upkeep,
 * the delivery check and the row lock used by collect / void.
 *
 * Money logic is `effectivePlan` (packages/utils/src/core/deposit-plan.ts); nothing here branches on the shop mode
 * except `planForNewOrder`, which only decides whether a NEW order gets a plan.
 *
 * Relative import (like shop-timezone.ts) because route tests mock `@rentalshop/utils`.
 */
import {
  applyTemplate,
  effectivePlan,
  installmentSummary,
  parseDepositPlan,
  pickTemplate,
  readPaymentSettings,
  unpaidExplicitStages,
  INSTALLMENT_PAYMENT_NOTE,
  type DepositPlan,
  type PaymentSettings,
  type PlanOrderLike,
  type PlanShop,
  type ResolvedInstallment,
} from '../../../packages/utils/src/core/deposit-plan';
import { hasCapability } from './client-capabilities';
import { DEFAULT_SHOP_TIMEZONE, resolveShopTimeZone } from '../../../packages/utils/src/core/timezone';

export const CANCEL_REFUND_NOTE = 'CANCEL_REFUND';

/** Staff-like roles may collect only in cash / transfer and only on the day they collect. */
export const STAFF_COLLECT_METHODS = ['CASH', 'TRANSFER'];

export interface ShopContext extends PlanShop {
  currency: string;
  timezone: string;
  payment: PaymentSettings;
}

type MerchantRow = { currency?: string | null; timezone?: string | null; settings?: unknown } | null | undefined;

export function shopFromMerchant(row: MerchantRow): ShopContext {
  return {
    currency: row?.currency || 'VND',
    timezone: resolveShopTimeZone(row?.timezone ?? DEFAULT_SHOP_TIMEZONE),
    payment: readPaymentSettings(row?.settings),
  };
}

export async function loadShop(client: any, merchantId: number | null | undefined): Promise<ShopContext> {
  if (merchantId == null) return shopFromMerchant(null);
  const row = await client.merchant.findUnique({
    where: { id: merchantId },
    select: { currency: true, timezone: true, settings: true },
  });
  return shopFromMerchant(row);
}

/** `Merchant.settings` with `payment` replaced; every other key (blockPricing, ...) is kept. */
export function mergePaymentSettings(settings: unknown, payment: PaymentSettings): Record<string, unknown> {
  const base = settings && typeof settings === 'object' && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  return { ...base, payment };
}

/**
 * The plan a NEW rent order gets, or null (the order is created exactly as before).
 * Mode ONE_TIME, a SALE, and clients that did not declare `installments` never get a plan.
 */
export function planForNewOrder(args: {
  shop: ShopContext;
  orderType: string;
  capable: boolean;
  canEditItems: boolean;
  input?: { templateId?: string | null; items?: Array<Record<string, any>> } | null;
}): DepositPlan | null {
  const { shop, orderType, capable, canEditItems, input } = args;
  if (!capable || orderType !== 'RENT' || shop.payment.depositMode !== 'STAGED') return null;
  const policy = shop.payment.cancellationPolicy || null;
  if (canEditItems && input?.items && input.items.length > 0) {
    return applyTemplate(input.items as any, policy);
  }
  const template = pickTemplate(shop.payment, input?.templateId);
  return applyTemplate(template.items, policy);
}

export function resolveStages(order: PlanOrderLike, shop: PlanShop, now?: Date): ResolvedInstallment[] {
  return effectivePlan(order, shop, now ? { now } : {});
}

/** Additive response fields for a client that declared `installments`. */
export function installmentsView(order: PlanOrderLike & { cancelKeptAmount?: number | null; cancelledAt?: Date | string | null }, shop: PlanShop, now?: Date) {
  const plan = parseDepositPlan(order.depositPlan);
  const stages = order.orderType === 'SALE' ? [] : resolveStages(order, shop, now);
  return {
    installments: stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      percent: stage.percent,
      amount: stage.amount,
      plannedAmount: stage.plannedAmount,
      remaining: stage.remaining,
      dueDateKey: stage.dueDateKey,
      status: stage.status,
      collectedAt: stage.collectedAt,
      paidAmount: stage.paidAmount,
    })),
    installmentSummary: installmentSummary(stages, order.totalAmount || 0),
    depositPlanPolicy: plan?.policy ?? null,
    hasDepositPlan: plan != null,
    cancelKeptAmount: order.cancelKeptAmount ?? null,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// depositAmount = money collected before hand-over
// ---------------------------------------------------------------------------

export interface DepositPaymentRow {
  amount?: number | null;
  status?: string | null;
  notes?: string | null;
  processedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

/**
 * For a plan order: sum of COMPLETED `INSTALLMENT` rows taken before hand-over (or all, while not handed over)
 * minus `CANCEL_REFUND` rows. The same quantity old apps read as "Cọc", updated by the server.
 */
export function computeDepositFromPayments(rows: DepositPaymentRow[], pickedUpAt?: Date | string | null): number {
  const cut = pickedUpAt ? new Date(pickedUpAt).getTime() : null;
  let total = 0;
  for (const row of rows) {
    const amount = row.amount || 0;
    if (row.status === 'COMPLETED' && row.notes === INSTALLMENT_PAYMENT_NOTE) {
      const at = new Date((row.processedAt ?? row.createdAt) as any).getTime();
      if (cut == null || Number.isNaN(at) || at <= cut) total += amount;
    } else if (row.status === 'REFUNDED' && row.notes === CANCEL_REFUND_NOTE) {
      total -= amount;
    }
  }
  return Math.max(0, Math.round(total * 10000) / 10000);
}

/**
 * Writes `Order.depositAmount` from the payments of a plan order. Orders without a plan are left alone
 * (their deposit is what the client sent). Call it inside the transaction that changed payments or `pickedUpAt`.
 * Returns the new value, or null when the order has no plan.
 */
export async function recomputeDepositFromPayments(client: any, orderId: number): Promise<number | null> {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { depositPlan: true, pickedUpAt: true, depositAmount: true },
  });
  if (!order || order.depositPlan == null) return null;
  const rows = await client.payment.findMany({
    where: {
      orderId,
      OR: [
        { status: 'COMPLETED', notes: INSTALLMENT_PAYMENT_NOTE },
        { status: 'REFUNDED', notes: CANCEL_REFUND_NOTE },
      ],
    },
    select: { amount: true, status: true, notes: true, processedAt: true, createdAt: true },
  });
  const value = computeDepositFromPayments(rows, order.pickedUpAt);
  if (value !== order.depositAmount) {
    await client.order.update({ where: { id: orderId }, data: { depositAmount: value } });
  }
  return value;
}

/** Row lock on the order for the rest of the transaction: two collects of one stage run one after the other. */
export async function lockOrderRow(tx: any, orderId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

// ---------------------------------------------------------------------------
// delivery
// ---------------------------------------------------------------------------

export const INSTALLMENT_UNPAID_MESSAGE =
  'Đơn còn giai đoạn cọc chưa thu. Vui lòng thu trên web hoặc cập nhật ứng dụng.';

/**
 * Response body when an order cannot be handed over because a deposit stage is unpaid.
 * `error` is empty on purpose: the installed Android app shows `error` before `message`.
 */
export function unpaidAtPickupBody(stages: ResolvedInstallment[]) {
  return {
    success: false,
    code: 'INSTALLMENT_UNPAID_AT_PICKUP',
    message: INSTALLMENT_UNPAID_MESSAGE,
    error: '',
    data: { unpaid: stages.map((stage) => ({ key: stage.key, label: stage.label, amount: stage.amount, dueDateKey: stage.dueDateKey })) },
  };
}

/**
 * Null when the order can be handed over; else the unpaid explicit stages. Only plan orders can have any:
 * the automatic `rest` stage is collected at hand-over and never blocks.
 */
export function unpaidStagesBlockingPickup(order: PlanOrderLike, shop: PlanShop): ResolvedInstallment[] | null {
  if (parseDepositPlan(order.depositPlan) == null || order.orderType === 'SALE') return null;
  const unpaid = unpaidExplicitStages(effectivePlan(order, shop));
  return unpaid.length > 0 ? unpaid : null;
}

/**
 * `{ depositMode }` for a merchant payload (additive). Emitted only when the row was read with `settings`:
 * a row that never loaded the column must not claim ONE_TIME for a shop that is STAGED (#1138).
 */
export function merchantDepositField(row: unknown): { depositMode?: 'ONE_TIME' | 'STAGED' } {
  if (!row || typeof row !== 'object' || !('settings' in row)) return {};
  return { depositMode: readPaymentSettings((row as { settings?: unknown }).settings).depositMode };
}

const PLAN_ONLY_KEYS = ['depositPlan', 'cancelKeptAmount', 'cancelledAt'] as const;

/**
 * An order row shaped for this caller. A client without the `installments` capability gets the response it gets
 * today (the three plan columns are dropped); a capable one gets `installments[]`, `installmentSummary`,
 * `depositPlanPolicy`, `hasDepositPlan`, `cancelKeptAmount`, `cancelledAt`.
 */
export async function shapeOrderInstallments<T extends Record<string, any>>(
  order: T,
  request: { headers?: { get(name: string): string | null } | null } | null | undefined,
  merchantId: number | null | undefined,
  client: any
): Promise<T> {
  if (!order) return order;
  if (!hasCapability(request, 'installments')) {
    const shaped: Record<string, any> = { ...order };
    for (const key of PLAN_ONLY_KEYS) delete shaped[key];
    return shaped as T;
  }
  let owner = merchantId ?? (order as any).outlet?.merchantId ?? null;
  if (owner == null && (order as any).outletId != null) {
    const outlet = await client.outlet.findUnique({ where: { id: (order as any).outletId }, select: { merchantId: true } });
    owner = outlet?.merchantId ?? null;
  }
  const shop = await loadShop(client, owner);
  const { depositPlan: _plan, ...rest } = order as Record<string, any>;
  return { ...rest, ...installmentsView(order as any, shop) } as unknown as T;
}

// ---------------------------------------------------------------------------
// shared by the installment routes
// ---------------------------------------------------------------------------

/** Thrown inside a transaction; the route turns it into the JSON error. */
export class InstallmentError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export type ScopedOrder = { order: any; merchantId: number };

/**
 * The order when the caller may work on it: ADMIN any; others their merchant; outlet roles their outlet.
 * Otherwise `{ status, code }` (404 unknown order, 403 other shop / outlet).
 */
export async function findOrderInScope(
  db: any,
  user: { role: string },
  userScope: { merchantId?: number; outletId?: number },
  orderId: number
): Promise<ScopedOrder | { status: number; code: string }> {
  const order = await db.orders.findById(orderId);
  if (!order) return { status: 404, code: 'ORDER_NOT_FOUND' };
  const outlet = await db.outlets.findById(order.outletId);
  if (!outlet) return { status: 404, code: 'OUTLET_NOT_FOUND' };
  if (user.role !== 'ADMIN') {
    if (userScope.merchantId !== outlet.merchantId) return { status: 403, code: 'ACCESS_DENIED' };
    if (userScope.outletId && userScope.outletId !== order.outletId) return { status: 403, code: 'ACCESS_DENIED' };
  }
  return { order, merchantId: outlet.merchantId };
}

export function isScopeError(value: ScopedOrder | { status: number; code: string }): value is { status: number; code: string } {
  return 'code' in value;
}
