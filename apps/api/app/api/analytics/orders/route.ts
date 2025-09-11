import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthAndAuthz } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

export const GET = withAuthAndAuthz({ permission: 'analytics.view' }, async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to view analytics
    const { user, userScope, request } = authorizedRequest;

    // Get current year and month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate data for the last 12 months
    const orderData = [];
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthName = targetDate.toLocaleString('default', { month: 'short' });
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      // Calculate start and end of month
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Get order count for this month
      const orderCount = await prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      orderData.push({
        month: monthName,
        year: year,
        orderCount: orderCount
      });
    }

    const body = JSON.stringify({ success: true, data: orderData });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch order analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const runtime = 'nodejs';