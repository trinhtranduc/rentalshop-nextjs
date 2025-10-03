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
      orderWhereClause.merchantId = userScope.merchantId;
      paymentWhereClause.merchantId = userScope.merchantId;
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      orderWhereClause.outletId = userScope.outletId;
      paymentWhereClause.outletId = userScope.outletId;
    }
    // ADMIN sees all data (no additional filtering)

    // Get dashboard statistics
    const [
      totalOrders,
      realIncome,
      futureIncome
    ] = await Promise.all([
      // Count total orders
      prisma.order.count({
        where: orderWhereClause
      }),
      
      // Get real income (completed payments) - only if user can see financial data
      user.role !== 'OUTLET_STAFF' ? prisma.payment.aggregate({
        where: paymentWhereClause,
        _sum: {
          amount: true,
        },
      }) : Promise.resolve({ _sum: { amount: null } }),
      
      // Get future income (pending orders) - only if user can see financial data
      user.role !== 'OUTLET_STAFF' ? prisma.order.aggregate({
        where: {
          ...orderWhereClause,
          status: { in: ['BOOKED', 'ACTIVE'] }
        },
        _sum: {
          totalAmount: true
        }
      }) : Promise.resolve({ _sum: { totalAmount: null } })
    ]);

    const payload = {
      success: true,
      data: {
        totalOrders,
        realIncome: user.role !== 'OUTLET_STAFF' ? ((realIncome._sum?.amount as number | null) || 0) : null,
        futureIncome: user.role !== 'OUTLET_STAFF' ? (futureIncome._sum.totalAmount || 0) : null,
        userRole: user.role, // Include user role for frontend filtering
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