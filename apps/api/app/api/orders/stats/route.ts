import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders/stats - Get order statistics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
  console.log(`📊 GET /api/orders/stats - User: ${user.email}, Role: ${user.role}`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined;
    const includeOverdue = searchParams.get('includeOverdue') === 'true';

    // Build filter based on user scope - NO merchantId needed
    const where: any = {};
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletId = user.outletId;
    } else if (outletId && user.role === 'MERCHANT') {
      where.outletId = outletId;
    }

    // Get order statistics using real data
    const totalOrders = await db.order.count({ where });

    const activeRentalsWhere = { ...where, status: 'PICKUPED' };
    const activeRentals = await db.order.count({ where: activeRentalsWhere });

    const completedOrdersWhere = { ...where, status: 'COMPLETED' };
    const completedOrders = await db.order.count({ where: completedOrdersWhere });

    // Get overdue rentals (return date passed but status still PICKUPED)
    const overdueWhere = { 
      ...where, 
      status: 'PICKUPED',
      returnPlanAt: { lt: new Date() }
    };
    const overdueOrders = await db.order.findMany({
      where: overdueWhere,
      take: 100
    });
    const overdueRentals = overdueOrders;

    // Calculate revenue and average order value
    const completedOrdersQuery = await db.order.findMany({
      where: { ...where, status: { in: ['COMPLETED', 'RETURNED'] } },
      take: 1000
    });
    
    const totalRevenue = completedOrdersQuery.reduce((sum: number, order: any) => 
      sum + (order.totalAmount || 0), 0
    );
    
    const averageOrderValue = completedOrdersQuery.length > 0 
      ? totalRevenue / completedOrdersQuery.length 
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