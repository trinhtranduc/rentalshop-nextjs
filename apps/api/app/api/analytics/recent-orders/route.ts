import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Build where clause - NO merchantId needed, DB is isolated
    const whereClause: any = {
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        whereClause.outletId = user.outletId;
      }
    }

    // Get recent orders with date filtering
    const recentOrders = await db.order.findMany({
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
    const formattedOrders = recentOrders.map((order: any) => {
      const customerName = order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : 'Walk-in Customer';
      
      const customerPhone = order.customer?.phone || 'N/A';
      
      const productNames = order.orderItems
        .map((item: any) => item.product.name)
        .join(', ');
      
      const productImages = order.orderItems[0]?.product.images;
      const productImage = productImages 
        ? (Array.isArray(productImages) ? productImages[0] : (typeof productImages === 'string' ? JSON.parse(productImages)[0] : null))
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

    const body = JSON.stringify(ResponseBuilder.success('RECENT_ORDERS_SUCCESS', formattedOrders));
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { 
      status: API.STATUS.OK, 
      headers: { 
        'Content-Type': 'application/json', 
        ETag: etag, 
        'Cache-Control': 'private, max-age=60' 
      } 
    });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});