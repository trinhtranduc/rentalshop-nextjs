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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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
    } else if (user.role !== 'ADMIN') {
      // New users without merchant/outlet assignment should see no data
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
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }
    // ADMIN users see all data (no additional filtering)

    // Get today's orders
    const todayOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: { gte: today }
      },
      limit: 1000
    });

    // Get this month's orders
    const thisMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: { gte: thisMonth }
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
      message: 'Enhanced dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';