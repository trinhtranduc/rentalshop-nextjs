import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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
        status: { in: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] }
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
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            city: true,
            state: true
          }
        });

        return {
          id: item.customerId,
          name: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer',
          email: customer?.email || '',
          phone: customer?.phone || '',
          location: customer ? `${customer.city || ''}, ${customer.state || ''}`.trim() : '',
          orderCount: item._count.customerId,
          totalSpent: item._sum.totalAmount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: topCustomersWithDetails
    });

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
} 