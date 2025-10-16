import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/today-metrics - Get today's operational metrics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Apply role-based filtering (consistent with other APIs)
    let orderWhereClause: any = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    let outletStockWhereClause: any = {};

    if (user.role === 'MERCHANT' && userScope.merchantId) {
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
        outletStockWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
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
          totalOrders: 0,
          activeRentals: 0,
          completedOrders: 0,
          totalRevenue: 0,
          totalStock: 0,
          availableStock: 0,
          rentingStock: 0
        },
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Get today's orders
    const todayOrders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000
    });

    // Calculate metrics
    const totalOrders = todayOrders.total || 0;
    const activeRentals = todayOrders.data?.filter(order => order.status === 'PICKUPED').length || 0;
    const completedOrders = todayOrders.data?.filter(order => order.status === 'COMPLETED').length || 0;
    const totalRevenue = todayOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;

    // Get stock metrics
    const stockMetrics = await db.outletStock.aggregate({
      where: outletStockWhereClause,
      _sum: {
        stock: true,
        available: true,
        renting: true
      }
    });

    const metrics = {
      totalOrders,
      activeRentals,
      completedOrders,
      totalRevenue,
      totalStock: stockMetrics._sum?.stock || 0,
      availableStock: stockMetrics._sum?.available || 0,
      rentingStock: stockMetrics._sum?.renting || 0
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      message: 'Today metrics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching today metrics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';