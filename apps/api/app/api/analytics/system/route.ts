import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/system - Get system analytics for tenant
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: This provides tenant-level analytics, not system-wide
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`🔧 GET /api/analytics/system - User: ${user.email}`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    // Set default date range if not provided (current month)
    let dateStart: Date;
    let dateEnd: Date;
    
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build where clause - NO merchantId needed, DB is isolated
    let orderWhereClause: any = {
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
      }
    }

    // Fetch tenant metrics in parallel
    const [
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue
    ] = await Promise.all([
      // Total outlets
      db.outlet.count({ where: { isActive: true } }),
      
      // Total users
      db.user.count({ where: { isActive: true } }),
      
      // Total products
      db.product.count({ where: { isActive: true } }),
      
      // Total customers
      db.customer.count({ where: { isActive: true } }),
      
      // Total orders
      db.order.count(),
      
      // Revenue in date range
      db.order.aggregate({
        where: orderWhereClause,
        _sum: { totalAmount: true }
      })
    ]);

    // Get order trends based on groupBy parameter
    const orderTrends = [];
    
    if (groupBy === 'month') {
      // Generate trends for each month in the date range
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const monthOrderWhereClause = {
          ...orderWhereClause,
          createdAt: { gte: monthStart, lte: monthEnd }
        };
        
        const newOrders = await db.order.count({
          where: monthOrderWhereClause
        });
        
        const totalOrdersByMonth = await db.order.count({
          where: {
            createdAt: { lte: monthEnd },
            ...(user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' 
              ? { outletId: user.outletId } 
              : {})
          }
        });
        
        orderTrends.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          newOrders,
          totalOrders: totalOrdersByMonth
        });
        
        current.setMonth(current.getMonth() + 1);
      }
    } else if (groupBy === 'day') {
      // Generate trends for each day in the date range
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        
        const dayOrderWhereClause = {
          ...orderWhereClause,
          createdAt: { gte: dayStart, lte: dayEnd }
        };
        
        const newOrders = await db.order.count({
          where: dayOrderWhereClause
        });
        
        const totalOrdersByDay = await db.order.count({
          where: {
            createdAt: { lte: dayEnd },
            ...(user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' 
              ? { outletId: user.outletId } 
              : {})
          }
        });
        
        orderTrends.push({
          month: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          newOrders,
          totalOrders: totalOrdersByDay
        });
        
        current.setDate(current.getDate() + 1);
      }
    }

    const systemMetrics = {
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue: totalRevenue?._sum?.totalAmount || 0,
      orderTrends
    };

    return NextResponse.json(
      ResponseBuilder.success('SYSTEM_ANALYTICS_SUCCESS', systemMetrics)
    );

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_SYSTEM_ANALYTICS_FAILED'),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
