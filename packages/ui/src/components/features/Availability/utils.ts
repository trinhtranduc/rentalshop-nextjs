import type { DerivedAvailabilityResult, AvailabilityDisplayStatus, ActiveOrder } from './types';

export function deriveAvailabilityResult(
  data: any,
  quantity: number,
  outletId?: number
): Omit<DerivedAvailabilityResult, 'raw'> {
  const rows = data.availabilityByOutlet ?? [];
  const outletRow = outletId != null
    ? rows.find((r: any) => r.outletId === outletId) ?? rows[0]
    : rows[0];

  const effectivelyAvailable = outletRow?.effectivelyAvailable ?? data.totalAvailableStock ?? 0;
  const totalStock = data.totalStock ?? 0;
  const totalRenting = data.totalRenting ?? 0;
  const totalConflictsFound = data.totalConflictsFound ?? 0;
  const conflicts = outletRow?.conflicts ?? [];

  let status: AvailabilityDisplayStatus;
  if (!data.stockAvailable) {
    status = 'unavailable';
  } else if (effectivelyAvailable < quantity || !data.isAvailable) {
    status = 'unavailable';
  } else if (totalConflictsFound > 0) {
    status = 'warning';
  } else {
    status = 'available';
  }

  return { status, effectivelyAvailable, totalStock, totalRenting, totalConflictsFound, conflicts };
}

export function formatAvailabilityDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(locale);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function needsOutletSelection(role?: string, userOutletId?: number): boolean {
  if (userOutletId) return false;
  return role === 'MERCHANT' || role === 'ADMIN';
}

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Convert orders from API response to ActiveOrder format
 */
export function toActiveOrders(
  orders: any[],
  selectedPickup?: string,
  selectedReturn?: string
): ActiveOrder[] {
  return orders.map((o) => {
    const pickupPlanAt = o.pickupPlanAt ? o.pickupPlanAt.split('T')[0] : '';
    const returnPlanAt = o.returnPlanAt ? o.returnPlanAt.split('T')[0] : '';
    const isConflict = selectedPickup && selectedReturn
      ? datesOverlap(selectedPickup, selectedReturn, pickupPlanAt, returnPlanAt)
      : false;

    return {
      id: o.id,
      orderNumber: o.orderNumber || `#${o.id}`,
      customerName: o.customer
        ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ')
        : o.customerName || '—',
      pickupPlanAt,
      returnPlanAt,
      quantity: o.orderItems?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1,
      status: o.status || 'RESERVED',
      isConflict,
    };
  });
}
