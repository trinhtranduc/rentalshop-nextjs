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
          type: { in: ['RENTAL_FEE', 'SALE'] }
        },
        _sum: {
          amount: true
        }
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

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        realIncome: realIncome._sum.amount || 0,
        futureIncome: futureIncome._sum.totalAmount || 0
      }
    });

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