import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
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

    // RBAC: ADMIN or MERCHANT can view analytics
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get dashboard statistics
    const [
      totalOrders,
      realIncome,
      futureIncome
    ] = await Promise.all([
      // Count total orders
      prisma.order.count({
        where: { 
          status: { in: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] }
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
          status: { in: ['CONFIRMED', 'ACTIVE'] }
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
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
export const runtime = 'nodejs';