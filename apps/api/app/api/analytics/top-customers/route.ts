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

    // Build where clause based on user role and scope
    const orderWhereClause: any = {
      customerId: { not: null },
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      },
      status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED', 'PICKUPED', 'RETURNED'] }
    };

    // Apply role-based filtering
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      orderWhereClause.merchantId = userScope.merchantId;
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      orderWhereClause.outletId = userScope.outletId;
    }
    // ADMIN sees all data (no additional filtering)

    const topCustomers = await prisma.order.groupBy({
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
      const customer = await prisma.customer.findUnique({
        where: { id: item.customerId! },
        select: {
          id: true, // Include id to use as the external ID
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
        },
      });

    // Get rental count for this customer (only RENT orders)
    const rentalCount = await prisma.order.count({
      where: {
        ...orderWhereClause,
        customerId: item.customerId!,
        orderType: 'RENT'
      }
    });

    // Get sale count for this customer (only SALE orders)
    const saleCount = await prisma.order.count({
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
        orderCount: item._count.customerId, // Total orders (rental + sale)
        rentalCount: rentalCount, // Only rental orders
        saleCount: saleCount, // Only sale orders
        // Hide financial data from OUTLET_STAFF
        totalSpent: user.role !== 'OUTLET_STAFF' ? (item._sum.totalAmount || 0) : null,
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
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top customers analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const runtime = 'nodejs';