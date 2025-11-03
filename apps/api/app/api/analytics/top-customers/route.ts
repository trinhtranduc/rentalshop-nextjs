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
    const orderWhereClause: any = {
      customerId: { not: null },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      },
      status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED', 'PICKUPED', 'RETURNED'] }
    };

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
      }
    }

    const topCustomers = await db.order.groupBy({
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
      const customer = await db.customer.findUnique({
        where: { id: item.customerId! }
      });

    // Get rental count for this customer (only RENT orders)
    const rentalCount = await db.order.count({
      where: {
        ...orderWhereClause,
        customerId: item.customerId!,
        orderType: 'RENT'
      }
    });

    // Get sale count for this customer (only SALE orders)
    const saleCount = await db.order.count({
      where: {
        ...orderWhereClause,
        customerId: item.customerId!,
        orderType: 'SALE'
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
        totalSpent: user.role !== 'OUTLET_STAFF' ? (item._sum?.totalAmount || 0) : null,
      });
    }

    const responseData = {
      data: topCustomersWithDetails,
      userRole: user.role // Include user role for frontend filtering
    };
    
    const body = JSON.stringify(ResponseBuilder.success('TOP_CUSTOMERS_SUCCESS', responseData));
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
    console.error('Error fetching top customers analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});