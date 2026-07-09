import type { PrismaClient } from '@prisma/client';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { getOrderRevenueEvents } from '../core/revenue-calculator';
import { getUTCDateKey, normalizeDateToISO } from '../core/date';

export interface IncomePeriodOrderCounts {
  new: number;
  pickup: number;
  return: number;
  cancelled: number;
}

export interface IncomePeriodSummary {
  totalDays: number;
  orderCounts: IncomePeriodOrderCounts;
  totalRevenue: number;
  totalActualRevenue: number;
  totalCollateral: number;
  totalCollateralPlanExpectedToRefund: number;
  totalCollateralPlan: number;
  totalRevenuePlan: number;
  totalDepositRefund: number;
}

export interface IncomePeriodDayRow {
  date: string;
  dateISO: string;
  totalRevenue: number;
  depositRefund: number;
  totalCollateral: number;
  totalCollateralPlan: number;
  newOrderCount: number;
  pickupOrderCount: number;
  returnOrderCount: number;
  cancelledOrderCount: number;
}

export interface ComputeIncomePeriodSummaryParams {
  startDate: string;
  endDate: string;
  /** Role-scoped outlet filter, e.g. `{}`, `{ outletId: 1 }`, `{ outletId: { in: [1,2] } }` */
  outletFilter: Record<string, unknown>;
  includeDailyPeriods?: boolean;
}

export interface ComputeIncomePeriodSummaryResult {
  summary: IncomePeriodSummary;
  periods?: IncomePeriodDayRow[];
}

function parsePeriodBounds(startDate: string, endDate: string) {
  const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
  const endOfDayUTC = new Date(endDate + 'T23:59:59.999Z');
  const previousDayStartUTC = new Date(startOfDayUTC);
  previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
  const nextDayEndUTC = new Date(endOfDayUTC);
  nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);

  return {
    queryStart: previousDayStartUTC,
    queryEnd: nextDayEndUTC,
    filterStart: startOfDayUTC,
    filterEnd: endOfDayUTC
  };
}

function withOutletScope(
  base: Record<string, unknown>,
  outletFilter: Record<string, unknown>
): Record<string, unknown> {
  if (!outletFilter || Object.keys(outletFilter).length === 0) {
    return base;
  }
  return { ...base, ...outletFilter };
}

/**
 * Event-based period totals for mobile Overview (operational snapshot + deposit flow).
 * Same logic as GET /api/analytics/income/summary — shared for any date range (day, 7d, 30d, year).
 */
