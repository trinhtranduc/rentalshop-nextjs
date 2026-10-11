import { NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder } from '@rentalshop/utils';
import { checkPlanLimitIfNeeded } from '@rentalshop/utils/server';
import { API, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';

/**
 * Outlet rules of #824 (owner decisions in #823, 2026-10-11):
 * - only the shop owner (MERCHANT) and the platform ADMIN create, disable, re-enable or delete an outlet;
 *   OUTLET_ADMIN edits the info of its own outlet only;
 * - disable / delete is refused while the outlet has RESERVED or PICKUPED (not deleted) orders; stock does not block;
 * - re-enabling checks the outlets plan limit, like a create. Outlets already above the limit stay.
 */
export const OUTLET_HAS_OPEN_ORDERS = 'OUTLET_HAS_OPEN_ORDERS';

export function canChangeOutletLifecycle(role: string | null | undefined): boolean {
  return role === USER_ROLE.MERCHANT || role === USER_ROLE.ADMIN;
}

export function outletForbiddenResponse() {
  return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
}

/** RESERVED or PICKUPED orders of the outlet that are not deleted. */
export async function countOpenOrdersOfOutlet(outletId: number): Promise<number> {
  return prisma.order.count({
    where: { outletId, status: { in: [ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED] }, deletedAt: null },
  });
}

/** 409 OUTLET_HAS_OPEN_ORDERS with `data.openOrders`, or null when the outlet may be disabled / deleted. */
export async function openOrdersBlockResponse(outletId: number) {
  const openOrders = await countOpenOrdersOfOutlet(outletId);
  if (openOrders === 0) return null;
  return NextResponse.json(
    { ...ResponseBuilder.error(OUTLET_HAS_OPEN_ORDERS), data: { openOrders } },
    { status: API.STATUS.CONFLICT }
  );
}

/**
 * Guard for a PUT that may carry `isActive`. Sending the current value is not a change (old clients may echo it).
 * Returns the error response to send, or null.
 */
export async function guardOutletStatusChange(
  user: { role: string },
  outlet: { id: number; isActive: boolean; merchantId?: number; merchant?: { id: number } | null },
  nextIsActive: boolean | undefined
) {
  if (nextIsActive === undefined || nextIsActive === outlet.isActive) return null;
  if (!canChangeOutletLifecycle(user.role)) return outletForbiddenResponse();
  if (nextIsActive === false) return openOrdersBlockResponse(outlet.id);
  const merchantId = outlet.merchantId ?? outlet.merchant?.id;
  if (!merchantId) return null;
  return checkPlanLimitIfNeeded(user, merchantId, 'outlets');
}
