import { ORDER_STATUS } from '@rentalshop/constants';

/**
 * Product soft delete (#389). A product on an order that is still reserved or out on rent cannot be deleted
 * (`PRODUCT_HAS_OPEN_ORDERS`). Otherwise the row stays (orders keep showing it) with `deletedAt` set and
 * `isActive = false`, and every product list, search and lookup hides it.
 */
export const OPEN_ORDER_STATUSES = [ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED];
export const PRODUCT_HAS_OPEN_ORDERS = 'PRODUCT_HAS_OPEN_ORDERS';

interface ProductDeleteClient {
  orderItem: { findMany: (args: any) => Promise<any[]> };
  product: { updateMany: (args: any) => Promise<{ count: number }> };
}

/** Ids among `productIds` that are on a RESERVED or PICKUPED (not deleted) order. One query. */
export async function findProductIdsWithOpenOrders(
  client: Pick<ProductDeleteClient, 'orderItem'>,
  productIds: number[]
): Promise<Set<number>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Set();
  const rows = await client.orderItem.findMany({
    where: {
      productId: { in: ids },
      order: { status: { in: OPEN_ORDER_STATUSES }, deletedAt: null },
    },
    select: { productId: true },
    distinct: ['productId'],
  });
  return new Set(rows.map((row: { productId: number | null }) => row.productId).filter((id): id is number => id != null));
}

/**
 * Open (RESERVED / PICKUPED, not deleted) orders per product and outlet, for the #825 delete rule.
 * Returns productId -> [{ outletId, name, orders }]. One query.
 */
export async function openOrdersByProductAndOutlet(
  client: Pick<ProductDeleteClient, 'orderItem'>,
  productIds: number[]
): Promise<Map<number, Array<{ outletId: number; name: string; orders: number }>>> {
  const ids = [...new Set(productIds)];
  const result = new Map<number, Array<{ outletId: number; name: string; orders: number }>>();
  if (ids.length === 0) return result;
  const rows = await client.orderItem.findMany({
    where: {
      productId: { in: ids },
      order: { status: { in: OPEN_ORDER_STATUSES }, deletedAt: null },
    },
    select: { productId: true, orderId: true, order: { select: { outletId: true, outlet: { select: { id: true, name: true } } } } },
  });
  const seen = new Set<string>();
  for (const row of rows as Array<{ productId: number | null; orderId: number; order?: { outletId?: number; outlet?: { id?: number; name?: string } | null } | null }>) {
    const outletId = row.order?.outletId ?? row.order?.outlet?.id;
    if (row.productId == null || outletId == null) continue;
    const key = `${row.productId}:${row.orderId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = result.get(row.productId) || [];
    const entry = list.find((e) => e.outletId === outletId);
    if (entry) entry.orders += 1;
    else list.push({ outletId, name: row.order?.outlet?.name || '', orders: 1 });
    result.set(row.productId, list);
  }
  return result;
}

/**
 * Soft-deletes the products that have no open order. Callers check merchant / outlet scope first.
 * Returns which ids were deleted and which were blocked by an open order.
 */
export async function softDeleteProducts(
  client: ProductDeleteClient,
  productIds: number[],
  now: Date = new Date()
): Promise<{ deletedIds: number[]; blockedIds: number[] }> {
  const ids = [...new Set(productIds)];
  const blocked = await findProductIdsWithOpenOrders(client, ids);
  const deletable = ids.filter((id) => !blocked.has(id));
  if (deletable.length > 0) {
    await client.product.updateMany({
      where: { id: { in: deletable }, deletedAt: null },
      data: { deletedAt: now, isActive: false },
    });
  }
  return { deletedIds: deletable, blockedIds: ids.filter((id) => blocked.has(id)) };
}
