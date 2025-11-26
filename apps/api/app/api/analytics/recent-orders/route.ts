import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API, ORDER_STATUS} from '@rentalshop/constants';

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
      status: { not: ORDER_STATUS.CANCELLED },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };

    // Apply role-based filtering (consistent with other APIs)
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        whereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        whereClause.outletId = outlet.id;
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
        code: 'NO_DATA_AVAILABLE',
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    // Get recent orders with date filtering
    const recentOrders = await db.orders.search({
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
    const formattedOrders = recentOrders.data.map((order: any) => {
      const customerName = order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : 'Walk-in Customer';
      
      const customerPhone = order.customer?.phone || 'N/A';
      
      const productNames = order.orderItems
        .map((item: any) => item.product.name)
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
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
