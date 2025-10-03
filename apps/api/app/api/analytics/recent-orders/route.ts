import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    // User is already authenticated and authorized to view analytics

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

    // Build where clause with date filtering
    const whereClause: any = {
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };

    // Add scope filtering based on user role
    if (userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await prisma.outlet.findUnique({
        where: { id: userScope.outletId },
        select: { id: true }
      });
      if (outlet) {
        whereClause.outletId = outlet.id;
      }
    } else if (userScope.merchantId) {
      // Find merchant by id to get CUID
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        select: { id: true, outlets: { select: { id: true } } }
      });
      if (merchant) {
        whereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    }

    // Get recent orders with date filtering
    const recentOrders = await prisma.order.findMany({
      where: whereClause,
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
        id: order.id, // Use id (number) as the external ID
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
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const runtime = 'nodejs';