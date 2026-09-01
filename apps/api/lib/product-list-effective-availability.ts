import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS } from '@rentalshop/constants';
import {
  calendarDayAvailability,
  getAvailabilityCivilDayBounds,
  toAvailabilityCivilDateKey,
} from './availability-calendar-days';

export type ProductListEffectiveAvailabilityInput = {
  id: number;
};

export type CivilDayOrderInput = {
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  quantity: number;
};

/**
 * Effective availability for one civil day — same math as Order Check calendar cells.
 */
export function effectiveAvailableForCivilDay(input: {
  stock: number;
  civilDayYmd: string;
  orders: CivilDayOrderInput[];
}): number {
  const days = calendarDayAvailability({
    stock: Math.max(0, input.stock),
    fromYmd: input.civilDayYmd,
    toYmd: input.civilDayYmd,
    orders: input.orders,
  });

  return days.find((day) => day.date === input.civilDayYmd)?.available ?? Math.max(0, input.stock);
}

/** @deprecated Use effectiveAvailableForCivilDay — kept for existing unit tests. */
export function computeEffectiveAvailableForDay(input: {
  stock: number;
  available: number;
  renting: number;
  conflictingQuantity: number;
  reservedConflictQuantity: number;
}): number {
  return Math.max(0, input.stock - input.conflictingQuantity);
}

/**
 * Batch-compute today's effective availability for product list badges.
 * Uses VN civil day bounds — matches GET /api/products/[id]/availability?date=YYYY-MM-DD.
 */
export async function batchTodayEffectiveAvailability(
  products: ProductListEffectiveAvailabilityInput[],
  outletId: number,
  civilDayYmd: string = toAvailabilityCivilDateKey(new Date())
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!products.length || !outletId) {
    return result;
  }

  const bounds = getAvailabilityCivilDayBounds(civilDayYmd);
  if (!bounds) {
    return result;
  }

  const productIds = products.map((product) => product.id);
  const { start: rentalStart, end: rentalEnd } = bounds;

  const outletStocks = await db.prisma.outletStock.findMany({
    where: {
      productId: { in: productIds },
      outletId,
    },
    select: {
      productId: true,
      stock: true,
      available: true,
      renting: true,
    },
  });

  const stockByProduct = new Map(outletStocks.map((row) => [row.productId, row]));

  const overlappingRentOrders = await db.prisma.order.findMany({
    where: {
      orderType: ORDER_TYPE.RENT as any,
      status: {
        in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any],
      },
      outletId,
      deletedAt: null,
      pickupPlanAt: { lt: rentalEnd },
      returnPlanAt: { gte: rentalStart },
      orderItems: {
        some: {
          productId: { in: productIds },
        },
      },
    },
    select: {
      pickupPlanAt: true,
      returnPlanAt: true,
      orderItems: {
        where: {
          productId: { in: productIds },
        },
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  const ordersByProduct = new Map<number, CivilDayOrderInput[]>();

  for (const order of overlappingRentOrders) {
    const quantitiesByProduct = new Map<number, number>();

    for (const item of order.orderItems) {
      if (!item.productId) continue;
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    for (const [productId, quantity] of quantitiesByProduct) {
      if (quantity <= 0) continue;
      const list = ordersByProduct.get(productId) ?? [];
      list.push({
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        quantity,
      });
      ordersByProduct.set(productId, list);
    }
  }

  for (const productId of productIds) {
    const stock = stockByProduct.get(productId);
    if (!stock) {
      result.set(productId, 0);
      continue;
    }

    result.set(
      productId,
      effectiveAvailableForCivilDay({
        stock: stock.stock,
        civilDayYmd,
        orders: ordersByProduct.get(productId) ?? [],
      })
    );
  }

  return result;
}

/**
 * Resolve outlet for today's effective availability on product list.
 * Mobile POS always sends outletId; outlet staff use assigned outlet.
 */
export function resolveProductListAvailabilityOutletId(input: {
  role: string;
  userOutletId?: number;
  queryOutletId?: number;
  /** Backend outlet filter (OUTLET_* roles always have this). */
  filterOutletId?: number;
}): number | undefined {
  const { userOutletId, queryOutletId, filterOutletId } = input;

  if (queryOutletId && queryOutletId > 0) {
    return queryOutletId;
  }

  if (userOutletId && userOutletId > 0) {
    return userOutletId;
  }

  if (filterOutletId && filterOutletId > 0) {
    return filterOutletId;
  }

  return undefined;
}
