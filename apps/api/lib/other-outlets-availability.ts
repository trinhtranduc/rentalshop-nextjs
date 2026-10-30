/**
 * #1347 (#1335) "Chi nhánh khác còn N": which other branches of the shop still have a product on the days of an order.
 * Pure rules (no app imports besides the availability helpers), so they run in Jest on their own.
 *
 * Units left at a branch = `calculateEffectivelyAvailable` (stock minus what open orders hold on the days), the same
 * count `POST /api/products/batch-availability` gives, so the hint and the cart never disagree.
 */
import { aggregateConflictingQuantities, calculateEffectivelyAvailable } from './availability';

/** Roles that see the other branches. OUTLET_STAFF does not (owner 2026-10-30). Widen here, not in the route. */
const OTHER_OUTLETS_ROLES = ['MERCHANT', 'ADMIN', 'OUTLET_ADMIN', 'OUTLET_INVENTORY'] as const;

export function canSeeOtherOutlets(role: string | null | undefined): boolean {
  return (OTHER_OUTLETS_ROLES as readonly string[]).includes(role ?? '');
}

export type HeldOrder = {
  id: number;
  outletId: number;
  orderType: string;
  status: string;
  orderItems: Array<{ productId: number | null; quantity: number }>;
};

export interface OtherOutletHint {
  outletId: number;
  outletName: string;
  available: number;
}

/**
 * The `where` of the orders that hold stock, as `batch-availability` builds it.
 * RENT: inclusive Vietnam civil days (`bounds` is half-open, from `resolveAvailabilityQueryWindow`): the pickup day is
 * on or before the last day and the return day on or after the first; no planned return = held when picked up inside.
 * SALE: every RESERVED order, and PICKUPED ones picked up from `now` on.
 */
export function heldOrdersWhere(input: {
  orderType: 'RENT' | 'SALE';
  outletIds: number[];
  productIds: number[];
  bounds: { start: Date; end: Date } | null;
  now: Date;
}) {
  const base = {
    outletId: { in: input.outletIds },
    deletedAt: null,
    orderItems: { some: { productId: { in: input.productIds } } },
  };
  if (input.orderType === 'SALE') {
    return {
      ...base,
      orderType: 'SALE',
      OR: [{ status: 'RESERVED' }, { AND: [{ status: 'PICKUPED' }, { pickupPlanAt: { gte: input.now } }] }],
    };
  }
  const { start, end } = input.bounds as { start: Date; end: Date };
  return {
    ...base,
    orderType: 'RENT',
    status: { in: ['RESERVED', 'PICKUPED'] },
    OR: [
      { pickupPlanAt: { lt: end }, returnPlanAt: { gte: start } },
      { returnPlanAt: null, pickupPlanAt: { gte: start, lt: end } },
    ],
  };
}

/** Units of one product that open SALE orders hold at one branch. */
function heldBySales(productId: number, outletId: number, orders: HeldOrder[]): number {
  let total = 0;
  for (const o of orders) {
    if (o.outletId !== outletId || o.orderType !== 'SALE') continue;
    if (o.status !== 'RESERVED' && o.status !== 'PICKUPED') continue;
    for (const item of o.orderItems) if (item.productId === productId) total += item.quantity;
  }
  return total;
}

/**
 * One entry per product (in `productIds` order): the given branches that ticked the product (`isListed`) and have
 * `available > 0`, most units first, then branch id. `outlets` must already be the other, open branches of the shop.
 */
export function buildOtherOutletsResults(input: {
  productIds: number[];
  outlets: Array<{ id: number; name: string }>;
  stocks: Array<{ productId: number; outletId: number; stock: number; isListed: boolean }>;
  heldOrders: HeldOrder[];
  orderType: 'RENT' | 'SALE';
}): Array<{ productId: number; outlets: OtherOutletHint[] }> {
  return input.productIds.map((productId) => {
    const hints: OtherOutletHint[] = [];
    for (const outlet of input.outlets) {
      const row = input.stocks.find((s) => s.productId === productId && s.outletId === outlet.id);
      if (!row || !row.isListed) continue;
      const held =
        input.orderType === 'SALE'
          ? heldBySales(productId, outlet.id, input.heldOrders)
          : aggregateConflictingQuantities(productId, outlet.id, input.heldOrders).conflictingQuantity;
      const available = calculateEffectivelyAvailable({
        totalStock: row.stock,
        totalAvailableStock: row.stock,
        totalRenting: 0,
        conflictingQuantity: held,
        reservedConflictQuantity: 0,
      });
      if (available > 0) hints.push({ outletId: outlet.id, outletName: outlet.name, available });
    }
    hints.sort((a, b) => b.available - a.available || a.outletId - b.outletId);
    return { productId, outlets: hints };
  });
}
