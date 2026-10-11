import { handleApiError, ResponseBuilder, calculatePeriodRevenueBatch, listCivilDays, listCivilMonths } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth/server';
import { API, ORDER_STATUS } from '@rentalshop/constants';
import { monthKeysOf, readReportRange, reportRangeOfKeys, shopToday } from '../../../../lib/report-days';

/** `toLocaleDateString('en-US', { month: 'short' })` labels, fixed so the server zone never shifts them */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * GET /api/analytics/system - Get system analytics (Admin only)
 * 
 * Authorization: Only roles with 'system.manage' permission can access
 * - Automatically includes: ADMIN only
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['system.manage'])(async (request, { user, userScope }) => {
  console.log(`🔧 GET /api/analytics/system - Admin: ${user.email}`);
  
  try {

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    // Vietnam civil days (#594): the requested days (whole days: `new Date(key)` on both ends made "Today" an
    // empty window), else the current Vietnam month. Buckets and labels below are Vietnam days/months too.
    const todayKey = shopToday().dateKey;
    const requested = startDate && endDate ? readReportRange(startDate, endDate) : null;
    if (startDate && endDate && !requested) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), { status: API.STATUS.BAD_REQUEST });
    }
    const thisMonth = monthKeysOf(todayKey);
    const range = requested ?? reportRangeOfKeys(thisMonth.from, thisMonth.to);
    const dateStart = range.start;
    const dateEnd = range.end;

    // Fetch system metrics in parallel
    const [
      totalMerchants,
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      activeMerchants,
      newMerchantsThisMonth,
      newMerchantsThisYear,
      totalRevenue
    ] = await Promise.all([
      // Total merchants
      db.merchants.count({ where: { isActive: true } }),
      
      // Total outlets
      db.outlets.count({ where: { isActive: true } }),
      
      // Total users
      db.users.count({ where: { isActive: true } }),
      
      // Total products
      db.products.count({ where: { isActive: true } }),
      
      // Total customers
      db.customers.getStats({ where: { isActive: true } }),
      
      // Total orders
      db.orders.getStats(),
      
      // Active merchants (with recent activity in date range)
      db.merchants.count({ 
        where: { 
          isActive: true,
          outlets: {
            some: {
              orders: {
                some: { 
                  createdAt: { 
                    gte: dateStart,
                    lte: dateEnd
                  }
                }
              }
            }
          }
        }
      }),
      
      // New merchants in date range
      db.merchants.count({ 
        where: { 
          isActive: true,
          createdAt: { 
            gte: dateStart,
            lte: dateEnd
          }
        }
      }),
      
      // New merchants this year (keep for comparison)
      db.merchants.count({ 
        where: { 
          isActive: true,
          createdAt: {
            gte: reportRangeOfKeys(`${todayKey.slice(0, 4)}-01-01`, todayKey).start
          }
        }
      }),
      
      // Get orders in date range for revenue calculation (will use calculatePeriodRevenueBatch)
      db.orders.findManyLightweight({
        where: {
          status: { not: ORDER_STATUS.CANCELLED }, // Exclude cancelled orders
          OR: [
            { createdAt: { gte: dateStart, lte: dateEnd } },
            { pickedUpAt: { gte: dateStart, lte: dateEnd } },
            { returnedAt: { gte: dateStart, lte: dateEnd } },
            { updatedAt: { gte: dateStart, lte: dateEnd }, status: ORDER_STATUS.CANCELLED as any }
          ]
        },
        limit: 10000
      })
    ]);

    // Get merchant registration trends based on groupBy parameter
    const merchantTrends = [];
    
    // Buckets are Vietnam months / days of the range; labels keep their format ("Oct", "Oct 2")
    const buckets =
      groupBy === 'month'
        ? listCivilMonths(range.startKey, range.endKey).map((m) => ({
            start: m.start,
            end: m.end,
            label: MONTH_LABELS[m.month - 1],
          }))
        : groupBy === 'day'
          ? listCivilDays(range.startKey, range.endKey).map((d) => ({
              start: d.start,
              end: d.end,
              label: `${MONTH_LABELS[Number(d.dateKey.slice(5, 7)) - 1]} ${Number(d.dateKey.slice(8, 10))}`,
            }))
          : [];
    for (const bucket of buckets) {
      const newMerchants = await db.merchants.count({
        where: {
          isActive: true,
          createdAt: { gte: bucket.start, lte: bucket.end }
        }
      });

      const activeMerchants = await db.merchants.count({
        where: {
          isActive: true,
          createdAt: { lte: bucket.end }
        }
      });

      merchantTrends.push({
        month: bucket.label,
        newMerchants,
        activeMerchants
      });
    }

    // Calculate revenue using calculatePeriodRevenueBatch (single source of truth)
    const ordersForRevenue = totalRevenue?.data || [];
    const ordersData = ordersForRevenue.map((order: any) => ({
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      securityDeposit: order.securityDeposit || 0,
      damageFee: order.damageFee || 0,
      lateFee: order.lateFee || 0,
      pickupTotalAmount: order.pickupTotalAmount ?? null,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      updatedAt: order.updatedAt
    }));

    const { realIncome: calculatedRevenue } = calculatePeriodRevenueBatch(
      ordersData,
      dateStart,
      dateEnd
    );

    const systemMetrics = {
      totalMerchants,
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue: calculatedRevenue,
      activeMerchants,
      newMerchantsThisMonth: newMerchantsThisMonth, // New merchants in date range
      newMerchantsThisYear,
      merchantTrends
    };

    return NextResponse.json(
      ResponseBuilder.success('SYSTEM_ANALYTICS_SUCCESS', systemMetrics)
    );

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_SYSTEM_ANALYTICS_FAILED'),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
