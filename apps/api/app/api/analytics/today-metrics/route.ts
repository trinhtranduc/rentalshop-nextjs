import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, calculateOrderRevenueByStatus } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/today-metrics - Get today's operational metrics
 * 
 * Authorization: Roles with 'analytics.view.dashboard' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Full analytics access
 * - OUTLET_STAFF: Dashboard only (daily/today metrics)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.dashboard'])(async (request, { user, userScope }) => {
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

    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
        outletStockWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
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
          totalOrders: 0,
          activeRentals: 0,
          completedOrders: 0,
          totalRevenue: 0,
          totalStock: 0,
          availableStock: 0,
          rentingStock: 0
        })
      );
    }

    // Get today's orders
    const todayOrders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000
    });

    // Calculate metrics using calculateOrderRevenueByStatus (single source of truth)
    const totalOrders = todayOrders.total || 0;
    const activeRentals = todayOrders.data?.filter(order => order.status === ORDER_STATUS.PICKUPED).length || 0;
    const completedOrders = todayOrders.data?.filter(order => order.status === ORDER_STATUS.COMPLETED).length || 0;
    
    const totalRevenue = (todayOrders.data || []).reduce((sum: number, order: any) => {
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
        updatedAt: order.updatedAt
      };
      return sum + calculateOrderRevenueByStatus(orderData);
    }, 0);

    // Get stock metrics
    const stockMetrics = await db.outletStock.aggregate({
      where: outletStockWhereClause,
      _sum: {
        stock: true,
        available: true,
        renting: true
      }
    });

    // Get overdue rentals (status PICKUPED but returnPlanAt has passed)
    // Overdue = returnPlanAt < now (current time)
    // Note: Overdue orders can be created at any time, not just today
    // So we don't include createdAt filter from orderWhereClause
    const now = new Date();
    const overdueWhereClause: any = {
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: {
        not: null,
        lt: now // Compare with current time, not start of today
      }
    };
    
    // Apply role-based filtering (merchant/outlet scope) but NOT date filter
    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        overdueWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        overdueWhereClause.outletId = outlet.id;
      }
    }
    // ADMIN users see all overdue orders (no additional filtering)
    
    const overdueOrders = await db.orders.search({
      where: overdueWhereClause,
      limit: 1000
    });

    const metrics = {
      totalOrders,
      activeRentals,
      completedOrders,
      totalRevenue,
      overdueItems: overdueOrders.total || 0,
      totalStock: stockMetrics._sum?.stock || 0,
      availableStock: stockMetrics._sum?.available || 0,
      rentingStock: stockMetrics._sum?.renting || 0
    };

    return NextResponse.json(
      ResponseBuilder.success('TODAY_METRICS_SUCCESS', metrics)
    );

  } catch (error) {
    console.error('❌ Error fetching today metrics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';