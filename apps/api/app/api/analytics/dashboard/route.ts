import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/dashboard - Get dashboard analytics
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  console.log(`📊 GET /api/analytics/dashboard - User: ${user.email}`);
  
  try {

    // Get dashboard statistics
    const [
      totalOrders,
      realIncome,
      futureIncome
    ] = await Promise.all([
      // Count total orders
      prisma.order.count({
        where: { 
          status: { in: ['BOOKED', 'ACTIVE', 'COMPLETED'] }
        }
      }),
      
      // Get real income (completed payments)
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Get future income (pending orders)
      prisma.order.aggregate({
        where: {
          status: { in: ['BOOKED', 'ACTIVE'] }
        },
        _sum: {
          totalAmount: true
        }
      })
    ]);

    const payload = {
      success: true,
      data: {
        totalOrders,
        realIncome: (realIncome._sum?.amount as number | null) || 0,
        futureIncome: futureIncome._sum.totalAmount || 0,
      },
    };
    const body = JSON.stringify(payload);
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const runtime = 'nodejs';