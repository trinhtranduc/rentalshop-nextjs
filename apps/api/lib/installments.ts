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

/**
 * The single place that writes a `Payment` for a deposit stage (#1230): the create-order route (`CREATE_ORDER`,
 * stage 1 taken with the booking) and `POST .../installments/[key]/collect` (`INSTALLMENT`) both call it, so the
 * metadata is the same. `plannedAmount` is the stage amount at the moment of collection; `effectivePlan` judges a
 * locked stage against it, so a later change of the total does not turn a fully collected stage into PARTIAL.
 */
export async function recordInstallmentPayment(
  tx: any,
  args: {
    orderId: number;
    merchantId: number | null | undefined;
    stage: { key: string; plannedAmount: number };
    amount: number;
    currency: string;
    method: string;
    reference: string;
    userId: number | string;
    source: 'CREATE_ORDER' | 'INSTALLMENT';
    processedAt?: Date;
    description?: string | null;
    collectedOn?: string;
  }
) {
  const metadata: Record<string, unknown> = { kind: 'COLLECT', source: args.source };
  if (args.collectedOn) metadata.collectedOn = args.collectedOn;
  if (args.source === 'INSTALLMENT') metadata.plannedAmount = args.stage.plannedAmount;
  return tx.payment.create({
    data: {
      orderId: args.orderId,
      merchantId: args.merchantId ?? null,
      amount: args.amount,
      currency: args.currency,
      method: args.method as any,
      type: 'ORDER_PAYMENT',
      status: 'COMPLETED',
      reference: args.reference,
      notes: INSTALLMENT_PAYMENT_NOTE,
      installmentKey: args.stage.key,
      description: args.description || null,
      processedAt: args.processedAt ?? new Date(),
      processedBy: String(args.userId),
      metadata: JSON.stringify(metadata),
    },
  });
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
  const rest: Record<string, any> = { ...order };
  delete rest.depositPlan;
  return { ...rest, ...installmentsView(order as any, shop) } as unknown as T;
}

// ---------------------------------------------------------------------------
// GET /api/orders: which rows have a deposit plan (#1222)
// ---------------------------------------------------------------------------

interface PlanSumClient {
  payment: { groupBy: (args: any) => Promise<any> };
}

/**
 * Rows of one list page shaped for this caller. A client without `installments` gets the rows it gets today
 * (`depositPlan` never leaves the API). A capable client gets `hasDepositPlan` on every row and, for a plan order,
 * `installmentSummary: { collected, percentCollected }` (same names and rounding as the order detail). One grouped
 * query for the whole page, only when the page holds a plan order.
 */
export async function shapeListPlans<T extends Record<string, any>>(
  orders: T[],
  capable: boolean,
  client: PlanSumClient
): Promise<T[]> {
  if (!capable) {
    return orders.map((order) => {
      if (!('depositPlan' in order)) return order;
      const { depositPlan: _plan, ...rest } = order;
      return rest as unknown as T;
    });
  }
  const planIds = orders.filter((order) => parseDepositPlan(order.depositPlan) != null).map((order) => order.id as number);
  const sums = new Map<number, number>();
  if (planIds.length > 0) {
    const rows = (await client.payment.groupBy({
      by: ['orderId'],
      where: { orderId: { in: planIds }, status: 'COMPLETED', notes: INSTALLMENT_PAYMENT_NOTE },
      _sum: { amount: true },
    })) as Array<{ orderId: number | null; _sum: { amount: number | null } }>;
    for (const row of rows) if (row.orderId != null) sums.set(row.orderId, row._sum?.amount || 0);
  }
  return orders.map((order) => {
    const { depositPlan, ...rest } = order;
    if (parseDepositPlan(depositPlan) == null) return { ...rest, hasDepositPlan: false } as unknown as T;
    const collected = sums.get(order.id as number) || 0;
    const total = Number(order.totalAmount) || 0;
    return {
      ...rest,
      hasDepositPlan: true,
      installmentSummary: { collected, percentCollected: total > 0 ? Math.round((collected / total) * 10000) / 100 : 0 },
    } as unknown as T;
  });
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

// ---------------------------------------------------------------------------
// cancelling a plan order (#1199 part B)
// ---------------------------------------------------------------------------

/** Roles that may keep part of the money when cancelling; staff cancel = refund everything, as before. */
export const CANCEL_KEEP_ROLES = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'];

export interface CancelRequest {
  /** What the shop keeps; `undefined` = the client sent none (old apps): everything is refunded */
  keptAmount?: number;
  note?: string;
}

/**
 * Reads the optional `cancelKeptAmount` / `cancelNote` of a cancel request. Anything that is not a finite number
 * >= 0 is `CANCEL_AMOUNTS_MISMATCH`.
 */
export function parseCancelRequest(body: { cancelKeptAmount?: unknown; cancelNote?: unknown } | null | undefined):
  | { ok: true; value: CancelRequest }
  | { ok: false } {
  const raw = body?.cancelKeptAmount;
  const note = typeof body?.cancelNote === 'string' ? body.cancelNote.trim().slice(0, 500) : undefined;
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: { ...(note ? { note } : {}) } };
  const amount = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(amount) || amount < 0) return { ok: false };
  return { ok: true, value: { keptAmount: amount, ...(note ? { note } : {}) } };
}

