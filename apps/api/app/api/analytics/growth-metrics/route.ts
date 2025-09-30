import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/growth-metrics - Get growth and trend metrics
 * Requires: Any authenticated user (scoped by role)
 */
async function handleGetGrowthMetrics(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any }
) {
  try {

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Set default date range if not provided (current month)
    let dateStart: Date;
    let dateEnd: Date;
    
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Use integer IDs for database queries
    let merchantId: number | null = null;
    let outletId: number | null = null;
    
    if (userScope.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        select: { id: true }
      });
      if (merchant) {
        merchantId = merchant.id;
      }
    }
    
    if (userScope.outletId) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: userScope.outletId },
        select: { id: true }
      });
      if (outlet) {
        outletId = outlet.id;
      }
    }

    // Build where clause based on user scope
    const customerWhereClause: any = {};
    const paymentWhereClause: any = {};
    
    if (merchantId) {
      // For customers, filter by merchantId directly
      customerWhereClause.merchantId = merchantId;
      // For payments, filter by merchantId directly
      paymentWhereClause.merchantId = merchantId;
    }
    
    if (outletId) {
      // For payments, we need to filter by orders from this outlet
      paymentWhereClause.order = {
        outletId: outletId
      };
    }

    // Calculate previous period for comparison
    const periodDuration = dateEnd.getTime() - dateStart.getTime();
    const previousPeriodStart = new Date(dateStart.getTime() - periodDuration);
    const previousPeriodEnd = new Date(dateStart.getTime() - 1);

    // Get growth metrics
    const [
      currentPeriodCustomers,
      previousPeriodCustomers,
      currentPeriodRevenue,
      previousPeriodRevenue,
      totalCustomers
    ] = await Promise.all([
      // Current period customers
      prisma.customer.count({
        where: {
          ...customerWhereClause,
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          }
        }
      }),
      
      // Previous period customers
      prisma.customer.count({
        where: {
          ...customerWhereClause,
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),
      
      // Current period revenue
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          ...paymentWhereClause,
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Previous period revenue
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          ...paymentWhereClause,
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Total customer base
      prisma.customer.count({
        where: customerWhereClause
      })
    ]);

    // Calculate growth percentages
    const customerGrowth = previousPeriodCustomers > 0 
      ? ((currentPeriodCustomers - previousPeriodCustomers) / previousPeriodCustomers) * 100 
      : 0;

    const currentRevenue = (currentPeriodRevenue._sum?.amount as number | null) || 0;
    const previousRevenue = (previousPeriodRevenue._sum?.amount as number | null) || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const payload = {
      success: true,
      data: {
        customerGrowth: Math.round(customerGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        customerBase: totalCustomers
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
    console.error('Error fetching growth metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch growth metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = withAuthRoles()((req, context) => 
  handleGetGrowthMetrics(req, context)
);

export const runtime = 'nodejs';
