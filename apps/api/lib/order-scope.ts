import { db } from '@rentalshop/database';

/**
 * An order only references things of the merchant that owns its outlet (#789).
 * Used by POST /api/orders and PUT /api/orders/[id], for every role (an admin too): ids are numeric and easy to
 * guess, and an order snapshots the name, price and image of its products and shows its customer.
 * A reference to another merchant answers like a missing one, so nothing reveals that it exists.
 */
export type OrderRefsCheck = { ok: true } | { ok: false; code: 'PRODUCT_NOT_FOUND' | 'CUSTOMER_NOT_FOUND' };

export async function checkOrderRefsInMerchant(params: {
  merchantId: number;
  productIds?: Array<number | null | undefined>;
  customerId?: number | null;
}): Promise<OrderRefsCheck> {
  const { merchantId } = params;

  const productIds = [...new Set((params.productIds ?? []).filter((id): id is number => typeof id === 'number'))];
  const products = await Promise.all(productIds.map((id) => db.products.findById(id)));
  for (const product of products) {
    if (!product || product.merchantId !== merchantId) return { ok: false, code: 'PRODUCT_NOT_FOUND' };
  }

  if (typeof params.customerId === 'number') {
    const customer = await db.customers.findById(params.customerId);
    if (!customer || customer.merchantId !== merchantId) return { ok: false, code: 'CUSTOMER_NOT_FOUND' };
  }

  return { ok: true };
}
