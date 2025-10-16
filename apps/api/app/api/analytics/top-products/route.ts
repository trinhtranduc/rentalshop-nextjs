import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/top-products - Get top-performing products
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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

    // Get product details for each top product in order
    const topProductsWithDetails = [];
    for (const item of topProducts) {
      const productId = typeof item.productId === 'number' ? item.productId : (item as any).productId;
      const product = await db.products.findById(productId);

      topProductsWithDetails.push({
        id: product?.id || 0, // Use id (number) as the external ID
        name: product?.name || 'Unknown Product',
        rentPrice: product?.rentPrice || 0,
        category: product?.category?.name || 'Uncategorized',
        rentalCount: (item._count as any).productId,
        totalRevenue: item._sum?.totalPrice || 0,
        image: product?.images ? JSON.parse(product.images)[0] : null
      });
    }

    return NextResponse.json({
      success: true,
      data: topProductsWithDetails,
      code: 'TOP_PRODUCTS_SUCCESS', message: 'Top products retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching top products analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';