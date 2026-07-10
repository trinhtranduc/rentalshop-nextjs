import { formatFullName } from '@rentalshop/utils';

export type AvailabilityOrderDisplayInput = {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  createdAt: Date | null;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  orderItems: Array<{ productId: number | null; quantity: number }>;
};

/**
 * Map an order row for GET /api/products/[id]/availability `orders` array.
 * Includes createdAt for mobile history (Ngày tạo column).
 */
export function mapAvailabilityOrderDisplay(
  order: AvailabilityOrderDisplayInput,
  productId: number,
  isConflict: boolean
) {
  const orderQuantity = order.orderItems
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerName:
      formatFullName(order.customer?.firstName, order.customer?.lastName) || '',
    customerPhone: order.customer?.phone || null,
    createdAt: order.createdAt?.toISOString() || null,
    pickupPlanAt: order.pickupPlanAt?.toISOString() || null,
    returnPlanAt: order.returnPlanAt?.toISOString() || null,
    quantity: orderQuantity,
    isConflict,
  };
}

/**
 * Calculate units available for a new rental during a checked period.
 *
 * - RESERVED overlaps reduce scheduling capacity from total stock.
 * - PICKUPED overlaps are already excluded from totalAvailableStock (via renting),
 *   but still block the check day → subtract from totalAvailableStock when no RESERVED overlap.
 * - When there is no period overlap, use totalStock so PICKUPED items that ended before
 *   the period do not zero out availability (batch-availability bug fix).
 */
export function calculateEffectivelyAvailable(input: {
  totalStock: number;
  totalAvailableStock: number;
  conflictingQuantity: number;
  reservedConflictQuantity: number;
}): number {
  const {
    totalStock,
    totalAvailableStock,
    conflictingQuantity,
    reservedConflictQuantity,
  } = input;

  if (reservedConflictQuantity > 0) {
    return Math.max(0, totalStock - conflictingQuantity);
  }

  if (conflictingQuantity > 0) {
    return Math.max(0, totalAvailableStock - conflictingQuantity);
  }

  return Math.max(0, totalStock);
}
