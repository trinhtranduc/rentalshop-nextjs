/**
 * #518 — DB side of the "Cho tạo đơn khi trùng lịch" check. Routes call these ONLY when the shop turned
 * the setting off, so shops on the default (allow) run none of these queries.
 *
 * `client` is `db.prisma` or the `tx` of the create transaction (POST /api/orders runs the check inside
 * `createOrderOnce`, after the #341 replay lookup).
 */
import {
  findScheduleConflicts,
  isActiveRental,
  ORDER_SCHEDULE_CONFLICT,
  productsToRecheckOnEdit,
  SCHEDULE_ACTIVE_STATUSES,
  scheduleWindowUtcBounds,
  toDateOrNull,
  type ScheduleConflict,
  type ScheduleExistingOrder,
  type ScheduleRequestItem,
} from './schedule-conflict';

type QueryArgs = Record<string, unknown>;

/** The Prisma delegates the check reads. Routes pass `db.prisma` (or the create `tx`) cast to this. */
export type ScheduleDbClient = {
  merchant: { findUnique: (args: QueryArgs) => Promise<{ allowOverlappingOrders?: boolean | null } | null> };
  order: { findMany: (args: QueryArgs) => Promise<ScheduleExistingOrder[]> };
  outletStock: { findMany: (args: QueryArgs) => Promise<Array<{ productId: number; stock: number }>> };
  product: { findMany: (args: QueryArgs) => Promise<Array<{ id: number; name: string | null }>> };
};
type ScheduleClient = Pick<ScheduleDbClient, 'order' | 'outletStock' | 'product'>;

/**
 * The shop's setting; a missing merchant or column reads as allowed (today's behaviour).
 * Only an explicit `false` turns the check on.
 */
export async function merchantAllowsOverlappingOrders(
  client: Pick<ScheduleDbClient, 'merchant'>,
  merchantId: number | null | undefined
): Promise<boolean> {
  if (!merchantId) return true;
  const row = await client.merchant.findUnique({
    where: { id: merchantId },
    select: { allowOverlappingOrders: true },
  });
  return row?.allowOverlappingOrders !== false;
}

/**
 * Load stock and overlapping active rentals for the products, then run the pure check.
 * Returns [] without querying when there is nothing to check.
 */
