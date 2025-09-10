import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthAndAuthz } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

export const GET = withAuthAndAuthz({ permission: 'analytics.view' }, async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to view analytics
    const { user, userScope, request } = authorizedRequest;

    // Get top customers in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { not: null },
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: { in: ['BOOKED', 'ACTIVE', 'COMPLETED'] }
      },
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

    // Get customer details for each top customer
    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (item) => {
        const customer = await prisma.customer.findUnique({
          where: { id: item.customerId! },
          select: {
            id: true,
            publicId: true, // Include publicId to use as the external ID
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
          },
        });

        return {
          id: customer?.publicId || 0, // Use publicId (number) as the external ID
          name: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer',
          email: customer?.email || '',
          phone: customer?.phone || '',
          location: customer?.address || '',
          orderCount: item._count.customerId,
          totalSpent: item._sum.totalAmount || 0,
        };
      })
    );

    const body = JSON.stringify({ success: true, data: topCustomersWithDetails });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching top customers analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top customers analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';