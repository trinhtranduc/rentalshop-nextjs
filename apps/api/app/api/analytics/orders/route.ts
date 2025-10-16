import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/orders - Get order analytics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'month'; // month or day
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
        data: [],
        code: 'NO_DATA_AVAILABLE', message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Add date filtering if provided
    if (startDate || endDate) {
      orderWhereClause.createdAt = {};
      if (startDate) orderWhereClause.createdAt.gte = new Date(startDate);
      if (endDate) orderWhereClause.createdAt.lte = new Date(endDate);
    }

    // Get orders based on user scope
    const orders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000 // Get enough orders to analyze
    });

    // Group orders by time period
    const groupedOrders: { [key: string]: number } = {};
    
    orders.data?.forEach(order => {
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

    return NextResponse.json({
      success: true,
      data: analyticsData,
      code: 'ORDER_ANALYTICS_SUCCESS', message: 'Order analytics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching order analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';