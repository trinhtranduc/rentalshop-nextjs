import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions, hasPermission } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, getCalendarDayRangeInTimeZone, formatDateKeyInTimeZone } from '@rentalshop/utils';
import { daysBetweenDateKeys, getOperationsDay, getOperationsWeek, toOperationsDateKey } from '../../../../lib/outlet-operations-day';
import { computeOrderBalance } from '../../../../lib/order-balance';

const querySchema = z.object({
  outletIds: z.string().regex(/^\d+(,\d+)*$/).optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  /** IANA zone of the device (#362); the Vietnam day when missing */
  timeZone: z.string().min(1).max(64).optional(),
});

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

type DayWindow = { dateKey: string; start: Date; end: Date };

/** Today, tomorrow, the 3-day look-ahead, the 7-day trend and the day key of an instant, in one zone */
function resolveDays(timeZone: string | undefined, now = new Date()) {
  if (!timeZone) {
    const day = getOperationsDay(now);
    return {
      day,
      // Vietnam has no DST: civil days are 24h
      soonEnd: new Date(day.end.getTime() + 3 * 24 * 60 * 60 * 1000),
      tomorrowStart: new Date(day.end.getTime() + 1),
      tomorrowEnd: new Date(day.end.getTime() + 24 * 60 * 60 * 1000),
      trendDays: getOperationsWeek(now) as DayWindow[],
      keyOf: (instant: Date) => toOperationsDateKey(instant),
    };
  }
  const dayAt = (offset: number): DayWindow => getCalendarDayRangeInTimeZone(now, timeZone, offset);
  const day = dayAt(0);
  const tomorrow = dayAt(1);
  return {
    day,
    soonEnd: dayAt(3).end,
    tomorrowStart: tomorrow.start,
    tomorrowEnd: tomorrow.end,
    trendDays: [-6, -5, -4, -3, -2, -1, 0].map(dayAt),
    keyOf: (instant: Date) => formatDateKeyInTimeZone(instant, timeZone),
  };
}

type OperationsRow = {
  id: number;
  orderNumber: string;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  totalAmount: number;
  depositAmount: number;
  securityDeposit: number;
  isReadyToDeliver: boolean;
  orderType?: string | null;
  status?: string | null;
  lateFee?: number | null;
  damageFee?: number | null;
  payments?: { amount: number | null; status: string | null; notes: string | null }[];
  customer: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  orderItems: { quantity: number; productName?: string | null; product: { name: string } | null }[];
};

function toRow(order: OperationsRow, todayKey: string, keyOf: (instant: Date) => string, withOverdue = false) {
  // Days past the planned hand-over (still RESERVED) or return (still PICKUPED); a note, not a status
  const lateFrom =
    order.status === 'RESERVED' ? order.pickupPlanAt : order.status === 'PICKUPED' ? order.returnPlanAt : null;
  const lateDays = lateFrom ? Math.max(0, daysBetweenDateKeys(keyOf(lateFrom), todayKey)) : 0;
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
      ? { daysOverdue: Math.max(1, daysBetweenDateKeys(keyOf(order.returnPlanAt), todayKey)) }
      : {}),
    // Mobile "Việc cần làm" (#362)
    ...computeOrderBalance(order),
    lateDays,
    items: order.orderItems.map((item) => ({
      name: item.productName || item.product?.name || null,
      quantity: item.quantity || 0,
    })),
  };
}

/**
 * GET /api/analytics/outlet-operations
 *
 * Today's work for an outlet team, for the current Vietnam civil day (#350):
 * RENT orders to hand over, to take back, overdue, no-shows, and due back in the next 3 days
 * (each: count + up to 50 rows), handovers/returns already done today (`doneToday`), and new orders
 * per day for the last 7 days (`newOrdersByDay`, oldest first, counts only).
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
    if (!parsed.success || (parsed.data.timeZone && !isValidTimeZone(parsed.data.timeZone))) {
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
    const { day, soonEnd, tomorrowStart, tomorrowEnd, trendDays, keyOf } = resolveDays(parsed.data.timeZone);
    const ops = await db.outletOperations.get({
      outletIds,
      start: day.start,
      end: day.end,
      soonEnd,
      includeCash,
      trendDays,
      tomorrowStart,
      tomorrowEnd,
    });

    const list = (group: { count: number; orders: OperationsRow[] }, withOverdue = false) => ({
      count: group.count,
      orders: group.orders.map((order) => toRow(order, day.dateKey, keyOf, withOverdue)),
    });
    const optionalList = (group: { count: number; orders: OperationsRow[] } | null | undefined) =>
      group ? list(group) : null;

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_OPERATIONS_SUCCESS', {
        date: day.dateKey,
        outletIds,
        pickupsToday: list(ops.pickupsToday as any),
        returnsToday: list(ops.returnsToday as any),
        overdueReturns: list(ops.overdueReturns as any, true),
        noShows: list(ops.noShows as any),
        returnsSoon: list(ops.returnsSoon as any),
        doneToday: ops.doneToday,
        newOrdersByDay: ops.newOrdersByDay,
        tomorrow: ops.tomorrow,
        tomorrowPickups: optionalList((ops as any).tomorrowPickups),
        tomorrowReturns: optionalList((ops as any).tomorrowReturns),
        cash: ops.cash,
      })
    );
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
