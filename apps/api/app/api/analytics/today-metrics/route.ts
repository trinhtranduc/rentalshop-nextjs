import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/today-metrics - Get today's operational metrics
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
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Build where clause - NO merchantId needed, DB is isolated
    let orderWhereClause: any = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    let outletStockWhereClause: any = {};

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
        outletStockWhereClause.outletId = user.outletId;
      }
    }

    // Get today's orders
    const todayOrders = await db.order.findMany({
      where: orderWhereClause,
      take: 1000
    });

    // Calculate metrics
    const totalOrders = todayOrders.length;
    const activeRentals = todayOrders.filter(order => order.status === 'PICKUPED').length;
    const completedOrders = todayOrders.filter(order => order.status === 'COMPLETED').length;
    const totalRevenue = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Get stock metrics
    const stockMetrics = await db.outletStock.aggregate({
      where: outletStockWhereClause,
      _sum: {
        stock: true,
        available: true,
        renting: true
      }
    }).catch(() => ({
      _sum: {
        stock: 0,
        available: 0,
        renting: 0
      }
    }));

    // Get overdue rentals (status PICKUPED but returnPlanAt < now)
    const now = new Date();
    const overdueWhereClause = {
      ...orderWhereClause,
      status: 'PICKUPED',
      returnPlanAt: { lt: now }
    };
    const overdueOrders = await db.order.count({
      where: overdueWhereClause
    });

    const metrics = {
      totalOrders,
      activeRentals,
      completedOrders,
      totalRevenue,
      overdueItems: overdueOrders,
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