import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders/statistics
 * Get order statistics for dashboard (optimized aggregation)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withReadOnlyAuth(async (request, { user }) => {
  console.log(`🔍 GET /api/orders/statistics - User: ${user.email} (${user.role})`);
  
  try {
    const tenantResult = await getTenantDbFromRequest(request);
      
      if (!tenantResult) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    
    // Build where clause - NO merchantId needed
    const where: any = {};
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletId = user.outletId;
    }
    
    if (searchParams.get('startDate')) {
      where.createdAt = { ...where.createdAt, gte: new Date(searchParams.get('startDate')!) };
    }
    if (searchParams.get('endDate')) {
      where.createdAt = { ...where.createdAt, lte: new Date(searchParams.get('endDate')!) };
    }

    console.log('🔍 Statistics where clause:', where);
    
    // Get order statistics using Prisma aggregate
    const totalOrders = await db.order.count({ where });
    
    const totalRevenueResult = await db.order.aggregate({
      where: { ...where, status: { in: ['COMPLETED', 'RETURNED'] } },
      _sum: { totalAmount: true }
    });
    const totalRevenue = totalRevenueResult._sum.totalAmount || 0;
    
    // Status breakdown
    const statusBreakdown: any = {};
    for (const status of ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']) {
      const count = await db.order.count({ where: { ...where, status } });
      statusBreakdown[status] = count;
    }
    
    const result = {
      totalOrders,
      totalRevenue,
      statusBreakdown
    };
    
    console.log('✅ Statistics completed:', result);

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
