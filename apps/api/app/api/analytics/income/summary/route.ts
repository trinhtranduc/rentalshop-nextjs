import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey, getOrderRevenueEvents } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income/summary
 * Total theo kỳ (startDate–endDate) + breakdown theo ngày. Không trả list order.
 * Logic tính toán giống income/daily (getOrderRevenueEvents, collateral, revenuePlan).
 */
export const GET = withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), { status: API.STATUS.BAD_REQUEST });
    }

    const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
    const endOfDayUTC = new Date(endDate + 'T23:59:59.999Z');
    const previousDayStartUTC = new Date(startOfDayUTC);
    previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
    const nextDayEndUTC = new Date(endOfDayUTC);
    nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);
    const queryStart = previousDayStartUTC;
    const queryEnd = nextDayEndUTC;
    const filterStart = startOfDayUTC;
    const filterEnd = endOfDayUTC;

    if (isNaN(filterStart.getTime()) || isNaN(filterEnd.getTime())) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), { status: API.STATUS.BAD_REQUEST });
    }
    if (filterStart > filterEnd) {
      return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: API.STATUS.BAD_REQUEST });
    }

    const ordersWhereClause: any = {
      deletedAt: null,
      OR: [
        { createdAt: { gte: queryStart, lte: queryEnd } },
        { pickedUpAt: { gte: queryStart, lte: queryEnd, not: null } },
        { returnedAt: { gte: queryStart, lte: queryEnd, not: null } },
        { AND: [{ status: ORDER_STATUS.CANCELLED }, { updatedAt: { gte: queryStart, lte: queryEnd } }] },
        { AND: [{ orderType: ORDER_TYPE.SALE }, { status: ORDER_STATUS.COMPLETED }, { updatedAt: { gte: queryStart, lte: queryEnd } }] }
      ]
    };
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) ordersWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) ordersWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }

    const allOrders = await prisma.order.findMany({
      where: ordersWhereClause,
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

    const dailyDataMap = new Map<string, {
      date: string;
      dateISO: string;
      dateObj: Date;
      totalRevenue: number;
      depositRefund: number;
      totalCollateral: number;
      totalCollateralPlan: number;
      newOrderCount: number;
      pickupOrderCount: number;
      returnOrderCount: number;
      cancelledOrderCount: number;
    }>();

    const newOrdersCounted = new Set<string>();
    const pickupOrdersCounted = new Set<string>();
    const returnOrdersCounted = new Set<string>();
    const cancelledOrdersCounted = new Set<string>();

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
        const dateKey = getUTCDateKey(event.date);
        const dateISO = normalizeDateToISO(event.date);
        const dateObj = new Date(dateISO);
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, {
            date: dateKey,
            dateISO,
            dateObj,
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
        const dailyData = dailyDataMap.get(dateKey)!;
        dailyData.totalRevenue += event.revenue;
      }

      if (order.createdAt) {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= filterStart && createdDate <= filterEnd) {
          const dateKey = getUTCDateKey(createdDate);
          const orderKey = `${order.orderNumber}-${dateKey}`;
          if (!newOrdersCounted.has(orderKey) && dailyDataMap.has(dateKey)) {
            const dailyData = dailyDataMap.get(dateKey)!;
            const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED &&
              (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
            if (!wasCancelledAtCreation) {
              dailyData.newOrderCount += 1;
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
              if (dailyDataMap.has(dateKey)) dailyDataMap.get(dateKey)!.depositRefund += securityDeposit;
            }
          }
          if (order.status === ORDER_STATUS.PICKUPED && order.pickedUpAt) {
            const pickedUpDate = new Date(order.pickedUpAt);
            if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
              const dateKey = getUTCDateKey(pickedUpDate);
              if (dailyDataMap.has(dateKey)) dailyDataMap.get(dateKey)!.depositRefund += securityDeposit;
            }
          }
        }
      }

      if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED && order.securityDeposit && order.pickedUpAt) {
        const pickedUpDate = new Date(order.pickedUpAt);
        if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
          const dateKey = getUTCDateKey(pickedUpDate);
          if (dailyDataMap.has(dateKey)) dailyDataMap.get(dateKey)!.totalCollateral += (order.securityDeposit || 0);
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
            if (!dailyDataMap.has(dateKey)) {
              dailyDataMap.set(dateKey, {
                date: dateKey,
                dateISO: normalizeDateToISO(updatedDate),
                dateObj: new Date(normalizeDateToISO(updatedDate)),
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
            dailyDataMap.get(dateKey)!.cancelledOrderCount += 1;
            cancelledOrdersCounted.add(orderKey);
          }
        }
      }
    }

    const collateralWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      pickedUpAt: { gte: queryStart, lte: queryEnd, not: null },
      deletedAt: null
    };
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) collateralWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) collateralWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }
    const collateralOrders = await prisma.order.findMany({
      where: collateralWhereClause,
      select: { securityDeposit: true, pickedUpAt: true }
    });
    for (const d of dailyDataMap.values()) d.totalCollateral = 0;
    for (const order of collateralOrders) {
      if (order.pickedUpAt) {
        const dateKey = getUTCDateKey(new Date(order.pickedUpAt));
        if (dailyDataMap.has(dateKey)) dailyDataMap.get(dateKey)!.totalCollateral += (order.securityDeposit || 0);
      }
    }

    // Tiền thế chân dự kiến trả trong tương lai = đơn đang thuê (PICKUPED) có lịch trả hàng (returnPlanAt) trong kỳ
    const collateralPlanWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: { gte: filterStart, lte: filterEnd, not: null },
      deletedAt: null
    };
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) collateralPlanWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) collateralPlanWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }
    const collateralPlanOrders = await prisma.order.findMany({
      where: collateralPlanWhereClause,
      select: { securityDeposit: true, returnPlanAt: true }
    });
    for (const d of dailyDataMap.values()) d.totalCollateralPlan = 0;
    for (const order of collateralPlanOrders) {
      if (order.returnPlanAt) {
        const returnPlanDate = new Date(order.returnPlanAt);
        if (returnPlanDate >= filterStart && returnPlanDate <= filterEnd) {
          const dateKey = getUTCDateKey(returnPlanDate);
          if (!dailyDataMap.has(dateKey)) {
            dailyDataMap.set(dateKey, {
              date: dateKey,
              dateISO: normalizeDateToISO(returnPlanDate),
              dateObj: new Date(normalizeDateToISO(returnPlanDate)),
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
          dailyDataMap.get(dateKey)!.totalCollateralPlan += (order.securityDeposit || 0);
        }
      }
    }

    const now = new Date();
    const revenuePlanWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.RESERVED,
      pickupPlanAt: { gt: now, not: null },
      deletedAt: null
    };
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) revenuePlanWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) revenuePlanWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }
    const revenuePlanOrders = await prisma.order.findMany({
      where: revenuePlanWhereClause,
      select: { totalAmount: true, depositAmount: true }
    });
    const revenuePlanFromReserved = revenuePlanOrders.reduce(
      (sum, o) => sum + Math.max(0, (o.totalAmount || 0) - (o.depositAmount || 0)),
      0
    );
    const refundPlanWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: { gt: now, not: null },
      deletedAt: null
    };
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) refundPlanWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) refundPlanWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }
    const refundPlanOrders = await prisma.order.findMany({
      where: refundPlanWhereClause,
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

    return NextResponse.json(
      ResponseBuilder.success('INCOME_SUMMARY_SUCCESS', {
        startDate,
        endDate,
        summary: {
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
        },
        periods: dailyDataArray
      })
    );
  } catch (error) {
    console.error('Error fetching income summary:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
