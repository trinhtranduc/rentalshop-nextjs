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
 * Current shelf availability: units physically in store and not out on rent.
 * Uses outletStock.available (maintained by order flow, including SALE decrements).
 * Falls back to stock - renting when available is missing.
 */
export function resolveTotalAvailableStock(outletStock: {
  stock: number;
  available: number;
  renting: number;
}): number {
  if (Number.isFinite(outletStock.available) && outletStock.available >= 0) {
    return outletStock.available;
  }

  return Math.max(0, outletStock.stock - outletStock.renting);
}

/**
 * Calculate units available for a new rental during a checked period.
 *
 * Semantics:
 * - `totalStock` (Kho): physical inventory count in outlet.
 * - Return value: units free for the checked period = totalStock - conflictingQuantity
 *
 * Rules:
 * - Any overlapping order (RESERVED or PICKUPED) blocks stock for the checked period.
 * - Available = totalStock - conflictingQuantity (simple, predictable)
 * - No period overlap: all stock is available (totalStock)
 */
export function calculateEffectivelyAvailable(input: {
  totalStock: number;
  totalAvailableStock: number;
  totalRenting: number;
  conflictingQuantity: number;
  reservedConflictQuantity: number;
}): number {
  const {
    totalStock,
    conflictingQuantity,
  } = input;

  // Simple rule: available for the period = total stock minus orders occupying that period
  return Math.max(0, totalStock - conflictingQuantity);
}

export type ConflictingOrderInput = {
  id: number;
  orderType: string;
  status: string;
  outletId: number;
  orderItems: Array<{ productId: number; quantity: number }>;
};

/**
 * Sum overlapping RENT order quantities for a product at a specific outlet.
 * Mirrors GET /api/products/[id]/availability conflict aggregation.
 */
export function aggregateConflictingQuantities(
  productId: number,
  outletId: number,
  conflictingOrders: ConflictingOrderInput[]
) {
  let conflictingQuantity = 0;
  let reservedConflictQuantity = 0;
  const conflictOrderIds = new Set<number>();

  for (const order of conflictingOrders) {
    if (order.outletId !== outletId) continue;
    if (order.orderType !== 'RENT') continue;
    if (order.status !== 'RESERVED' && order.status !== 'PICKUPED') continue;

    conflictOrderIds.add(order.id);

    for (const item of order.orderItems) {
      if (item.productId !== productId) continue;
      conflictingQuantity += item.quantity;
      if (order.status === 'RESERVED') {
        reservedConflictQuantity += item.quantity;
      }
    }
  }

  return { conflictingQuantity, reservedConflictQuantity, conflictOrderIds };
}

export type OutletStockLike = {
  stock: number;
  available: number;
  renting: number;
  outlet: { id: number; name: string };
};

/**
 * Build stock metrics returned by GET /api/products/[id]/availability.
 */
export function buildAvailabilityMetrics(input: {
  outletStock: OutletStockLike;
  conflictingQuantity: number;
  reservedConflictQuantity: number;
  requestedQuantity: number;
}) {
  const totalStock = input.outletStock.stock;
  const totalRenting = input.outletStock.renting;
  const totalAvailableStock = resolveTotalAvailableStock(input.outletStock);
  const stockAvailable = totalAvailableStock >= input.requestedQuantity;

  const effectivelyAvailable = calculateEffectivelyAvailable({
    totalStock,
    totalAvailableStock,
    totalRenting,
    conflictingQuantity: input.conflictingQuantity,
    reservedConflictQuantity: input.reservedConflictQuantity,
  });

  const canFulfillRequest = effectivelyAvailable >= input.requestedQuantity;

  return {
    totalStock,
    totalAvailableStock,
    totalRenting,
    stockAvailable,
    effectivelyAvailable,
    canFulfillRequest,
    isAvailable: canFulfillRequest,
    availabilityByOutlet: {
      outletId: input.outletStock.outlet.id,
      outletName: input.outletStock.outlet.name,
      stock: totalStock,
      available: input.outletStock.available,
      renting: totalRenting,
      conflictingQuantity: input.conflictingQuantity,
      reservedConflictQuantity: input.reservedConflictQuantity,
      effectivelyAvailable,
      canFulfillRequest,
    },
  };
}

export type AvailabilityCheckedData = {
  productId: number;
  productName: string;
  totalStock: number;
  totalAvailableStock: number;
  totalRenting: number;
  requestedQuantity: number;
  isAvailable: boolean;
  stockAvailable: boolean;
  hasNoConflicts: boolean;
  availabilityByOutlet: Array<
    ReturnType<typeof buildAvailabilityMetrics>['availabilityByOutlet'] & {
      conflicts?: unknown[];
    }
  >;
  bestOutlet: {
    outletId: number;
    outletName: string;
    effectivelyAvailable: number;
  };
};

/**
 * Build `data` payload for ResponseBuilder.success('AVAILABILITY_CHECKED', data).
 * Used by GET /api/products/[id]/availability and unit tests.
 */
export function buildAvailabilityCheckedData(input: {
  productId: number;
  productName: string;
  outletStock: OutletStockLike;
  conflictingQuantity: number;
  reservedConflictQuantity: number;
  requestedQuantity: number;
  conflicts?: unknown[];
}): AvailabilityCheckedData {
  const metrics = buildAvailabilityMetrics({
    outletStock: input.outletStock,
    conflictingQuantity: input.conflictingQuantity,
    reservedConflictQuantity: input.reservedConflictQuantity,
    requestedQuantity: input.requestedQuantity,
  });

  const outlet = {
    ...metrics.availabilityByOutlet,
    conflicts: input.conflicts ?? [],
  };

  return {
    productId: input.productId,
    productName: input.productName,
    totalStock: metrics.totalStock,
    totalAvailableStock: metrics.totalAvailableStock,
    totalRenting: metrics.totalRenting,
    requestedQuantity: input.requestedQuantity,
    isAvailable: metrics.isAvailable,
    stockAvailable: metrics.stockAvailable,
    hasNoConflicts: input.conflictingQuantity === 0,
    availabilityByOutlet: [outlet],
    bestOutlet: {
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      effectivelyAvailable: outlet.effectivelyAvailable,
    },
  };
}
