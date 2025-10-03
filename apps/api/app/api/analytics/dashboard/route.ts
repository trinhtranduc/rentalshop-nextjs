import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/dashboard - Get dashboard analytics
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`📊 GET /api/analytics/dashboard - User: ${user.email}`);
  
  try {
    // Build where clause based on user role and scope
    const orderWhereClause: any = {
      status: { in: ['BOOKED', 'ACTIVE', 'COMPLETED'] }
    };
    
    const paymentWhereClause: any = {
      status: 'COMPLETED'
    };

    // Apply role-based filtering
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      orderWhereClause.outlet = { merchantId: userScope.merchantId };
      paymentWhereClause.order = { outlet: { merchantId: userScope.merchantId } };
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      orderWhereClause.outletId = userScope.outletId;
      paymentWhereClause.order = { outletId: userScope.outletId };
    }
    // ADMIN users see all data (no additional filtering)

    console.log('🔍 Dashboard filters:', { orderWhereClause, paymentWhereClause });

    // Fetch dashboard data in parallel
    const [
      totalOrders,
      totalRevenue,
      activeOrders,
      recentOrders
    ] = await Promise.all([
      // Total orders count
      prisma.order.count({ where: orderWhereClause }),
      
      // Total revenue from completed payments
      prisma.payment.aggregate({
        where: paymentWhereClause,
        _sum: { amount: true }
      }),
      
      // Active orders count
      prisma.order.count({ 
        where: { 
          ...orderWhereClause, 
          status: 'ACTIVE' 
        } 
      }),
      
      // Recent orders (last 10)
      prisma.order.findMany({
        where: orderWhereClause,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Prepare response data
    const dashboardData = {
      overview: {
        totalOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
        activeOrders,
        completionRate: totalOrders > 0 ? ((totalOrders - activeOrders) / totalOrders * 100).toFixed(1) : 0
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
        outletName: order.outlet?.name || 'Unknown',
        createdAt: order.createdAt
      }))
    };

    // Generate ETag for caching
    const dataString = JSON.stringify(dashboardData);
    const etag = crypto.createHash('md5').update(dataString).digest('hex');
    
    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(dataString, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

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