export interface PlanCancellation {
  /** Collected stages minus refunds already given */
  collected: number;
  kept: number;
  refund: number;
  /** The client sent no amount: everything goes back (old apps) */
  refundedAll: boolean;
  note?: string;
}

/** Money collected in stages of an order and not refunded yet */
export async function collectedForCancel(client: any, orderId: number): Promise<number> {
  const rows = await client.payment.findMany({
    where: {
      orderId,
      OR: [
        { status: 'COMPLETED', notes: INSTALLMENT_PAYMENT_NOTE },
        { status: 'REFUNDED', notes: CANCEL_REFUND_NOTE },
      ],
    },
    select: { amount: true, status: true, notes: true },
  });
  let total = 0;
  for (const row of rows as DepositPaymentRow[]) {
    total += row.status === 'REFUNDED' ? -(row.amount || 0) : row.amount || 0;
  }
  return Math.max(0, Math.round(total * 10000) / 10000);
}

/**
 * Checks a cancellation BEFORE the status changes. Returns `{ error }` (400 `CANCEL_AMOUNTS_MISMATCH`: kept is
 * negative, not a number, or more than was collected; 403 `INSTALLMENT_FORBIDDEN_ROLE`: staff keeping money), `{ plan: null }` when
 * the order has no deposit plan (nothing to do), else the amounts to record after the status changed.
 */
export async function planCancellation(
  client: any,
  args: { order: PlanOrderLike & { id: number }; role: string; request: ReturnType<typeof parseCancelRequest> }
): Promise<{ error: { code: string; status: number } } | { plan: PlanCancellation | null }> {
  if (!args.request.ok) return { error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } };
  const { keptAmount, note } = args.request.value;
  const hasPlan = parseDepositPlan(args.order.depositPlan) != null;
  const collected = hasPlan ? await collectedForCancel(client, args.order.id) : 0;
  if (keptAmount !== undefined && keptAmount > 0) {
    if (!CANCEL_KEEP_ROLES.includes(args.role)) return { error: { code: 'INSTALLMENT_FORBIDDEN_ROLE', status: 403 } };
    if (keptAmount > collected + 1e-9) return { error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } };
  }
  if (!hasPlan) return { plan: null };
  const kept = Math.round((keptAmount ?? 0) * 10000) / 10000;
  const refund = Math.max(0, Math.round((collected - kept) * 10000) / 10000);
  return { plan: { collected, kept, refund, refundedAll: keptAmount === undefined, ...(note ? { note } : {}) } };
}

/**
 * After the order is CANCELLED: records what went back (a `REFUNDED` / `CANCEL_REFUND` payment for the refunded
 * part) and what the shop kept, in one transaction, and brings `depositAmount` up to date. The refund is dated
 * `at` = `cancelledAt`, so revenue shows it as a negative event on the cancel day. If this fails the order stays
 * cancelled with no amounts, which every screen reads as "everything was refunded" (the old behaviour).
 */
export async function recordPlanCancellation(
  prisma: any,
  args: { orderId: number; merchantId: number | null | undefined; currency: string; plan: PlanCancellation; userId: number | string; at: Date }
): Promise<void> {
  const { orderId, merchantId, currency, plan, userId, at } = args;
  await prisma.$transaction(
    async (tx: any) => {
      await lockOrderRow(tx, orderId);
      if (plan.refund > 0) {
        await tx.payment.create({
          data: {
            orderId,
            merchantId: merchantId ?? null,
            amount: plan.refund,
            currency,
            method: 'CASH',
            type: 'ORDER_PAYMENT',
            status: 'REFUNDED',
            notes: CANCEL_REFUND_NOTE,
            description: plan.note || null,
            processedAt: at,
            processedBy: String(userId),
            metadata: JSON.stringify({ kind: 'CANCEL_REFUND', collected: plan.collected, kept: plan.kept, refundedAll: plan.refundedAll }),
          },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { cancelKeptAmount: plan.kept, cancelledAt: at } });
      await recomputeDepositFromPayments(tx, orderId);
    },
    { maxWait: 5000, timeout: 15000 }
  );
}

export function cancelAuditDescription(orderNumber: string, plan: PlanCancellation): string {
  const base = `Order ${orderNumber} cancelled: collected ${plan.collected}, kept ${plan.kept}, refunded ${plan.refund}`;
  return plan.refundedAll ? `${base} (client sent no amounts: everything refunded)` : base;
}

/** A cancelled order that kept money stays in the history: it cannot be deleted (error `CANCELLED_ORDER_KEEPS_AMOUNT`) */
export function keepsCancelAmount(order: { status?: string | null; cancelKeptAmount?: number | null }): boolean {
  return order.status === 'CANCELLED' && (order.cancelKeptAmount || 0) > 0;
}
