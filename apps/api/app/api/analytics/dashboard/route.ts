import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, formatFullName, calculateOrderRevenueByStatus } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/dashboard - Get dashboard analytics
 * 
 * Authorization: Roles with 'analytics.view.dashboard' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Full analytics access
 * - OUTLET_STAFF: Dashboard only (daily/today metrics)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.dashboard'])(async (request, { user, userScope }) => {
  console.log(`📊 GET /api/analytics/dashboard - User: ${user.email}`);
  
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // Get period from query params
    
    // Build where clause based on user role and scope
    const orderWhereClause: any = {
      status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any, ORDER_STATUS.RETURNED as any, ORDER_STATUS.COMPLETED as any, ORDER_STATUS.CANCELLED as any] }
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
    
    const paymentWhereClause: any = {
      status: ORDER_STATUS.COMPLETED
    };

    // Apply role-based filtering
    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
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
        return NextResponse.json(
          ResponseBuilder.success('NO_OUTLETS_FOUND', {
            totalOrders: 0,
            totalRevenue: 0,
            activeRentals: 0,
            recentOrders: [],
            reservedOrders: 0,
            pickupOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0
          })
        );
      }
    } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
      // Find outlet by id to get CUID
      const outlet = await db.outlets.findById(userScope.outletId );
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
        paymentWhereClause.order = { outletId: outlet.id };
      }
    } else if (user.role === USER_ROLE.ADMIN) {
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
      return NextResponse.json(
        ResponseBuilder.success('NO_DATA_AVAILABLE', {
          totalOrders: 0,
          totalRevenue: 0,
          activeRentals: 0,
          recentOrders: [],
          reservedOrders: 0,
          pickupOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0
        })
      );
    }

    console.log('🔍 Dashboard filters:', { orderWhereClause, paymentWhereClause });

    // Fetch dashboard data in parallel
    const [
      totalOrders,
      totalRevenueOrders,
      activeOrders,
      recentOrders,
      reservedOrders,
      completedOrders,
      cancelledOrders,
      returnedOrders
    ] = await Promise.all([
      // Total orders count
      db.orders.getStats(orderWhereClause),
      
      // Total revenue based on order status and type
      // ✅ Exclude CANCELLED orders from revenue calculation
      db.orders.search({
        where: {
          ...orderWhereClause,
          status: { not: ORDER_STATUS.CANCELLED } // Exclude cancelled orders
        },
        select: {
          id: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          securityDeposit: true,
          damageFee: true,
          createdAt: true,
          pickedUpAt: true,
          returnedAt: true,
          updatedAt: true
        }
      }).then(result => result.data),
      
      // Pickup orders count
      db.orders.getStats({ 
        ...orderWhereClause, 
        status: ORDER_STATUS.PICKUPED 
      }),
      
      // Recent orders (orders in the period)
      // ✅ Use orderWhereClause which already includes date filter if period === 'today'
      db.orders.search({
        where: orderWhereClause,
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
        status: ORDER_STATUS.RESERVED
      }),
      
      // Completed orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: ORDER_STATUS.COMPLETED
      }),
      
      // Cancelled orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: ORDER_STATUS.CANCELLED
      }),
      
      // Returned orders count
      db.orders.getStats({
        ...orderWhereClause,
        status: ORDER_STATUS.RETURNED
      })
    ]);

    // Calculate total revenue using calculateOrderRevenueByStatus (single source of truth)
    const totalRevenue = totalRevenueOrders.reduce((sum, order: any) => {
      const orderData = {
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        securityDeposit: order.securityDeposit || 0,
        damageFee: order.damageFee || 0,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        updatedAt: order.updatedAt
      };
      return sum + calculateOrderRevenueByStatus(orderData);
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
        pickup: activeOrders, // activeOrders = PICKUPED orders
        completed: completedOrders,
        cancelled: cancelledOrders,
        returned: returnedOrders
      },
      todayOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        customerName: order.customer ? formatFullName(order.customer.firstName, order.customer.lastName) || 'Guest' : 'Guest',
        outletName: order.outlet?.name || 'Unknown',
        createdAt: order.createdAt?.toISOString() || null,
        pickupPlanAt: order.pickupPlanAt?.toISOString() || null,
        returnPlanAt: order.returnPlanAt?.toISOString() || null,
        productNames: (order as any).orderItems?.map((item: any) => item.product?.name).filter(Boolean).join(', ') || 'N/A'
      }))
    };

    // Generate ETag for caching
    const responseData = ResponseBuilder.success('DASHBOARD_DATA_SUCCESS', dashboardData);
    const dataString = JSON.stringify(responseData);
    const etag = crypto.createHash('md5').update(dataString).digest('hex');
    
    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return NextResponse.json(responseData, { status: API.STATUS.OK, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
