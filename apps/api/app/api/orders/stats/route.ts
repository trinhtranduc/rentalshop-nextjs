import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/orders/stats - Get order statistics
 * 
 * Authorization: All roles with 'orders.view' or 'analytics.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF (via orders.view)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * NOTE: Database functions getOrderStats and getOverdueRentals not implemented - using placeholders
 */
export const GET = withPermissions(['orders.view', 'analytics.view'])(async (request, { user, userScope }) => {
  console.log(`📊 GET /api/orders/stats - User: ${user.email}, Role: ${user.role}`);
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined;
    const includeOverdue = searchParams.get('includeOverdue') === 'true';

    // Build filter based on user scope
    const filters: any = {};
    if (userScope.outletId) {
      filters.outletId = userScope.outletId;
    } else if (userScope.merchantId) {
      filters.merchantId = userScope.merchantId;
    }
    if (outletId && user.role === USER_ROLE.ADMIN) {
      filters.outletId = outletId;
    }

    // Get order statistics using real data
    const totalOrdersResult = await db.orders.search({ ...filters, limit: 1 });
    const totalOrders = totalOrdersResult.total;

    const activeRentalsResult = await db.orders.search({ 
      ...filters, 
      status: ORDER_STATUS.PICKUPED,
      limit: 1 
    });
    const activeRentals = activeRentalsResult.total;

    const completedOrdersResult = await db.orders.search({ 
      ...filters, 
      status: ORDER_STATUS.COMPLETED,
      limit: 1 
    });
    const completedOrders = completedOrdersResult.total;

    // Get overdue rentals (return date passed but status still PICKUPED)
    // ✅ Fix: Ensure returnPlanAt is not null and compare with start of today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // ✅ Build where clause with returnPlanAt filter
    const overdueWhere: any = {
      ...filters,
      status: ORDER_STATUS.PICKUPED,
      returnPlanAt: {
        not: null,
        lt: startOfToday
      }
    };
    const overdueResult = await db.orders.search({ 
      where: overdueWhere,
      limit: 100 // Get actual overdue orders
    });
    const overdueRentals = overdueResult.data;

    // Calculate revenue and average order value
    // ✅ Exclude CANCELLED orders from revenue calculation
    // Only count COMPLETED and RETURNED orders (which automatically excludes CANCELLED)
    const allOrdersResult = await db.orders.search({ 
      ...filters, 
      status: { in: [ORDER_STATUS.COMPLETED as any, ORDER_STATUS.RETURNED as any] },
      limit: 1000 // Get recent completed orders for calculation
    });
    
    const totalRevenue = allOrdersResult.data.reduce((sum: number, order: any) => 
      sum + (order.totalAmount || 0), 0
    );
    
    const averageOrderValue = allOrdersResult.data.length > 0 
      ? totalRevenue / allOrdersResult.data.length 
      : 0;

    const stats = {
      totalOrders,
      activeRentals,
      completedOrders,
      overdueRentals: overdueRentals.length,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    };

    let overdueRentalsData: any[] = [];
    if (includeOverdue) {
      overdueRentalsData = overdueRentals;
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        overdueRentals: overdueRentalsData,
      }
    });

  } catch (error) {
    console.error('Error getting order stats:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}); 