export async function computeIncomePeriodSummary(
  prisma: PrismaClient,
  params: ComputeIncomePeriodSummaryParams
): Promise<ComputeIncomePeriodSummaryResult> {
  const { startDate, endDate, outletFilter, includeDailyPeriods = true } = params;
  const { queryStart, queryEnd, filterStart, filterEnd } = parsePeriodBounds(startDate, endDate);

  const ordersWhereClause = withOutletScope(
    {
      deletedAt: null,
      OR: [
        { createdAt: { gte: queryStart, lte: queryEnd } },
        { pickedUpAt: { gte: queryStart, lte: queryEnd, not: null } },
        { returnedAt: { gte: queryStart, lte: queryEnd, not: null } },
        { AND: [{ status: ORDER_STATUS.CANCELLED }, { updatedAt: { gte: queryStart, lte: queryEnd } }] },
        {
          AND: [
            { orderType: ORDER_TYPE.SALE },
            { status: ORDER_STATUS.COMPLETED },
            { updatedAt: { gte: queryStart, lte: queryEnd } }
          ]
        }
      ]
    },
    outletFilter
  );

  const allOrders = await prisma.order.findMany({
    where: ordersWhereClause as any,
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      securityDeposit: true,
      damageFee: true,
      pickedUpAt: true,
      returnedAt: true,
      createdAt: true,
      updatedAt: true
    },
    take: 10000
  });

  type DailyBucket = IncomePeriodDayRow & { dateObj: Date };

  const dailyDataMap = new Map<string, DailyBucket>();
  const newOrdersCounted = new Set<string>();
  const pickupOrdersCounted = new Set<string>();
  const returnOrdersCounted = new Set<string>();
  const cancelledOrdersCounted = new Set<string>();

  const ensureDay = (date: Date): DailyBucket => {
    const dateKey = getUTCDateKey(date);
    if (!dailyDataMap.has(dateKey)) {
      const dateISO = normalizeDateToISO(date);
      dailyDataMap.set(dateKey, {
        date: dateKey,
        dateISO,
        dateObj: new Date(dateISO),
        totalRevenue: 0,
        depositRefund: 0,
        totalCollateral: 0,
        totalCollateralPlan: 0,
        newOrderCount: 0,
        pickupOrderCount: 0,
        returnOrderCount: 0,
        cancelledOrderCount: 0
      });
    }
    return dailyDataMap.get(dateKey)!;
  };

  for (const order of allOrders) {
    const orderData = {
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      securityDeposit: order.securityDeposit || 0,
      damageFee: order.damageFee || 0,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      pickupPlanAt: null as Date | null,
      returnPlanAt: null as Date | null,
      updatedAt: order.updatedAt
    };

    const revenueEvents = getOrderRevenueEvents(orderData, filterStart, filterEnd);
    for (const event of revenueEvents) {
      if (event.date < filterStart || event.date > filterEnd) continue;
      ensureDay(event.date).totalRevenue += event.revenue;
    }

    if (order.createdAt) {
      const createdDate = new Date(order.createdAt);
      if (createdDate >= filterStart && createdDate <= filterEnd) {
        const dateKey = getUTCDateKey(createdDate);
        const orderKey = `${order.orderNumber}-${dateKey}`;
        if (!newOrdersCounted.has(orderKey) && dailyDataMap.has(dateKey)) {
          const wasCancelledAtCreation =
            order.status === ORDER_STATUS.CANCELLED &&
            (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
          if (!wasCancelledAtCreation) {
            dailyDataMap.get(dateKey)!.newOrderCount += 1;
            newOrdersCounted.add(orderKey);
          }
        }
      }
    }

    if (order.orderType === ORDER_TYPE.RENT) {
      const securityDeposit = order.securityDeposit || 0;
      if (securityDeposit > 0) {
        if (order.status === ORDER_STATUS.RESERVED && order.createdAt) {
          const createdDate = new Date(order.createdAt);
          if (createdDate >= filterStart && createdDate <= filterEnd) {
            const dateKey = getUTCDateKey(createdDate);
            if (dailyDataMap.has(dateKey)) {
              dailyDataMap.get(dateKey)!.depositRefund += securityDeposit;
            }
          }
        }
        if (order.status === ORDER_STATUS.PICKUPED && order.pickedUpAt) {
          const pickedUpDate = new Date(order.pickedUpAt);
          if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
            const dateKey = getUTCDateKey(pickedUpDate);
            if (dailyDataMap.has(dateKey)) {
              dailyDataMap.get(dateKey)!.depositRefund += securityDeposit;
            }
          }
        }
      }
    }

    if (
      order.orderType === ORDER_TYPE.RENT &&
      order.status === ORDER_STATUS.PICKUPED &&
      order.securityDeposit &&
      order.pickedUpAt
    ) {
      const pickedUpDate = new Date(order.pickedUpAt);
      if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
        const dateKey = getUTCDateKey(pickedUpDate);
        if (dailyDataMap.has(dateKey)) {
          dailyDataMap.get(dateKey)!.totalCollateral += order.securityDeposit || 0;
        }
      }
    }

    if (order.pickedUpAt) {
      const pickedUpDate = new Date(order.pickedUpAt);
      if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
        const dateKey = getUTCDateKey(pickedUpDate);
        const orderKey = `pickup-${order.id}-${dateKey}`;
        if (!pickupOrdersCounted.has(orderKey) && dailyDataMap.has(dateKey)) {
          dailyDataMap.get(dateKey)!.pickupOrderCount += 1;
          pickupOrdersCounted.add(orderKey);
        }
      }
    }

    if (order.returnedAt) {
      const returnedDate = new Date(order.returnedAt);
      if (returnedDate >= filterStart && returnedDate <= filterEnd) {
        const dateKey = getUTCDateKey(returnedDate);
        const orderKey = `return-${order.id}-${dateKey}`;
        if (!returnOrdersCounted.has(orderKey) && dailyDataMap.has(dateKey)) {
          dailyDataMap.get(dateKey)!.returnOrderCount += 1;
          returnOrdersCounted.add(orderKey);
        }
      }
    }

    if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
      const updatedDate = new Date(order.updatedAt);
      if (updatedDate >= filterStart && updatedDate <= filterEnd) {
        const dateKey = getUTCDateKey(updatedDate);
        const orderKey = `cancelled-${order.id}-${dateKey}`;
        if (!cancelledOrdersCounted.has(orderKey)) {
          ensureDay(updatedDate).cancelledOrderCount += 1;
          cancelledOrdersCounted.add(orderKey);
        }
      }
    }
  }

  const collateralWhereClause = withOutletScope(
    {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      pickedUpAt: { gte: queryStart, lte: queryEnd, not: null },
      deletedAt: null
    },
    outletFilter
  );

  const collateralOrders = await prisma.order.findMany({
    where: collateralWhereClause as any,
    select: { securityDeposit: true, pickedUpAt: true }
  });

  for (const d of dailyDataMap.values()) d.totalCollateral = 0;
  for (const order of collateralOrders) {
    if (order.pickedUpAt) {
      const dateKey = getUTCDateKey(new Date(order.pickedUpAt));
      if (dailyDataMap.has(dateKey)) {
        dailyDataMap.get(dateKey)!.totalCollateral += order.securityDeposit || 0;
      }
    }
  }

  const collateralPlanWhereClause = withOutletScope(
    {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: { gte: filterStart, lte: filterEnd, not: null },
      deletedAt: null
    },
    outletFilter
  );

  const collateralPlanOrders = await prisma.order.findMany({
    where: collateralPlanWhereClause as any,
    select: { securityDeposit: true, returnPlanAt: true }
  });

  for (const d of dailyDataMap.values()) d.totalCollateralPlan = 0;
  for (const order of collateralPlanOrders) {
    if (order.returnPlanAt) {
      const returnPlanDate = new Date(order.returnPlanAt);
      if (returnPlanDate >= filterStart && returnPlanDate <= filterEnd) {
        ensureDay(returnPlanDate).totalCollateralPlan += order.securityDeposit || 0;
      }
    }
  }

  const now = new Date();
  const revenuePlanWhereClause = withOutletScope(
    {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.RESERVED,
      pickupPlanAt: { gt: now, not: null },
      deletedAt: null
    },
    outletFilter
  );

  const revenuePlanOrders = await prisma.order.findMany({
    where: revenuePlanWhereClause as any,
    select: { totalAmount: true, depositAmount: true }
  });

  const revenuePlanFromReserved = revenuePlanOrders.reduce(
    (sum, o) => sum + Math.max(0, (o.totalAmount || 0) - (o.depositAmount || 0)),
    0
  );

  const refundPlanWhereClause = withOutletScope(
    {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: { gt: now, not: null },
      deletedAt: null
    },
    outletFilter
  );

  const refundPlanOrders = await prisma.order.findMany({
    where: refundPlanWhereClause as any,
    select: { securityDeposit: true }
  });

  const collateralRefundPlan = refundPlanOrders.reduce((sum, o) => sum + (o.securityDeposit || 0), 0);
  const totalRevenuePlan = revenuePlanFromReserved - collateralRefundPlan;

  const dailyDataArray = Array.from(dailyDataMap.values())
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(({ dateObj, ...rest }) => rest);

  const totalRevenue = dailyDataArray.reduce((sum, day) => sum + day.totalRevenue, 0);
  const totalDepositRefund = dailyDataArray.reduce((sum, day) => sum + day.depositRefund, 0);
  const totalCollateral = dailyDataArray.reduce((sum, day) => sum + (day.totalCollateral || 0), 0);
  const totalCollateralPlan = dailyDataArray.reduce((sum, day) => sum + (day.totalCollateralPlan || 0), 0);

  const summary: IncomePeriodSummary = {
    totalDays: dailyDataArray.length,
    orderCounts: {
      new: dailyDataArray.reduce((sum, day) => sum + day.newOrderCount, 0),
      pickup: dailyDataArray.reduce((sum, day) => sum + (day.pickupOrderCount || 0), 0),
      return: dailyDataArray.reduce((sum, day) => sum + (day.returnOrderCount || 0), 0),
      cancelled: dailyDataArray.reduce((sum, day) => sum + (day.cancelledOrderCount || 0), 0)
    },
    totalRevenue,
    totalActualRevenue: totalRevenue - totalDepositRefund,
    totalCollateral,
    totalCollateralPlanExpectedToRefund: totalCollateralPlan,
    totalCollateralPlan,
    totalRevenuePlan,
    totalDepositRefund
  };

  return {
    summary,
    periods: includeDailyPeriods ? dailyDataArray : undefined
  };
}
