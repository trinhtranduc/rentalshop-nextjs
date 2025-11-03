import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/orders - Get order analytics
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'month'; // month or day
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause - NO merchantId needed, DB is isolated
    let orderWhereClause: any = {};

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
      }
    }

    // Add date filtering if provided
    if (startDate || endDate) {
      orderWhereClause.createdAt = {};
      if (startDate) orderWhereClause.createdAt.gte = new Date(startDate);
      if (endDate) orderWhereClause.createdAt.lte = new Date(endDate);
    }

    // Get orders based on user scope
    const orders = await db.order.findMany({
      where: orderWhereClause,
      take: 1000 // Get enough orders to analyze
    });

    // Group orders by time period
    const groupedOrders: { [key: string]: number } = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }
      
      groupedOrders[key] = (groupedOrders[key] || 0) + 1;
    });

    // Convert to array format
    const analyticsData = Object.entries(groupedOrders).map(([period, count]) => ({
      period,
      count
    })).sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json(
      ResponseBuilder.success('ORDER_ANALYTICS_SUCCESS', analyticsData)
    );

  } catch (error) {
    console.error('❌ Error fetching order analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});