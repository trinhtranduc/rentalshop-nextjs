import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API, ORDER_STATUS} from '@rentalshop/constants';
import { lastShopDays, readReportRange } from '../../../../lib/report-days';

/**
 * GET /api/analytics/recent-orders - Get recent orders analytics
 * 
 * Authorization: Roles with 'analytics.view.orders' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view order analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.orders'])(async (request, { user, userScope }) => {
  try {
    // User is already authenticated and authorized to view analytics

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Vietnam civil days (#594): the requested days (whole end day; `new Date(key)` stopped at its 07:00 VN),
    // else the last 30 Vietnam days up to the end of today
    const requested = startDate && endDate ? readReportRange(startDate, endDate) : null;
    if (startDate && endDate && !requested) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), { status: API.STATUS.BAD_REQUEST });
    }
    const { start: dateStart, end: dateEnd } = requested ?? lastShopDays(30);

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
      return NextResponse.json(
        ResponseBuilder.success('NO_DATA_AVAILABLE', [])
      );
    }

    // Get recent orders with date filtering
    // db.orders.search ignores `include`; ask for product names explicitly (#349). Without them every
    // non-empty range failed on `order.orderItems.map` (it only "worked" while the range was empty).
    const recentOrders = await db.orders.search({
      where: whereClause,
      includeItemNames: true,
      limit: 20
    });

    // Format the data for display
    const formattedOrders = (recentOrders.data || []).map((order: any) => {
      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : 'Walk-in Customer';

      const customerPhone = order.customer?.phone || 'N/A';

      const orderItems = order.orderItems || [];
      const productNames = orderItems
        .map((item: any) => item.product?.name)
        .filter(Boolean)
        .join(', ');

      const productImage = orderItems[0]?.product?.images
        ? JSON.parse(orderItems[0].product.images as any)[0]
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

    const responseData = ResponseBuilder.success('RECENT_ORDERS_SUCCESS', formattedOrders);
    const dataString = JSON.stringify(responseData);
    const etag = crypto.createHash('sha1').update(dataString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return NextResponse.json(responseData, { status: API.STATUS.OK, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
