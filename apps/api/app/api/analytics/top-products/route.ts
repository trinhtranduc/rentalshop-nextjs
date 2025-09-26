import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest, getUserScope } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get user scope for data filtering
    const userScope = getUserScope(authResult.user);

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Set default date range if not provided (last 30 days)
    let dateStart: Date;
    let dateEnd: Date;
    
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      // Default to last 30 days
      dateEnd = new Date();
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 30);
    }

    // Build where clause based on user scope
    const orderWhere: any = {
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      },
      status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED', 'PICKUPED', 'RETURNED'] }
    };

    // Add scope filtering based on user role
    if (userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await prisma.outlet.findUnique({
        where: { id: userScope.outletId }
      });
      if (outlet) {
        orderWhere.outletId = outlet.id;
      }
    } else if (userScope.merchantId) {
      // Find merchant by id to get CUID, then filter by outlet
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        include: { outlets: { select: { id: true } } }
      });
      if (merchant) {
        orderWhere.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    }

    // First get the orders that match our criteria
    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true
      }
    });

    const orderIds = orders.map(order => order.id);

    // Then get the top products from those orders
    const topProducts = await prisma.orderItem.groupBy({
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
    });

    // Get product details for each top product in order
    const topProductsWithDetails = [];
    for (const item of topProducts) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          id: true, // Include id to use as the external ID
          name: true,
          rentPrice: true,
          images: true,
          category: {
            select: {
              name: true
            }
          }
        }
      });

      topProductsWithDetails.push({
        id: product?.id || 0, // Use id (number) as the external ID
        name: product?.name || 'Unknown Product',
        rentPrice: product?.rentPrice || 0,
        category: product?.category?.name || 'Uncategorized',
        rentalCount: item._count.productId,
        totalRevenue: item._sum.totalPrice || 0,
        image: product?.images ? JSON.parse(product.images)[0] : null
      });
    }

    const body = JSON.stringify({ success: true, data: topProductsWithDetails });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching top products analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top products analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';