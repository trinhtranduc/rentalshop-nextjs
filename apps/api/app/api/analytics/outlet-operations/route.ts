import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions, hasPermission } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { daysBetweenDateKeys, getOperationsDay, toOperationsDateKey } from '../../../../lib/outlet-operations-day';

const querySchema = z.object({
  outletIds: z.string().regex(/^\d+(,\d+)*$/).optional(),
  merchantId: z.coerce.number().int().positive().optional(),
});

type OperationsRow = {
  id: number;
  orderNumber: string;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  totalAmount: number;
  depositAmount: number;
  securityDeposit: number;
  isReadyToDeliver: boolean;
  customer: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  orderItems: { quantity: number; product: { name: string } | null }[];
};

function toRow(order: OperationsRow, todayKey: string, withOverdue = false) {
  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ').trim();
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: customerName || null,
    customerPhone: order.customer?.phone || null,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    securityDeposit: order.securityDeposit,
    isReadyToDeliver: order.isReadyToDeliver,
    itemCount: order.orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    productNames: order.orderItems.map((item) => item.product?.name).filter(Boolean).join(', '),
    ...(withOverdue && order.returnPlanAt
      ? { daysOverdue: Math.max(1, daysBetweenDateKeys(toOperationsDateKey(order.returnPlanAt), todayKey)) }
      : {}),
  };
}

/**
 * GET /api/analytics/outlet-operations
 *
 * Today's work for an outlet team, for the current Vietnam civil day (#350):
 * RENT orders to hand over, to take back, overdue, no-shows, and due back in the next 3 days
 * (each: count + up to 50 rows).
 * `cash` (deposits held, deposits due back today, fees on returns today) only with analytics.view.revenue.
 *
 * Access: analytics.view.dashboard.
 * - OUTLET_ADMIN / OUTLET_STAFF: own outlet only (outletIds is ignored).
 * - MERCHANT: its outlets, optionally narrowed with `outletIds=1,3`; foreign outlets → 403.
 * - ADMIN: `merchantId` required (optionally narrowed with `outletIds`).
 * Indexed: Order(outletId, status, pickupPlanAt / returnPlanAt).
 */
export const GET = withPermissions(['analytics.view.dashboard'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.error('INVALID_QUERY'), { status: 400 });
    }
    const requestedOutletIds = parsed.data.outletIds?.split(',').map(Number);

    let outletIds: number[];
    if (userScope.outletId) {
      outletIds = [userScope.outletId];
    } else {
      const merchantId = userScope.merchantId ?? parsed.data.merchantId;
      if (!merchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), { status: 400 });
      }
      const merchantOutletIds = await db.outletOperations.merchantOutletIds(merchantId);
      if (requestedOutletIds) {
        if (requestedOutletIds.some((id) => !merchantOutletIds.includes(id))) {
          return NextResponse.json(ResponseBuilder.error('CROSS_MERCHANT_ACCESS_DENIED'), { status: 403 });
        }
        outletIds = requestedOutletIds;
      } else {
        outletIds = merchantOutletIds;
      }
    }

    const includeCash = await hasPermission(user, 'analytics.view.revenue');
    const day = getOperationsDay();
    // Look-ahead for "returns in the next 3 days" (Vietnam has no DST: civil days are 24h)
    const soonEnd = new Date(day.end.getTime() + 3 * 24 * 60 * 60 * 1000);
    const ops = await db.outletOperations.get({ outletIds, start: day.start, end: day.end, soonEnd, includeCash });

    const list = (group: { count: number; orders: OperationsRow[] }, withOverdue = false) => ({
      count: group.count,
      orders: group.orders.map((order) => toRow(order, day.dateKey, withOverdue)),
    });

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_OPERATIONS_SUCCESS', {
        date: day.dateKey,
        outletIds,
        pickupsToday: list(ops.pickupsToday as any),
        returnsToday: list(ops.returnsToday as any),
        overdueReturns: list(ops.overdueReturns as any, true),
        noShows: list(ops.noShows as any),
        returnsSoon: list(ops.returnsSoon as any),
        cash: ops.cash,
      })
    );
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
