import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthAndAuthz } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

export const GET = withAuthAndAuthz({ permission: 'analytics.view' }, async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to view analytics
    const { user, userScope, request } = authorizedRequest;

    // Get recent orders (last 20 orders)
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Format the data for display
    const formattedOrders = recentOrders.map(order => {
      const customerName = order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : 'Walk-in Customer';
      
      const customerPhone = order.customer?.phone || 'N/A';
      
      const productNames = order.orderItems
        .map(item => item.product.name)
        .join(', ');
      
      const productImage = order.orderItems[0]?.product.images 
        ? JSON.parse(order.orderItems[0].product.images as any)[0] 
        : null;

      return {
        id: order.publicId, // Use publicId (number) as the external ID
        orderNumber: order.orderNumber,
        customerName,
        customerPhone,
        productNames,
        productImage,
        totalAmount: order.totalAmount,
        status: order.status,
        orderType: order.orderType,
        createdAt: order.createdAt,
        createdBy: '',
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt
      };
    });

    const body = JSON.stringify({ success: true, data: formattedOrders });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';