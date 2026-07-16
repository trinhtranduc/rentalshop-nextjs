import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, calculatePeriodRevenueBatch } from '@rentalshop/utils';
import { API, ORDER_STATUS } from '@rentalshop/constants';

/**
 * GET /api/analytics/growth-metrics - Get growth metrics
 * 
 * Authorization: Roles with 'analytics.view.revenue' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view revenue analytics
 * - OUTLET_STAFF/OUTLET_MANAGER: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  try {
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Use provided dates or default to current month
    const now = new Date();
    let currentMonth: Date;
    let lastMonth: Date;
    let lastMonthEnd: Date;
    
    if (startDateParam && endDateParam) {
      // Use provided date range
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      
      // Current period = provided date range
      currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      
      // Calculate previous period for comparison
      if (start.getMonth() === end.getMonth()) {
        // Same month - compare with last month
        lastMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
        lastMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59);
      } else {
        // Year view - compare with last year same period
        lastMonth = new Date(start.getFullYear() - 1, start.getMonth(), 1);
        lastMonthEnd = new Date(end.getFullYear() - 1, end.getMonth() + 1, 0, 23, 59, 59);
      }
    } else {
      // Default to current month vs last month
      currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }
    
    // Determine the actual end date for current period
    const currentEnd = endDateParam ? new Date(endDateParam + 'T23:59:59') : now;

    // Apply role-based filtering (consistent with other APIs)
    let orderWhereClause: any = {};

    if (user.role === 'MERCHANT' && userScope.merchantId) {
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' || user.role === 'OUTLET_MANAGER') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
      }
    } else if (user.role === 'ADMIN') {
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
          orders: { current: 0, previous: 0, growth: 0 },
          revenue: { current: 0, previous: 0, growth: 0 }
        })
      );
    }

    // Actual start of the current period (respect provided startDate, else first of month)
    const currentStart = startDateParam ? new Date(startDateParam) : currentMonth;

    // ------------------------------------------------------------------
    // ORDER COUNT (by createdAt) — keep the existing definition/semantics.
    // We only need the aggregate count, so limit:1 avoids fetching rows;
    // `.total` is a DB-level count independent of the page size.
    // ------------------------------------------------------------------
    const [currentMonthOrders, lastMonthOrders] = await Promise.all([
      db.orders.search({
        where: { ...orderWhereClause, createdAt: { gte: currentStart, lte: currentEnd } },
        limit: 1
      }),
      db.orders.search({
        where: { ...orderWhereClause, createdAt: { gte: lastMonth, lte: lastMonthEnd } },
        limit: 1
      })
    ]);

    const currentMonthCount = currentMonthOrders.total || 0;
    const lastMonthCount = lastMonthOrders.total || 0;

    // ------------------------------------------------------------------
    // REVENUE — aligned with /api/analytics/income.
    // Revenue must include orders whose *events* (pickup/return/cancel/plan)
    // fall inside the period, even if the order was created before it.
    // Using only createdAt (previous behavior) under-counted revenue for
    // orders created before the period but picked up/returned during it.
    // Same OR-based order set + calculatePeriodRevenueBatch as the income API.
    // ------------------------------------------------------------------
    const revenueSelect = {
      orderType: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      securityDeposit: true,
      damageFee: true,
      createdAt: true,
      pickedUpAt: true,
      returnedAt: true,
      pickupPlanAt: true,
      returnPlanAt: true,
      updatedAt: true
    } as const;

    const fetchPeriodRevenue = async (periodStart: Date, periodEnd: Date): Promise<number> => {
      const dayMs = 24 * 60 * 60 * 1000;
      const where: any = {
        ...orderWhereClause,
        deletedAt: null,
        OR: [
          { createdAt: { gte: periodStart, lte: periodEnd } },
          { pickedUpAt: { gte: new Date(periodStart.getTime() - dayMs), lte: new Date(periodEnd.getTime() + dayMs), not: null } },
          { returnedAt: { gte: new Date(periodStart.getTime() - dayMs), lte: new Date(periodEnd.getTime() + dayMs), not: null } },
          { updatedAt: { gte: periodStart, lte: periodEnd }, status: ORDER_STATUS.CANCELLED as any },
          { pickupPlanAt: { gte: periodStart, lte: periodEnd, not: null } },
          { returnPlanAt: { gte: periodStart, lte: periodEnd, not: null } }
        ]
      };

      const orders = await prisma.order.findMany({ where, select: revenueSelect, take: 10000 });
      const ordersData = orders.map((order: any) => ({
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        securityDeposit: order.securityDeposit || 0,
        damageFee: order.damageFee || 0,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        updatedAt: order.updatedAt
      }));

      const { realIncome } = calculatePeriodRevenueBatch(ordersData, periodStart, periodEnd);
      return realIncome;
    };

    const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
      fetchPeriodRevenue(currentStart, currentEnd),
      fetchPeriodRevenue(lastMonth, lastMonthEnd)
    ]);

    const orderGrowth = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount * 100) : 0;
    const revenueGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    const growthMetrics = {
      orders: {
        current: currentMonthCount,
        previous: lastMonthCount,
        growth: Math.round(orderGrowth * 100) / 100
      },
      revenue: {
        current: currentMonthRevenue,
        previous: lastMonthRevenue,
        growth: Math.round(revenueGrowth * 100) / 100
      }
    };

    return NextResponse.json(
      ResponseBuilder.success('GROWTH_METRICS_SUCCESS', growthMetrics)
    );

  } catch (error) {
    console.error('❌ Error fetching growth metrics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';