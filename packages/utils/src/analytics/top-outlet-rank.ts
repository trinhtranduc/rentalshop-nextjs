export interface TopOutletRank {
  id: number;
  name: string;
  merchantId: number;
  merchantName: string;
  city: string | null;
  orderCount: number;
  totalRevenue: number;
}

export function rankOutletsByRevenue(
  groups: Array<{ outletId: number; orderCount: number; totalRevenue: number }>,
  outlets: Array<{
    id: number;
    name: string;
    city: string | null;
    merchant: { id: number; name: string };
  }>
): TopOutletRank[] {
  const byId = new Map(outlets.map((outlet) => [outlet.id, outlet]));
  return groups
    .slice()
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.orderCount - a.orderCount)
    .map((group) => {
      const outlet = byId.get(group.outletId);
      if (!outlet) return null;
      return {
        id: outlet.id,
        name: outlet.name,
        merchantId: outlet.merchant.id,
        merchantName: outlet.merchant.name,
        city: outlet.city,
        orderCount: group.orderCount,
        totalRevenue: group.totalRevenue
      };
    })
    .filter((row): row is TopOutletRank => row !== null);
}
