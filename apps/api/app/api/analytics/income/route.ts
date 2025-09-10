import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthAndAuthz } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

export const GET = withAuthAndAuthz({ permission: 'analytics.view' }, async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to view analytics
    const { user, userScope, request } = authorizedRequest;

    // Get current year and month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate data for the last 12 months
    const incomeData = [];
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthName = targetDate.toLocaleString('default', { month: 'short' });
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      // Calculate start and end of month
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Get real income (completed payments)
      const realIncome = await prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Get future income (pending orders with future return dates)
      const futureIncome = await prisma.order.aggregate({
        where: {
          status: { in: ['BOOKED', 'ACTIVE'] },
          returnPlanAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          totalAmount: true
        }
      });

      // Get order count for the month
      const orderCount = await prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: { in: ['BOOKED', 'ACTIVE', 'COMPLETED'] }
        }
      });

      incomeData.push({
        month: monthName,
        year: year,
        realIncome: (realIncome._sum?.amount as number | null) || 0,
        futureIncome: futureIncome._sum.totalAmount || 0,
        orderCount: orderCount
      });
    }

    const body = JSON.stringify({ success: true, data: incomeData });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching income analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch income analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';