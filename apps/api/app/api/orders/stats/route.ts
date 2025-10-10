import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/orders/stats - Get order statistics
 * REFACTORED: Now uses unified withAuthRoles pattern for all business roles
 * NOTE: Database functions getOrderStats and getOverdueRentals not implemented - using placeholders
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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
    if (outletId && user.role === 'ADMIN') {
      filters.outletId = outletId;
    }

    // Get order statistics using real data
    const totalOrdersResult = await db.orders.search({ ...filters, limit: 1 });
    const totalOrders = totalOrdersResult.total;

    const activeRentalsResult = await db.orders.search({ 
      ...filters, 
      status: 'PICKUPED',
      limit: 1 
    });
    const activeRentals = activeRentalsResult.total;

    const completedOrdersResult = await db.orders.search({ 
      ...filters, 
      status: 'COMPLETED',
      limit: 1 
    });
    const completedOrders = completedOrdersResult.total;

    // Get overdue rentals (return date passed but status still PICKUPED)
    const overdueResult = await db.orders.search({ 
      ...filters, 
      status: 'PICKUPED',
      returnPlanAt: { lt: new Date() },
      limit: 100 // Get actual overdue orders
    });
    const overdueRentals = overdueResult.data;

    // Calculate revenue and average order value
    const allOrdersResult = await db.orders.search({ 
      ...filters, 
      status: { in: ['COMPLETED', 'RETURNED'] },
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