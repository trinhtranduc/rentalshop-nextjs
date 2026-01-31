import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PerformanceMonitor } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/orders/statistics
 * Get order statistics for dashboard (optimized aggregation)
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withReadOnlyAuth(async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse query parameters
      const filters = {
        merchantId: userScope.merchantId,
        outletId: user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' ? userScope.outletId : undefined,
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
      };
      
      // Use performance monitoring for query optimization
      const result = await PerformanceMonitor.measureQuery(
        'orders.getStatistics',
        () => db.orders.getStatistics(filters)
      );

      return NextResponse.json({
        success: true,
        data: result,
        code: "STATISTICS_FOUND", 
        message: "Order statistics retrieved successfully"
      });

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
