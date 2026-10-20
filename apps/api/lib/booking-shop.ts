/**
 * #1124 — scope of the shop booking routes: merchant users see their shop, outlet users only their outlet.
 */
import type { Prisma } from '@prisma/client';
import { isOutletRole } from '@rentalshop/constants';

export type BookingScope = { merchantId: number; outletId?: number };

export function bookingScope(user: { role?: string }, userScope: { merchantId?: number; outletId?: number }): BookingScope | null {
  if (!userScope?.merchantId) return null;
  if (isOutletRole(user?.role)) {
    if (!userScope.outletId) return null;
    return { merchantId: userScope.merchantId, outletId: userScope.outletId };
  }
  return { merchantId: userScope.merchantId };
}

/** The request when it is inside the scope, else null (404 for the caller) */
export async function findScopedRequest(prisma: Prisma.TransactionClient, id: number, scope: BookingScope) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await prisma.bookingRequest.findUnique({ where: { id }, include: { items: true } });
  if (!row || row.merchantId !== scope.merchantId) return null;
  if (scope.outletId && row.outletId !== scope.outletId) return null;
  return row;
}

export async function outletNameMap(prisma: Prisma.TransactionClient, outletIds: number[]): Promise<Map<number, string>> {
  const ids = [...new Set(outletIds)];
  if (ids.length === 0) return new Map();
  const outlets = await prisma.outlet.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(outlets.map((o) => [o.id, o.name]));
}
