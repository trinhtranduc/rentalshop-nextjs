import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/growth-metrics - Get growth metrics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
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

    // Build where clause - NO merchantId needed, DB is isolated
    let orderWhereClause: any = {};

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
      }
    }

    // Get current period orders (use provided date range or current month)
    const currentMonthOrders = await db.order.findMany({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: startDateParam ? new Date(startDateParam) : currentMonth,
          lte: currentEnd
        }
      },
      take: 1000
    });

    // Get previous period orders
    const lastMonthOrders = await db.order.findMany({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: lastMonth,
          lte: lastMonthEnd
        }
      },
      take: 1000
    });

    // Calculate growth metrics
    const currentMonthCount = currentMonthOrders.length;
    const lastMonthCount = lastMonthOrders.length;
    const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

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