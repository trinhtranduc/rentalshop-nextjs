import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PerformanceMonitor } from '@rentalshop/utils/src/performance';

/**
 * GET /api/orders/cursor
 * Get orders with cursor-based pagination for large datasets
 * More efficient than offset-based pagination for large datasets
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/orders/cursor - User: ${user.email} (${user.role})`);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters = {
      merchantId: userScope.merchantId,
      outletId: user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' ? userScope.outletId : undefined,
      status: searchParams.get('status') || undefined,
      orderType: searchParams.get('orderType') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    console.log('🔍 Cursor pagination filters:', filters);
    
    // Use performance monitoring for query optimization
    const result = await PerformanceMonitor.measureQuery(
      'orders.searchWithCursor',
      () => db.orders.searchWithCursor(filters)
    );
    
    console.log('✅ Cursor search completed, found:', result.data?.length || 0, 'orders');
    console.log('📊 RESULT DEBUG: hasMore=', result.hasMore, ', nextCursor=', result.nextCursor);

    return NextResponse.json({
      success: true,
      data: {
        orders: result.data || [],
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          limit: filters.limit
        }
      },
      code: "ORDERS_FOUND", 
      message: `Found ${result.data?.length || 0} orders`
    });

  } catch (error) {
    console.error('Error in GET /api/orders/cursor:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
