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
    const incomeData = [];
    
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

        // Get real income (completed payments) with proper filtering
        const paymentWhereClause: any = {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        };

        // Add user scope filtering for payments
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId }
          });
          if (merchant) {
            paymentWhereClause.merchantId = merchant.id;
          }
        } else if (userScope.outletId) {
          // For outlet scope, filter through orders
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            paymentWhereClause.order = {
              outletId: outlet.id
            };
          }
        }

        const realIncome = await prisma.payment.aggregate({
          where: paymentWhereClause,
          _sum: {
            amount: true,
          },
        });

        // Build where clause for orders
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        };

        // Add user scope filtering for orders
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId },
            include: { outlets: { select: { id: true } } }
          });
          if (merchant) {
            orderWhereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            orderWhereClause.outletId = outlet.id;
          }
        }

        // Get future income (pending orders with future return dates)
        const futureIncome = await prisma.order.aggregate({
          where: {
            status: { in: ['RESERVED', 'ACTIVE'] },
            returnPlanAt: {
              gte: startOfMonth,
              lte: endOfMonth
            },
            ...orderWhereClause
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
            status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED'] },
            ...orderWhereClause
          }
        });

        incomeData.push({
          month: monthName,
          year: year,
          realIncome: (realIncome._sum?.amount as number | null) || 0,
          futureIncome: futureIncome._sum.totalAmount || 0,
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
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const month = current.getMonth();
        const day = current.getDate();
        
        // Calculate start and end of day
        const startOfDay = new Date(year, month, day, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        // Get real income (completed payments) with proper filtering
        const paymentWhereClause: any = {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };

        // Add user scope filtering for payments
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId }
          });
          if (merchant) {
            paymentWhereClause.merchantId = merchant.id;
          }
        } else if (userScope.outletId) {
          // For outlet scope, filter through orders
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            paymentWhereClause.order = {
              outletId: outlet.id
            };
          }
        }

        const realIncome = await prisma.payment.aggregate({
          where: paymentWhereClause,
          _sum: {
            amount: true,
          },
        });

        // Build where clause for orders
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };

        // Add user scope filtering for orders
        if (userScope.merchantId) {
          const merchant = await prisma.merchant.findUnique({
            where: { id: userScope.merchantId },
            include: { outlets: { select: { id: true } } }
          });
          if (merchant) {
            orderWhereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await prisma.outlet.findUnique({
            where: { id: userScope.outletId }
          });
          if (outlet) {
            orderWhereClause.outletId = outlet.id;
          }
        }

        // Get future income (pending orders with future return dates)
        const futureIncome = await prisma.order.aggregate({
          where: {
            status: { in: ['RESERVED', 'ACTIVE'] },
            returnPlanAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            ...orderWhereClause
          },
          _sum: {
            totalAmount: true
          }
        });

        // Get order count for the day
        const orderCount = await prisma.order.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED'] },
            ...orderWhereClause
          }
        });

        incomeData.push({
          month: `${monthName} ${day}`,
          year: year,
          realIncome: (realIncome._sum?.amount as number | null) || 0,
          futureIncome: futureIncome._sum.totalAmount || 0,
          orderCount: orderCount
        });

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    }

    const body = JSON.stringify({ success: true, data: incomeData });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching income analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch income analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';