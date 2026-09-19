export type ProductRankSortBy = 'revenue' | 'quantity';

export interface ProductShopGroup {
  productId: number;
  outletId: number;
  quantity: number;
  totalRevenue: number;
}

export function rankProductShops(
  groups: ProductShopGroup[],
  sortBy: ProductRankSortBy = 'revenue'
): ProductShopGroup[] {
  return groups.slice().sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.quantity - a.quantity || b.totalRevenue - a.totalRevenue;
    }
    return b.totalRevenue - a.totalRevenue || b.quantity - a.quantity;
  });
}

export function aggregateProductShopSales(
  rows: Array<{
    productId: number | null;
    quantity: number;
    totalPrice: number;
    outletId: number;
  }>
): ProductShopGroup[] {
  const byKey = new Map<string, ProductShopGroup>();

  for (const row of rows) {
    if (!row.productId || row.productId <= 0) continue;
    const key = `${row.productId}:${row.outletId}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += row.quantity || 0;
      existing.totalRevenue += row.totalPrice || 0;
      continue;
    }
    byKey.set(key, {
      productId: row.productId,
      outletId: row.outletId,
      quantity: row.quantity || 0,
      totalRevenue: row.totalPrice || 0
    });
  }

  return Array.from(byKey.values());
}
