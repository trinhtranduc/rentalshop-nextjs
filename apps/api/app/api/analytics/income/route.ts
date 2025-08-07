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
          type: { in: ['RENTAL_FEE', 'SALE'] },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          amount: true
        }
      });

      // Get future income (pending orders with future return dates)
      const futureIncome = await prisma.order.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'ACTIVE'] },
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
          status: { in: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] }
        }
      });

      incomeData.push({
        month: monthName,
        year: year,
        realIncome: realIncome._sum.amount || 0,
        futureIncome: futureIncome._sum.totalAmount || 0,
        orderCount: orderCount
      });
    }

    return NextResponse.json({
      success: true,
      data: incomeData
    });

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
} 