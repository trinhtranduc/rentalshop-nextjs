import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withPermissions } from '@rentalshop/auth';
import { db, prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, getOrderRevenueEvents } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/top-customers - Get top-performing customers
 * 
 * Authorization: Roles with 'analytics.view.customers' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view customer analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.customers'])(async (request, { user, userScope }) => {
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

    // Build where clause based on user role and scope
    // Note: We need to get ALL orders that have events in the date range, not just orders created in the range
    // So we don't filter by createdAt here - we'll filter revenue events by date range instead
    const orderWhereClause: any = {
      customerId: { not: null },
      status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any, ORDER_STATUS.COMPLETED as any, ORDER_STATUS.RETURNED as any] }
    };

    // Apply role-based filtering
    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      // Find merchant by id to get CUID, then filter by outlet
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
      }
    } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId );
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
      }
    } else if (user.role !== USER_ROLE.ADMIN) {
      // New users without merchant/outlet assignment should see no data
      console.log('🚫 User without merchant/outlet assignment:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
      return NextResponse.json(
        ResponseBuilder.success('NO_DATA_AVAILABLE', [])
      );
    }
    // ADMIN sees all data (no additional filtering)

    // ✅ FIX: Get all orders and calculate revenue events within date range
    // We need to get ALL orders (not just created in date range) because revenue events
    // can occur on different dates (deposit, pickup, return)
    // Use Prisma directly to get orders with custom select
    const allOrders = await prisma.order.findMany({
      where: {
        ...orderWhereClause,
        status: { not: ORDER_STATUS.CANCELLED } // Exclude cancelled orders from revenue
      },
      select: {
        id: true,
        customerId: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        createdAt: true,
        pickedUpAt: true,
        returnedAt: true,
        updatedAt: true
      },
      take: 10000 // Get enough orders to analyze
    });

    // Group orders by customer and calculate revenue events within date range
    const customerRevenueMap = new Map<number, {
      customerId: number;
      orderCount: number;
      rentalCount: number;
      saleCount: number;
      totalRevenue: number;
    }>();

    for (const order of allOrders) {
      if (!order.customerId) continue;

      const customerId = order.customerId; // customerId is number (publicId)
      
      // Prepare order data for revenue calculation
      const orderData = {
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        securityDeposit: order.securityDeposit || 0,
        damageFee: order.damageFee || 0,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        updatedAt: order.updatedAt
      };

      // Get revenue events within the date range
      const revenueEvents = getOrderRevenueEvents(orderData, dateStart, dateEnd);
      
      // Only count this order if it has revenue events in the date range
      if (revenueEvents.length === 0) continue;

      if (!customerRevenueMap.has(customerId)) {
        customerRevenueMap.set(customerId, {
          customerId,
          orderCount: 0,
          rentalCount: 0,
          saleCount: 0,
          totalRevenue: 0
        });
      }

      const customerData = customerRevenueMap.get(customerId)!;
      customerData.orderCount += 1;

      // Count by order type
      if (order.orderType === ORDER_TYPE.RENT) {
        customerData.rentalCount += 1;
      } else if (order.orderType === ORDER_TYPE.SALE) {
        customerData.saleCount += 1;
      }

      // Sum revenue from all events in the date range
      const orderRevenueInRange = revenueEvents.reduce((sum, event) => sum + event.revenue, 0);
      customerData.totalRevenue += orderRevenueInRange;
    }

    // Sort by total revenue and get top 10
    const topCustomers = Array.from(customerRevenueMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Get customer details for each top customer
    // customerId is number (publicId) from order
    const topCustomersWithDetails = [];
    for (const item of topCustomers) {
      // Find customer by publicId (customerId is number from order)
      const customer = await db.customers.findById(item.customerId);

      topCustomersWithDetails.push({
        id: customer?.id || 0, // Use id (number) as the external ID
        name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        location: customer?.address || '',
        orderCount: item.orderCount, // Total orders (rental + sale)
        rentalCount: item.rentalCount, // Only rental orders
        saleCount: item.saleCount, // Only sale orders
        // Hide financial data from OUTLET_STAFF
        totalSpent: user.role !== USER_ROLE.OUTLET_STAFF ? item.totalRevenue : null,
      });
    }

    const responseData = ResponseBuilder.success('TOP_CUSTOMERS_SUCCESS', {
      data: topCustomersWithDetails,
      userRole: user.role // Include user role for frontend filtering
    });
    const dataString = JSON.stringify(responseData);
    const etag = crypto.createHash('sha1').update(dataString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return NextResponse.json(responseData, { status: API.STATUS.OK, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching top customers analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
