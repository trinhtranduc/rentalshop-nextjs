import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest, getUserScope } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get user scope for data filtering
    const userScope = getUserScope(authResult.user);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate data based on groupBy parameter
    const orderData = [];
    
    if (groupBy === 'month') {
      // Generate monthly data
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endMonth) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const month = current.getMonth();
        
        // Calculate start and end of month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Build where clause for user scope
        const whereClause: any = {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };

        // Add user scope filtering
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId },
            include: { outlets: { select: { id: true } } }
          });
          if (merchant) {
            whereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            whereClause.outletId = outlet.id;
          }
        }

        // Get order count for this month
        const orderCount = await prisma.order.count({
          where: whereClause
        });

        orderData.push({
          month: monthName,
          year: year,
          orderCount: orderCount
        });

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else if (groupBy === 'day') {
      // Generate daily data
      const current = new Date(start);
      const endDay = new Date(end);
      
      while (current <= endDay) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const month = current.getMonth();
        const day = current.getDate();
        
        // Calculate start and end of day
        const startOfDay = new Date(year, month, day, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        // Build where clause for user scope
        const whereClause: any = {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        };

        // Add user scope filtering
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId },
            include: { outlets: { select: { id: true } } }
          });
          if (merchant) {
            whereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            whereClause.outletId = outlet.id;
          }
        }

        // Get order count for this day
        const orderCount = await prisma.order.count({
          where: whereClause
        });

        orderData.push({
          month: `${monthName} ${day}`,
          year: year,
          orderCount: orderCount
        });

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
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
}

export const runtime = 'nodejs';