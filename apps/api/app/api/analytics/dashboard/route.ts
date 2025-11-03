import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/dashboard - Get dashboard analytics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`📊 GET /api/analytics/dashboard - User: ${user.email}`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    
    // Build where clause - NO merchantId needed, DB is isolated
    const orderWhereClause: any = {
      status: { in: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'] }
    };
    
    // Add date filter if period is 'today'
    if (period === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      orderWhereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }
    
    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
      }
    }
    
    const paymentWhereClause: any = {
      status: 'COMPLETED'
    };
    
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        paymentWhereClause.order = { outletId: user.outletId };
      }
    }

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
      db.order.count({ where: orderWhereClause }),
      
      // Total revenue based on order status and type
      db.order.findMany({
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
      db.order.count({ 
        where: {
          ...orderWhereClause, 
          status: 'PICKUPED' 
        }
      }),
      
      // Today's orders (orders created today)
      db.order.findMany({
        where: {
          ...orderWhereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
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
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'RESERVED'
        }
      }),
      
      // Pickup orders count (duplicate - already above)
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED'
        }
      }),
      
      // Completed orders count
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'COMPLETED'
        }
      }),
      
      // Cancelled orders count
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'CANCELLED'
        }
      }),
      
      // Returned orders count
      db.order.count({
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
        productNames: order.orderItems?.map((item: any) => item.product?.name).filter(Boolean).join(', ') || 'N/A'
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
    
    return new NextResponse(dataString, { 
      status: API.STATUS.OK, 
      headers: { 
        'Content-Type': 'application/json', 
        ETag: etag, 
        'Cache-Control': 'private, max-age=60' 
      } 
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});