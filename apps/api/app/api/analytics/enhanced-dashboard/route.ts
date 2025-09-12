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

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    // Set default date range if not provided
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
    const orderWhereClause: any = {
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };
    const paymentWhereClause: any = {
      createdAt: {
        gte: dateStart,
        lte: dateEnd
      }
    };
    const customerWhereClause: any = {};
    const outletStockWhereClause: any = {};
    
    if (merchantCuid) {
      // For orders, filter by outlet.merchantId
      orderWhereClause.outlet = {
        merchantId: merchantCuid
      };
      // For payments, filter by merchantId directly
      paymentWhereClause.merchantId = merchantCuid;
      // For customers, filter by merchantId directly
      customerWhereClause.merchantId = merchantCuid;
      // For outlet stock, filter by outlet.merchantId
      outletStockWhereClause.outlet = {
        merchantId: merchantCuid
      };
    }
    
    if (outletCuid) {
      // For orders, filter by outletId directly
      orderWhereClause.outletId = outletCuid;
      // For payments, we need to filter by orders from this outlet
      paymentWhereClause.order = {
        outletId: outletCuid
      };
      // For outlet stock, filter by outletId directly
      outletStockWhereClause.outletId = outletCuid;
    }

    // Get comprehensive dashboard statistics
    const [
      totalOrders,
      totalRevenue,
      activeRentals,
      completedOrders,
      cancelledOrders,
      overdueRentals,
      todayPickups,
      todayReturns,
      productUtilization,
      customerGrowth,
      revenueGrowth,
      customerBase
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: orderWhereClause
      }),
      
      // Total revenue from completed payments
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          ...paymentWhereClause
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Active rentals (orders with status ACTIVE)
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'ACTIVE'
        }
      }),
      
      // Completed orders
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'COMPLETED'
        }
      }),
      
      // Cancelled orders
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'CANCELLED'
        }
      }),
      
      // Overdue rentals (orders that should have been returned)
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'ACTIVE',
          returnPlanAt: {
            lt: new Date()
          }
        }
      }),
      
      // Today's pickups
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'ACTIVE',
          pickupPlanAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      
      // Today's returns
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'COMPLETED',
          returnedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
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
      }),
      
      // Customer growth (new customers in date range)
      prisma.customer.count({
        where: {
          ...customerWhereClause,
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          }
        }
      }),
      
      // Revenue growth (current period vs previous period)
      Promise.all([
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
        prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            ...paymentWhereClause,
            createdAt: {
              gte: new Date(dateStart.getTime() - (dateEnd.getTime() - dateStart.getTime())),
              lt: dateStart
            }
          },
          _sum: {
            amount: true,
          },
        })
      ]),
      
      // Customer base (total customers)
      prisma.customer.count({
        where: customerWhereClause
      })
    ]);

    // Calculate revenue growth percentage
    const [currentMonthRevenue, lastMonthRevenue] = revenueGrowth;
    const currentRevenue = (currentMonthRevenue._sum?.amount as number | null) || 0;
    const lastRevenue = (lastMonthRevenue._sum?.amount as number | null) || 0;
    const revenueGrowthPercent = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Calculate future income (pending orders)
    const futureIncome = await prisma.order.aggregate({
      where: {
        ...orderWhereClause,
        status: { in: ['RESERVED', 'ACTIVE'] }
      },
      _sum: {
        totalAmount: true
      }
    });

    const payload = {
      success: true,
      data: {
        totalRevenue: (totalRevenue._sum?.amount as number | null) || 0,
        totalOrders,
        activeRentals,
        completedOrders,
        cancelledOrders,
        overdueRentals,
        todayPickups,
        todayReturns,
        productUtilization: (() => {
          const avgStock = (productUtilization._avg?.stock as number | null) || 0;
          const avgRenting = (productUtilization._avg?.renting as number | null) || 0;
          if (avgStock === 0) return 0;
          return Math.round((avgRenting / avgStock) * 100);
        })(),
        customerGrowth,
        revenueGrowth: Math.round(revenueGrowthPercent * 100) / 100,
        customerBase,
        futureIncome: futureIncome._sum.totalAmount || 0
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
    console.error('Error fetching enhanced dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch enhanced dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';
