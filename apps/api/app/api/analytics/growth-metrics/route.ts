import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/growth-metrics - Get growth metrics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Get current month orders
    const currentMonthOrders = await db.orders.search({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: currentMonth
        }
      },
      limit: 1000
    });

    // Get last month orders
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