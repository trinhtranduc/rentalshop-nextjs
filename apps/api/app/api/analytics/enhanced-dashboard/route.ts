import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import {
  handleApiError,
  ResponseBuilder,
  calculatePeriodRevenueBatch,
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  getUtcRangeForDateKeys,
  toDateKeyInTimeZone,
} from '@rentalshop/utils';
import { API, USER_ROLE, ORDER_STATUS, isOutletRole } from '@rentalshop/constants';
import { readAnalyticsTimeZone } from '../../../../lib/analytics-days';

/**
 * GET /api/analytics/enhanced-dashboard - Get comprehensive dashboard analytics
 * 
 * Authorization: Roles with 'analytics.view.dashboard' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Full analytics access
 * - OUTLET_STAFF: Dashboard only (daily/today metrics)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.dashboard'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Days are civil days of the shop (Asia/Ho_Chi_Minh) or of a valid `timeZone` param (#355).
    // `new Date('2026-10-02')` / local-midnight math used the server zone and missed orders made before 7 am.
    const timeZone = readAnalyticsTimeZone(searchParams);
    if (!timeZone) {
      return NextResponse.json(ResponseBuilder.error('INVALID_QUERY'), { status: API.STATUS.BAD_REQUEST });
    }
    const todayKey = formatDateKeyInTimeZone(new Date(), timeZone);
    const startKey = startDateParam ? toDateKeyInTimeZone(startDateParam, timeZone) : todayKey;
    const endKey = endDateParam ? toDateKeyInTimeZone(endDateParam, timeZone) : startDateParam ? startKey : todayKey;
    if (!startKey || !endKey || startKey > endKey) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), { status: API.STATUS.BAD_REQUEST });
    }
    const { start, end } = getUtcRangeForDateKeys({ from: startKey, to: endKey }, timeZone);

    // Comparison period: the previous month for a range inside one month, else the previous year
    const isSameMonth = startKey.slice(0, 7) === endKey.slice(0, 7);
    const startYear = Number(startKey.slice(0, 4));
    const previousPeriod = isSameMonth
      ? (() => {
          const prevMonthLastKey = addDaysToDateKey(`${startKey.slice(0, 7)}-01`, -1);
          return { from: `${prevMonthLastKey.slice(0, 7)}-01`, to: prevMonthLastKey };
        })()
      : { from: `${startYear - 1}-01-01`, to: `${startYear - 1}-12-31` };
    const { start: lastMonth, end: lastMonthEnd } = getUtcRangeForDateKeys(previousPeriod, timeZone);

    // Apply role-based filtering (consistent with other APIs)
    let orderWhereClause: any = {};
    let paymentWhereClause: any = {};
    let customerWhereClause: any = {};
    let outletStockWhereClause: any = {};

    if (user.role === 'MERCHANT' && userScope.merchantId) {
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
        paymentWhereClause.order = { outletId: { in: merchant.outlets.map(outlet => outlet.id) } };
        customerWhereClause.merchantId = merchant.id;
        outletStockWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if (isOutletRole(user.role) && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
        paymentWhereClause.order = { outletId: outlet.id };
        customerWhereClause.merchantId = outlet.merchantId;
        outletStockWhereClause.outletId = outlet.id;
      }
    } else if (user.role === USER_ROLE.ADMIN) {
      // ADMIN users see all data (system-wide access)
      // No additional filtering needed for ADMIN role
      console.log('✅ ADMIN user accessing all system data:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
    } else {
      // All other users without merchant/outlet assignment should see no data
      console.log('🚫 User without merchant/outlet assignment:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
      return NextResponse.json(
        ResponseBuilder.success('NO_DATA_AVAILABLE', {
          today: { orders: 0, revenue: 0 },
          thisMonth: { orders: 0, revenue: 0 },
          activeRentals: 0,
          stock: { total: 0, available: 0, renting: 0 },
          growth: { revenue: 0 }
        })
      );
    }

    // Get today's orders (for startDate to endDate range)
    const todayOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: { gte: start, lte: end }
      },
      limit: 1000
    });

    // Get this month/period's orders (same as today for the provided range)
    const thisMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: { gte: start, lte: end }
      },
      limit: 1000
    });

    // Get last month's orders
    const lastMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: { gte: lastMonth, lte: lastMonthEnd }
      },
      limit: 1000
    });

    // Get active rentals - Orders that are currently being rented out
    // This includes ALL orders with status PICKUPED (regardless of when they were picked up)
    // This makes business sense because:
    // - User wants to know total active rentals across all time
    // - Not just rentals that started today
    const activeRentals = await db.orders.search({
      where: {
        ...orderWhereClause,
        status: ORDER_STATUS.PICKUPED
      },
      limit: 1000
    });
    
    // Get today's pickups - Orders that were picked up TODAY
    const todayPickups = await db.orders.search({
      where: {
        ...orderWhereClause,
        status: ORDER_STATUS.PICKUPED,
        // Picked up inside the civil days of the range (#594: no upper bound counted later days too)
        pickedUpAt: {
          gte: start,
          lte: end
        }
      },
      limit: 1000
    });

    // Get stock metrics
    const stockMetrics = await db.outletStock.aggregate({
      where: outletStockWhereClause,
      _sum: {
        stock: true,
        available: true,
        renting: true
      }
    });

    // Calculate metrics using calculatePeriodRevenueBatch (single source of truth)
    // Prepare order data for revenue calculator
    const todayOrdersData = (todayOrders.data || []).map((order: any) => ({
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      securityDeposit: order.securityDeposit || 0,
      damageFee: order.damageFee || 0,
      lateFee: order.lateFee || 0,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      updatedAt: order.updatedAt
    }));

    const thisMonthOrdersData = (thisMonthOrders.data || []).map((order: any) => ({
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      securityDeposit: order.securityDeposit || 0,
      damageFee: order.damageFee || 0,
      lateFee: order.lateFee || 0,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      updatedAt: order.updatedAt
    }));

    const lastMonthOrdersData = (lastMonthOrders.data || []).map((order: any) => ({
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      securityDeposit: order.securityDeposit || 0,
      damageFee: order.damageFee || 0,
      lateFee: order.lateFee || 0,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      updatedAt: order.updatedAt
    }));

    // Calculate revenue for each period
    const { realIncome: todayRevenue } = calculatePeriodRevenueBatch(todayOrdersData, start, end);
    const { realIncome: thisMonthRevenue } = calculatePeriodRevenueBatch(thisMonthOrdersData, start, end);
    const { realIncome: lastMonthRevenue } = calculatePeriodRevenueBatch(lastMonthOrdersData, lastMonth, lastMonthEnd);

    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    // Calculate orders growth - compare total orders between this month and last month
    const thisMonthOrdersCount = thisMonthOrders.total || 0;
    const lastMonthOrdersCount = lastMonthOrders.total || 0;
    const ordersGrowth = lastMonthOrdersCount > 0 ? ((thisMonthOrdersCount - lastMonthOrdersCount) / lastMonthOrdersCount * 100) : (thisMonthOrdersCount > 0 ? 100 : 0);

    // Debug logs to trace the issue
    console.log('🔍 Enhanced Dashboard Debug:', {
      dateRange: { start, end },
      todayOrdersTotal: todayOrders.total,
      todayOrdersDataLength: todayOrders.data?.length,
      todayRevenue,
      thisMonthOrdersTotal: thisMonthOrders.total,
      thisMonthOrdersDataLength: thisMonthOrders.data?.length,
      thisMonthRevenue,
      lastMonthOrdersTotal: lastMonthOrders.total,
      lastMonthOrdersDataLength: lastMonthOrders.data?.length,
      lastMonthRevenue,
      thisMonthOrdersCount,
      lastMonthOrdersCount,
      revenueGrowth,
      ordersGrowth,
      activeRentalsTotal: activeRentals.total,
      timeZone,
      periodType: isSameMonth ? 'month' : 'year',
      comparisonPeriod: isSameMonth ? 'last month' : 'last year'
    });

    const dashboardData = {
      today: {
        orders: todayOrders.total || 0,
        revenue: todayRevenue
      },
      thisMonth: {
        orders: thisMonthOrders.total || 0,
        revenue: thisMonthRevenue
      },
      activeRentals: activeRentals.total || 0,  // Total active rentals (all time)
      todayPickups: todayPickups.total || 0,    // Rentals picked up today
      stock: {
        total: stockMetrics._sum?.stock || 0,
        available: stockMetrics._sum?.available || 0,
        renting: stockMetrics._sum?.renting || 0
      },
      growth: {
        revenue: Math.round(revenueGrowth * 100) / 100,
        orders: Math.round(ordersGrowth * 100) / 100
      }
    };

    return NextResponse.json(
      ResponseBuilder.success('DASHBOARD_DATA_SUCCESS', dashboardData)
    );

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';