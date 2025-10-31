import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PerformanceMonitor } from '@rentalshop/utils/src/performance';

/**
 * GET /api/orders/statistics
 * Get order statistics for dashboard (optimized aggregation)
 */
export const GET = withReadOnlyAuth(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/orders/statistics - User: ${user.email} (${user.role})`);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters = {
      merchantId: userScope.merchantId,
      outletId: user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' ? userScope.outletId : undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    };

    console.log('🔍 Statistics filters:', filters);
    
    // Use performance monitoring for query optimization
    const result = await PerformanceMonitor.measureQuery(
      'orders.getStatistics',
      () => db.orders.getStatistics(filters)
    );
    
    console.log('✅ Statistics completed:', {
      totalOrders: result.totalOrders,
      totalRevenue: result.totalRevenue,
      statusBreakdown: result.statusBreakdown
    });

    return NextResponse.json({
      success: true,
      data: result,
      code: "STATISTICS_FOUND", 
      message: "Order statistics retrieved successfully"
    });

  } catch (error) {
    console.error('Error in GET /api/orders/statistics:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
