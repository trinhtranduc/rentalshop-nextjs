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
      status: { in: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'] }
    };
    
    const paymentWhereClause: any = {
      status: 'COMPLETED'
    };

    // Apply role-based filtering
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      // Find merchant by id to get CUID, then filter by outlet
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        include: { outlets: { select: { id: true } } }
      });
      if (merchant) {
        orderWhereClause.outletId = { in: merchant.outlets.map(outlet => outlet.id) };
        paymentWhereClause.order = { outletId: { in: merchant.outlets.map(outlet => outlet.id) } };
      }
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await prisma.outlet.findUnique({
        where: { id: userScope.outletId }
      });
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
        paymentWhereClause.order = { outletId: outlet.id };
      }
    }
    // ADMIN users see all data (no additional filtering)

    console.log('🔍 Dashboard filters:', { orderWhereClause, paymentWhereClause });

    // Fetch dashboard data in parallel
    const [
      totalOrders,
      totalRevenueOrders,
      activeOrders,
      recentOrders,
      reservedOrders,
      pickupOrders,
      completedOrders,
      cancelledOrders,
      returnedOrders
    ] = await Promise.all([
      // Total orders count
      prisma.order.count({ where: orderWhereClause }),
      
      // Total revenue based on order status and type
      prisma.order.findMany({
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
      }),
      
      // Pickup orders count
      prisma.order.count({ 
        where: { 
          ...orderWhereClause, 
          status: 'PICKUPED' 
        } 
      }),
      
      // Today's orders (orders created today)
      prisma.order.findMany({
        where: {
          ...orderWhereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
            lte: new Date(new Date().setHours(23, 59, 59, 999)) // End of today
          }
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } },
          orderItems: {
            include: {
              product: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Reserved orders count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'RESERVED'
        }
      }),
      
      // Pickup orders count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED'
        }
      }),
      
      // Completed orders count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'COMPLETED'
        }
      }),
      
      // Cancelled orders count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'CANCELLED'
        }
      }),
      
      // Returned orders count
      prisma.order.count({
        where: {
          ...orderWhereClause,
          status: 'RETURNED'
        }
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

    const totalRevenue = totalRevenueOrders.reduce((sum, order) => {
      return sum + calculateOrderRevenue(order);
    }, 0);

    // Prepare response data
    const dashboardData = {
      overview: {
        totalOrders,
        totalRevenue,
        activeOrders,
        completionRate: totalOrders > 0 ? ((totalOrders - activeOrders) / totalOrders * 100).toFixed(1) : 0
      },
      orderStatusCounts: {
        reserved: reservedOrders,
        pickup: pickupOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        returned: returnedOrders
      },
      todayOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
        outletName: order.outlet?.name || 'Unknown',
        createdAt: order.createdAt,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        productNames: order.orderItems?.map(item => item.product?.name).filter(Boolean).join(', ') || 'N/A'
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