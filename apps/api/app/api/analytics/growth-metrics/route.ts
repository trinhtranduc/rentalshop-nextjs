import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/growth-metrics - Get growth metrics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
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
      return NextResponse.json({
        success: true,
        data: {
          orders: { current: 0, previous: 0, growth: 0 },
          revenue: { current: 0, previous: 0, growth: 0 }
        },
        code: 'NO_DATA_AVAILABLE',
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Get current period orders (use provided date range or current month)
    const currentMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: startDateParam ? new Date(startDateParam) : currentMonth,
          lte: currentEnd
        }
      },
      limit: 1000
    });

    // Get previous period orders
    const lastMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: lastMonth,
          lte: lastMonthEnd
        }
      },
      limit: 1000
    });

    // Calculate growth metrics
    const currentMonthCount = currentMonthOrders.total || 0;
    const lastMonthCount = lastMonthOrders.total || 0;
    const currentMonthRevenue = currentMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;

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

    return NextResponse.json({
      success: true,
      data: growthMetrics,
      code: 'GROWTH_METRICS_SUCCESS',
        message: 'Growth metrics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching growth metrics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';