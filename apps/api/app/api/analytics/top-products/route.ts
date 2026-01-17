import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, normalizeStartDate, normalizeEndDate } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/top-products - Get top-performing products
 * 
 * Authorization: Roles with 'analytics.view.products' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view product analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.products'])(async (request, { user, userScope }) => {
  try {
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10');

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
      return NextResponse.json(
        ResponseBuilder.success('NO_DATA_AVAILABLE', [])
      );
    }

    // Add date filtering if provided
    if (startDate || endDate) {
      orderWhereClause.createdAt = {};
      const normalizedStart = startDate ? normalizeStartDate(startDate) : null;
      const normalizedEnd = endDate ? normalizeEndDate(endDate) : null;
      if (normalizedStart) orderWhereClause.createdAt.gte = normalizedStart;
      if (normalizedEnd) orderWhereClause.createdAt.lte = normalizedEnd;
    }

    // Get orders based on user scope
    const orders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000 // Get enough orders to analyze
    });

    const orderIds = orders.data?.map(order => order.id) || [];

    // Then get the top products from those orders
    const topProducts = orderIds.length > 0 ? await db.orderItems.groupBy({
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
      const productId = typeof item.productId === 'number' ? item.productId : (item as any).productId;
      const product = await db.products.findById(productId);

      // Parse product images safely
      const productImages = parseProductImages(product?.images);
      const firstImage = productImages.length > 0 ? productImages[0] : null;

      topProductsWithDetails.push({
        id: product?.id || 0, // Use id (number) as the external ID
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

export const runtime = 'nodejs';
