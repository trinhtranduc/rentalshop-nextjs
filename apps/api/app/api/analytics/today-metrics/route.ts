import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest, getUserScope } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;
    const userScope = getUserScope(user);

    // Convert publicIds to CUIDs for database queries
    let merchantCuid: string | null = null;
    let outletCuid: string | null = null;
    
    if (userScope.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { publicId: userScope.merchantId },
        select: { id: true }
      });
      if (merchant) {
        merchantCuid = merchant.id;
      }
    }
    
    if (userScope.outletId) {
      const outlet = await prisma.outlet.findUnique({
        where: { publicId: userScope.outletId },
        select: { id: true }
      });
      if (outlet) {
        outletCuid = outlet.id;
      }
    }

    // Build where clause based on user scope
    const orderWhereClause: any = {};
    const outletStockWhereClause: any = {};
    
    if (merchantCuid) {
      // For orders, filter by outlet.merchantId
      orderWhereClause.outlet = {
        merchantId: merchantCuid
      };
      // For outlet stock, filter by outlet.merchantId
      outletStockWhereClause.outlet = {
        merchantId: merchantCuid
      };
    }
    
    if (outletCuid) {
      // For orders, filter by outletId directly
      orderWhereClause.outletId = outletCuid;
      // For outlet stock, filter by outletId directly
      outletStockWhereClause.outletId = outletCuid;
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get today's operational metrics
    const [
      todayPickups,
      todayReturns,
      overdueItems,
      productUtilization
    ] = await Promise.all([
      // Today's pickups
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'ACTIVE',
          pickupPlanAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      
      // Today's returns
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'COMPLETED',
          returnedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      
      // Overdue items
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'ACTIVE',
          returnPlanAt: {
            lt: new Date()
          }
        }
      }),
      
      // Product utilization (calculate from outlet stock)
      prisma.outletStock.aggregate({
        where: outletStockWhereClause,
        _avg: {
          stock: true,
          renting: true
        }
      })
    ]);

    const payload = {
      success: true,
      data: {
        todayPickups,
        todayReturns,
        overdueItems,
        productUtilization: (() => {
          const avgStock = (productUtilization._avg?.stock as number | null) || 0;
          const avgRenting = (productUtilization._avg?.renting as number | null) || 0;
          if (avgStock === 0) return 0;
          return Math.round((avgRenting / avgStock) * 100);
        })()
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
    console.error('Error fetching today metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch today metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';
