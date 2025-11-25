import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request, { user, userScope }) => {
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
    const orderWhereClause: any = {
      customerId: { not: null },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      },
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
      return NextResponse.json({
        success: true,
        data: [],
        code: 'NO_DATA_AVAILABLE',
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }
    // ADMIN sees all data (no additional filtering)

    const topCustomers = await db.orders.groupBy({
      by: ['customerId'],
      where: orderWhereClause,
      _count: {
        customerId: true
      },
      _sum: {
        totalAmount: true
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc'
        }
      },
      take: 10
    });

    // Get customer details for each top customer in order
    const topCustomersWithDetails = [];
    for (const item of topCustomers) {
      const customer = await db.customers.findById(item.customerId!);

    // Get rental count for this customer (only RENT orders)
    const rentalCount = await db.orders.getStats({
      where: {
        ...orderWhereClause,
        customerId: item.customerId!,
        orderType: ORDER_TYPE.RENT as any
      }
    });

    // Get sale count for this customer (only SALE orders)
    const saleCount = await db.orders.getStats({
      where: {
        ...orderWhereClause,
        customerId: item.customerId!,
        orderType: ORDER_TYPE.SALE as any
      }
    });

      topCustomersWithDetails.push({
        id: customer?.id || 0, // Use id (number) as the external ID
        name: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        location: customer?.address || '',
        orderCount: (item._count as any)?.customerId || 0, // Total orders (rental + sale)
        rentalCount: rentalCount, // Only rental orders
        saleCount: saleCount, // Only sale orders
        // Hide financial data from OUTLET_STAFF
        totalSpent: user.role !== USER_ROLE.OUTLET_STAFF ? (item._sum?.totalAmount || 0) : null,
      });
    }

    const body = JSON.stringify({ 
      success: true, 
      data: topCustomersWithDetails,
      userRole: user.role // Include user role for frontend filtering
    });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching top customers analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';