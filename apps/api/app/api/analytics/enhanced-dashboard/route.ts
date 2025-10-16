import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/enhanced-dashboard - Get comprehensive dashboard analytics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Use provided dates or default to today/thisMonth
    const now = new Date();
    let today: Date;
    let thisMonth: Date;
    let lastMonth: Date;
    let lastMonthEnd: Date;
    
    if (startDateParam && endDateParam) {
      // Use provided date range
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      
      // For "today" view (same start and end date)
      today = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      // For "month" or "year" view
      thisMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endDate = new Date(end);
      
      // Calculate last period for comparison
      if (start.getMonth() === end.getMonth()) {
        // Same month - compare with last month
        lastMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
        lastMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59);
      } else {
        // Year view - compare with last year
        lastMonth = new Date(start.getFullYear() - 1, 0, 1);
        lastMonthEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59);
      }
    } else {
      // Default to current dates
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

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
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
        paymentWhereClause.order = { outletId: outlet.id };
        customerWhereClause.merchantId = outlet.merchantId;
        outletStockWhereClause.outletId = outlet.id;
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
          today: { orders: 0, revenue: 0 },
          thisMonth: { orders: 0, revenue: 0 },
          activeRentals: 0,
          stock: { total: 0, available: 0, renting: 0 },
          growth: { revenue: 0 }
        },
        code: 'NO_DATA_AVAILABLE', message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Determine date range based on parameters
    const start = startDateParam ? new Date(startDateParam) : today;
    const end = endDateParam ? new Date(endDateParam + 'T23:59:59') : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
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

    // Get active rentals
    const activeRentals = await db.orders.search({
      where: {
        ...orderWhereClause,
        status: 'PICKUPED'
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

    // Calculate metrics
    const todayRevenue = todayOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
    const thisMonthRevenue = thisMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;

    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    // Debug logs to trace the issue
    console.log('🔍 Enhanced Dashboard Debug:', {
      dateRange: { start, end },
      todayOrdersTotal: todayOrders.total,
      todayOrdersDataLength: todayOrders.data?.length,
      todayRevenue,
      thisMonthOrdersTotal: thisMonthOrders.total,
      thisMonthOrdersDataLength: thisMonthOrders.data?.length,
      thisMonthRevenue,
      activeRentalsTotal: activeRentals.total
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
      activeRentals: activeRentals.total || 0,
      stock: {
        total: stockMetrics._sum?.stock || 0,
        available: stockMetrics._sum?.available || 0,
        renting: stockMetrics._sum?.renting || 0
      },
      growth: {
        revenue: Math.round(revenueGrowth * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      code: 'DASHBOARD_DATA_SUCCESS', message: 'Enhanced dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';