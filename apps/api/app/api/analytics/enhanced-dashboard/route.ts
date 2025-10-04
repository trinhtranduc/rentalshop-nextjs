import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/enhanced-dashboard - Get comprehensive dashboard analytics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: ADMIN (all), MERCHANT (merchant), OUTLET_ADMIN/STAFF (outlet)
 */
async function handleGetEnhancedDashboard(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any }
) {
  try {

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
    
    if (merchantId) {
      // For orders, filter by outlet.merchantId
      orderWhereClause.outlet = {
        merchantId: merchantId
      };
      // For payments, filter by merchantId directly
      paymentWhereClause.merchantId = merchantId;
      // For customers, filter by merchantId directly
      customerWhereClause.merchantId = merchantId;
      // For outlet stock, filter by outlet.merchantId
      outletStockWhereClause.outlet = {
        merchantId: merchantId
      };
    }
    
    if (outletId) {
      // For orders, filter by outletId directly
      orderWhereClause.outletId = outletId;
      // For payments, we need to filter by orders from this outlet
      paymentWhereClause.order = {
        outletId: outletId
      };
      // For outlet stock, filter by outletId directly
      outletStockWhereClause.outletId = outletId;
    }

    // Get comprehensive dashboard statistics
    const [
      totalOrders,
      totalRevenue,
      todayRentals,
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
      
      // Total revenue based on order status and type - hide from OUTLET_STAFF
      user.role !== 'OUTLET_STAFF' ? prisma.order.findMany({
        where: orderWhereClause,
        select: {
          id: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          securityDeposit: true,
          damageFee: true,
          pickedUpAt: true,
          returnedAt: true
        }
      }) : Promise.resolve([]),
      
      // Today's rentals count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
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

    // Calculate total revenue based on order type and status
    const calculateOrderRevenue = (order: any) => {
      if (order.orderType === 'SALE') {
        return order.totalAmount;
      } else {
        // RENT order
        if (order.status === 'RESERVED') {
          return order.depositAmount;
        } else if (order.status === 'PICKUPED') {
          return order.totalAmount - order.depositAmount + (order.securityDeposit || 0);
        } else if (order.status === 'RETURNED') {
          // Check if order was picked up and returned on the same day
          const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
          const returnDate = order.returnedAt ? new Date(order.returnedAt) : null;
          
          if (pickupDate && returnDate) {
            const sameDay = pickupDate.toDateString() === returnDate.toDateString();
            if (sameDay) {
              // Same day rental: total - security deposit + damage fee
              return order.totalAmount - (order.securityDeposit || 0) + (order.damageFee || 0);
            }
          }
          
          // Different days or no pickup/return dates: security deposit - damage fee
          return (order.securityDeposit || 0) - (order.damageFee || 0);
        }
      }
      return 0;
    };

    const calculatedTotalRevenue = totalRevenue.reduce((sum: number, order: any) => {
      return sum + calculateOrderRevenue(order);
    }, 0);

    // Calculate today's revenue (orders created today)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const todayOrders = await prisma.order.findMany({
      where: {
        ...orderWhereClause,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        pickedUpAt: true,
        returnedAt: true
      }
    });

    const todayRevenue = todayOrders.reduce((sum: number, order: any) => {
      return sum + calculateOrderRevenue(order);
    }, 0);

    // Calculate revenue growth percentage
    const [currentMonthRevenue, lastMonthRevenue] = revenueGrowth;
    const currentRevenue = (currentMonthRevenue._sum?.amount as number | null) || 0;
    const lastRevenue = (lastMonthRevenue._sum?.amount as number | null) || 0;
    const revenueGrowthPercent = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Calculate future income (pending orders) - hide from OUTLET_STAFF
    const futureIncome = user.role !== 'OUTLET_STAFF' ? await prisma.order.aggregate({
      where: {
        ...orderWhereClause,
        status: { in: ['RESERVED', 'ACTIVE'] }
      },
      _sum: {
        totalAmount: true
      }
    }) : { _sum: { totalAmount: null } };

    const payload = {
      success: true,
      data: {
        // Financial data - hide from OUTLET_STAFF
        totalRevenue: user.role !== 'OUTLET_STAFF' ? calculatedTotalRevenue : null,
        todayRevenue: user.role !== 'OUTLET_STAFF' ? todayRevenue : null,
        revenueGrowth: user.role !== 'OUTLET_STAFF' ? (Math.round(revenueGrowthPercent * 100) / 100) : null,
        futureIncome: user.role !== 'OUTLET_STAFF' ? (futureIncome._sum.totalAmount || 0) : null,
        
        // Operational data - visible to all roles
        totalOrders,
        todayRentals,
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
        customerBase,
        userRole: user.role // Include user role for frontend filtering
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

export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])((req, context) => 
  handleGetEnhancedDashboard(req, context)
);

export const runtime = 'nodejs';
