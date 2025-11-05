import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders/cursor
 * Get orders with cursor-based pagination for large datasets
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * More efficient than offset-based pagination for large datasets
 */
export const GET = withReadOnlyAuth(async (request, { user }) => {
  console.log(`🔍 GET /api/orders/cursor - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
    const { searchParams } = new URL(request.url);
    
    // Build where clause - NO merchantId needed
    const where: any = {};
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletId = user.outletId;
    }
    if (searchParams.get('status')) where.status = searchParams.get('status');
    if (searchParams.get('orderType')) where.orderType = searchParams.get('orderType');
    if (searchParams.get('startDate')) {
      where.createdAt = { ...where.createdAt, gte: new Date(searchParams.get('startDate')!) };
    }
    if (searchParams.get('endDate')) {
      where.createdAt = { ...where.createdAt, lte: new Date(searchParams.get('endDate')!) };
    }
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    
    // Cursor-based pagination: use createdAt < cursor
    if (cursor) {
      where.createdAt = {
        ...where.createdAt,
        lt: new Date(cursor)
      };
    }

    console.log('🔍 Cursor pagination where clause:', where);
    
    // Get one extra to check if there are more
    const orders = await db.order.findMany({
      where,
      include: {
        customer: true,
        outlet: true,
        createdBy: true
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1
    });
    
    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop(); // Remove the extra record
    }
    
    const nextCursor = hasMore && orders.length > 0 ? orders[orders.length - 1].createdAt.toISOString() : null;
    
    console.log('✅ Cursor search completed, found:', orders.length, 'orders');
    console.log('📊 RESULT DEBUG: hasMore=', hasMore, ', nextCursor=', nextCursor);

    return NextResponse.json({
      success: true,
      data: {
        orders: orders,
        pagination: {
          hasMore: hasMore,
          nextCursor: nextCursor,
          limit: limit
        }
      },
      code: "ORDERS_FOUND", 
      message: `Found ${orders.length} orders`
    });

  } catch (error) {
    console.error('Error in GET /api/orders/cursor:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
