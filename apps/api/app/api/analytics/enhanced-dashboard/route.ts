import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/enhanced-dashboard - Get comprehensive dashboard analytics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Use provided dates or default to today/thisMonth
    const now = new Date();
    let today: Date;
    let thisMonth: Date;
    let lastMonth: Date;
    let lastMonthEnd: Date;
    
    if (startDateParam && endDateParam) {
      // Use provided date range
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      
      // For "today" view (same start and end date)
      today = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      // For "month" or "year" view
      thisMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endDate = new Date(end);
      
      // Calculate last period for comparison
      if (start.getMonth() === end.getMonth()) {
        // Same month - compare with last month
        lastMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
        lastMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59);
      } else {
        // Year view - compare with last year
        lastMonth = new Date(start.getFullYear() - 1, 0, 1);
        lastMonthEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59);
      }
    } else {
      // Default to current dates
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

    // Build where clause - NO merchantId needed, DB is isolated
    let orderWhereClause: any = {};
    let paymentWhereClause: any = {};
    let outletStockWhereClause: any = {};

    // Outlet filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.outletId) {
        orderWhereClause.outletId = user.outletId;
        paymentWhereClause.order = { outletId: user.outletId };
        outletStockWhereClause.outletId = user.outletId;
      }
    }

    // Determine date range based on parameters
    const start = startDateParam ? new Date(startDateParam) : today;
    const end = endDateParam ? new Date(endDateParam + 'T23:59:59') : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Get today's orders (for startDate to endDate range)
    const [todayOrdersData, todayOrdersCount] = await Promise.all([
      db.order.findMany({
        where: {
          ...orderWhereClause,
          createdAt: { gte: start, lte: end }
        },
        take: 1000
      }),
      db.order.count({
        where: {
          ...orderWhereClause,
          createdAt: { gte: start, lte: end }
        }
      })
    ]);
    const todayOrders = { data: todayOrdersData, total: todayOrdersCount };

    // Get this month/period's orders (same as today for the provided range)
    const thisMonthOrders = todayOrders;

    // Get last month's orders
    const [lastMonthOrdersData, lastMonthOrdersCount] = await Promise.all([
      db.order.findMany({
        where: {
          ...orderWhereClause,
          createdAt: { gte: lastMonth, lte: lastMonthEnd }
        },
        take: 1000
      }),
      db.order.count({
        where: {
          ...orderWhereClause,
          createdAt: { gte: lastMonth, lte: lastMonthEnd }
        }
      })
    ]);
    const lastMonthOrders = { data: lastMonthOrdersData, total: lastMonthOrdersCount };

    // Get active rentals - Orders that are currently being rented out
    const [activeRentalsData, activeRentalsCount] = await Promise.all([
      db.order.findMany({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED'
        },
        take: 1000
      }),
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED'
        }
      })
    ]);
    const activeRentals = { data: activeRentalsData, total: activeRentalsCount };
    
    // Get today's pickups - Orders that were picked up TODAY
    const [todayPickupsData, todayPickupsCount] = await Promise.all([
      db.order.findMany({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED',
          pickedUpAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
          }
        },
        take: 1000
      }),
      db.order.count({
        where: {
          ...orderWhereClause,
          status: 'PICKUPED',
          pickedUpAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
          }
        }
      })
    ]);
    const todayPickups = { data: todayPickupsData, total: todayPickupsCount };

    // Get stock metrics
    const stockMetrics = await db.outletStock.aggregate({
      where: outletStockWhereClause,
      _sum: {
        stock: true,
        available: true,
        renting: true
      }
    }).catch(() => ({
      _sum: {
        stock: 0,
        available: 0,
        renting: 0
      }
    }));

    // Calculate metrics
    const todayRevenue = todayOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
    const thisMonthRevenue = thisMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthOrders.data?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;

    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    // Debug logs to trace the issue
    console.log('🔍 Enhanced Dashboard Debug:', {
      dateRange: { start, end },
      todayOrdersTotal: todayOrders.total,
      todayOrdersDataLength: todayOrders.data?.length,
      todayRevenue,
      thisMonthOrdersTotal: thisMonthOrders.total,
      thisMonthOrdersDataLength: thisMonthOrders.data?.length,
      thisMonthRevenue,
      activeRentalsTotal: activeRentals.total
    });

    const dashboardData = {
      today: {
        orders: todayOrders.total || 0,
        revenue: todayRevenue
      },
      thisMonth: {
        orders: thisMonthOrders.total || 0,
        revenue: thisMonthRevenue
      },
      activeRentals: activeRentals.total || 0,  // Total active rentals (all time)
      todayPickups: todayPickups.total || 0,    // Rentals picked up today
      stock: {
        total: stockMetrics._sum?.stock || 0,
        available: stockMetrics._sum?.available || 0,
        renting: stockMetrics._sum?.renting || 0
      },
      growth: {
        revenue: Math.round(revenueGrowth * 100) / 100
      }
    };

    return NextResponse.json(
      ResponseBuilder.success('DASHBOARD_DATA_SUCCESS', dashboardData)
    );

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});