export async function loadScheduleConflicts(
  client: ScheduleClient,
  input: {
    outletId: number;
    pickupPlanAt: Date | null;
    returnPlanAt: Date | null;
    items: ScheduleRequestItem[];
    excludeOrderId?: number | null;
    /** Only these products (an edit that grew some lines); default all */
    productIds?: number[] | null;
  }
): Promise<ScheduleConflict[]> {
  if (!input.pickupPlanAt || !input.returnPlanAt) return [];

  const productIds = [
    ...new Set(
      input.items
        .map((item) => Number(item.productId))
        .filter((id) => Number.isInteger(id) && id > 0)
        .filter((id) => !input.productIds || input.productIds.includes(id))
    ),
  ];
  if (productIds.length === 0) return [];

  const { start, end } = scheduleWindowUtcBounds(input.pickupPlanAt, input.returnPlanAt);

  const [stockRows, existingOrders] = await Promise.all([
    client.outletStock.findMany({
      where: { outletId: input.outletId, productId: { in: productIds } },
      select: { productId: true, stock: true },
    }),
    client.order.findMany({
      where: {
        outletId: input.outletId,
        orderType: 'RENT',
        status: { in: [...SCHEDULE_ACTIVE_STATUSES] },
        deletedAt: null,
        ...(input.excludeOrderId != null ? { id: { not: input.excludeOrderId } } : {}),
        // Inclusive VN civil-day overlap (same as GET /api/products/[id]/availability)
        pickupPlanAt: { lt: end },
        returnPlanAt: { gte: start },
        orderItems: { some: { productId: { in: productIds } } },
      },
      select: {
        id: true,
        orderNumber: true,
        outletId: true,
        orderType: true,
        status: true,
        deletedAt: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        orderItems: {
          where: { productId: { in: productIds } },
          select: { productId: true, quantity: true },
        },
      },
    }),
  ]);

  const stockByProductId = new Map<number, number>();
  for (const row of stockRows) stockByProductId.set(row.productId, row.stock);

  const conflicts = findScheduleConflicts({
    outletId: input.outletId,
    pickupPlanAt: input.pickupPlanAt,
    returnPlanAt: input.returnPlanAt,
    items: input.items,
    stockByProductId,
    existingOrders,
    excludeOrderId: input.excludeOrderId ?? null,
    productIds,
  });

  // Names for the message: only when something conflicts and the caller did not know the name
  const unnamed = conflicts.filter((conflict) => !conflict.productName).map((conflict) => conflict.productId);
  if (unnamed.length > 0) {
    const products = await client.product.findMany({
      where: { id: { in: unnamed } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((product) => [product.id, product.name ?? null]));
    for (const conflict of conflicts) {
      if (!conflict.productName) conflict.productName = nameById.get(conflict.productId) ?? null;
    }
  }

  return conflicts;
}

export type EditableOrder = {
  id: number;
  orderType: string;
  status: string;
  outletId: number;
  pickupPlanAt: Date | string | null;
  returnPlanAt: Date | string | null;
  orderItems?: Array<{ productId: number | null; quantity: number; productName?: string | null; product?: { name?: string | null } | null }> | null;
};

/**
 * Conflicts an edit of an existing order would create (#518).
 *
 * `next` holds only what the request changes (`undefined` = keep). Nothing is queried unless the order
 * ends up an active rental AND its dates, outlet, active state or some product quantity grow; only then
 * is the shop setting read (via `resolveMerchantId`) and, when it is OFF, stock and other orders loaded.
 */
export async function findEditScheduleConflicts(
  client: ScheduleDbClient,
  input: {
    existingOrder: EditableOrder;
    next: {
      orderType?: string | null;
      status?: string | null;
      outletId?: number | null;
      pickupPlanAt?: Date | string | null;
      returnPlanAt?: Date | string | null;
      orderItems?: Array<{ productId: number | null; quantity: number }> | null;
    };
    resolveMerchantId: (outletId: number) => Promise<number | null | undefined>;
  }
): Promise<ScheduleConflict[]> {
  const { existingOrder, next } = input;
  const beforeItems: ScheduleRequestItem[] = (existingOrder.orderItems || []).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    productName: item.product?.name ?? item.productName ?? null,
  }));
  const before = {
    outletId: existingOrder.outletId,
    pickupPlanAt: toDateOrNull(existingOrder.pickupPlanAt),
    returnPlanAt: toDateOrNull(existingOrder.returnPlanAt),
    active: isActiveRental(existingOrder.orderType, existingOrder.status),
    items: beforeItems,
  };

  const orderType = next.orderType ?? existingOrder.orderType;
  const status = next.status ?? existingOrder.status;
  const outletId = next.outletId != null ? Number(next.outletId) : existingOrder.outletId;
  // updateOrder only replaces items for a non-empty list
  const items: ScheduleRequestItem[] =
    Array.isArray(next.orderItems) && next.orderItems.length > 0
      ? next.orderItems.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }))
      : beforeItems;
  const after = {
    outletId,
    pickupPlanAt: next.pickupPlanAt !== undefined ? toDateOrNull(next.pickupPlanAt) : before.pickupPlanAt,
    returnPlanAt: next.returnPlanAt !== undefined ? toDateOrNull(next.returnPlanAt) : before.returnPlanAt,
    active: isActiveRental(orderType, status),
    items,
  };

  const productIds = productsToRecheckOnEdit({ before, after });
  if (productIds.length === 0) return [];

  const merchantId = await input.resolveMerchantId(outletId);
  if (await merchantAllowsOverlappingOrders(client, merchantId)) return [];

  // Names the caller already has (existing lines) save a query on conflict
  const nameByProduct = new Map<number, string | null>();
  for (const item of beforeItems) if (item.productId != null) nameByProduct.set(Number(item.productId), item.productName ?? null);

  return loadScheduleConflicts(client, {
    outletId,
    pickupPlanAt: after.pickupPlanAt,
    returnPlanAt: after.returnPlanAt,
    items: items.map((item) => ({ ...item, productName: nameByProduct.get(Number(item.productId)) ?? null })),
    excludeOrderId: existingOrder.id,
    productIds,
  });
}

/**
 * 409 body. Same envelope as ResponseBuilder.error plus `data.conflicts`, so installed apps that only
 * read `success` / `code` / `message` show the server message.
 */
export function scheduleConflictBody(
  errorEnvelope: { success: boolean; code?: string; message?: string; error?: string },
  conflicts: ScheduleConflict[]
) {
  return { ...errorEnvelope, code: ORDER_SCHEDULE_CONFLICT, data: { conflicts } };
}

export const SCHEDULE_CONFLICT_STATUS = 409;
