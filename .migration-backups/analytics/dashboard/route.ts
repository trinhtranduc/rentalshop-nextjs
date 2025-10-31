import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
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
      // Find merchant by id to get outlets
      const merchant = await db.merchants.findById(userScope.merchantId);
      console.log('🔍 Merchant found:', {
        merchantId: userScope.merchantId,
        merchant: merchant ? { id: merchant.id, name: merchant.name } : null,
        outlets: merchant?.outlets || [],
        outletsLength: merchant?.outlets?.length || 0
      });
      
      if (merchant && merchant.outlets && merchant.outlets.length > 0) {
        const outletIds = merchant.outlets.map(outlet => outlet.id);
        orderWhereClause.outletId = { in: outletIds };
        paymentWhereClause.order = { outletId: { in: outletIds } };
        console.log('✅ Applied outlet filter:', { outletIds });
      } else {
        console.log('❌ No outlets found for merchant, returning empty data');
        return NextResponse.json({
          success: true,
          data: {
            totalOrders: 0,
            totalRevenue: 0,
            activeRentals: 0,
            recentOrders: [],
            reservedOrders: 0,
            pickupOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0
          },
          message: 'No outlets found for merchant'
        });
      }
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId );
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
        paymentWhereClause.order = { outletId: outlet.id };
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN users see all data (system-wide access)
      // No additional filtering needed for ADMIN role
      console.log('✅ ADMIN user accessing all system data:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
    } else {
      // All other users without merchant/outlet assignment should see no data
      console.log('🚫 User without merchant/outlet assignment:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
      return NextResponse.json({
        success: true,
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          activeRentals: 0,
          recentOrders: [],
          reservedOrders: 0,
          pickupOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0
        },
        message: 'No data available - user not assigned to merchant/outlet'
      });
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
      db.orders.getStats(orderWhereClause),
      
      // Total revenue based on order status and type
      db.orders.search({
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
      }).then(result => result.data),
      
      // Pickup orders count
      db.orders.getStats({ 
        ...orderWhereClause, 
        status: 'PICKUPED' 
      }),
      
      // Today's orders (orders created today)
      db.orders.search({
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
      }).then(result => result.data),
      
      // Reserved orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: 'RESERVED'
      }),
      
      // Pickup orders count (duplicate - already above)
      db.orders.getStats({
        ...orderWhereClause,
        status: 'PICKUPED'
      }),
      
      // Completed orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: 'COMPLETED'
      }),
      
      // Cancelled orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: 'CANCELLED'
      }),
      
      // Returned orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: 'RETURNED'
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
        productNames: (order as any).orderItems?.map((item: any) => item.product?.name).filter(Boolean).join(', ') || 'N/A'
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
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';