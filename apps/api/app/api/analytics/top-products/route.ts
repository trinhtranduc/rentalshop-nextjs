import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/top-products - Get top-performing products
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
    
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10');

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

    const orderIds = orders.map(order => order.id);

    // Then get the top products from those orders
    const topProducts = orderIds.length > 0 ? await db.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds }
      },
      _count: {
        productId: true
      },
      _sum: {
        totalPrice: true
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc' // Order by total revenue instead of count
        }
      },
      take: 10
    }) : [];

    // Helper function to parse productImages (handle both JSON string and array)
    const parseProductImages = (images: any): string[] => {
      if (!images) return [];
      if (Array.isArray(images)) return images;
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Get product details for each top product in order
    const topProductsWithDetails = [];
    for (const item of topProducts) {
      const productId = item.productId;
      const product = await db.product.findUnique({
        where: { id: productId },
        include: { category: true }
      });

      // Parse product images safely
      const productImages = parseProductImages(product?.images);
      const firstImage = productImages.length > 0 ? productImages[0] : null;

      topProductsWithDetails.push({
        id: product?.id || 0,
        name: product?.name || 'Unknown Product',
        rentPrice: product?.rentPrice || 0,
        category: product?.category?.name || 'Uncategorized',
        rentalCount: (item._count as any).productId,
        totalRevenue: item._sum?.totalPrice || 0,
        image: firstImage
      });
    }

    return NextResponse.json(
      ResponseBuilder.success('TOP_PRODUCTS_SUCCESS', topProductsWithDetails)
    );

  } catch (error) {
    console.error('❌ Error fetching top products analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});