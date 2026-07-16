import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  buildAnalyticsPeriodReport,
  emptyAnalyticsPeriodReport,
  resolveAnalyticsOutletFilter
} from '@rentalshop/utils/server';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/analytics/overview
 *
 * Backward-compatible alias for GET /api/analytics/period with `groupBy=month`.
 * Prefer /api/analytics/period for new mobile/web clients (single duration API).
 *
 * Query params: startDate, endDate (required), limit? (top lists, default 3)
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const parsedLimit = parseInt(searchParams.get('limit') || '3', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 3;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const outletFilter = await resolveAnalyticsOutletFilter(db, user, userScope);

    if (outletFilter === null) {
      const empty = emptyAnalyticsPeriodReport(startDate, endDate, 'month');
      return NextResponse.json(
        ResponseBuilder.success('ANALYTICS_OVERVIEW_SUCCESS', {
          income: empty.series,
          growth: empty.growth,
          statistics: { totalOrders: 0, totalRevenue: 0, statusBreakdown: {} },
          periodSummary: null,
          topProducts: [],
          topCustomers: []
        })
      );
    }

    const report = await buildAnalyticsPeriodReport(prisma, db, {
      startDate,
      endDate,
      groupBy: 'month',
      limit,
      outletFilter,
      userRole: user.role
    });

    let statistics = { totalOrders: 0, totalRevenue: 0, statusBreakdown: {} as Record<string, number> };
    try {
      const stats = await db.orders.getStatistics({
        merchantId: userScope.merchantId,
        outletId:
          user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF || user.role === USER_ROLE.OUTLET_MANAGER
            ? userScope.outletId
            : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      statistics = {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        statusBreakdown: stats.statusBreakdown
      };
    } catch (statsError) {
      console.error('Analytics overview statistics section failed:', statsError);
    }

    return NextResponse.json(
      ResponseBuilder.success('ANALYTICS_OVERVIEW_SUCCESS', {
        income: report.series,
        growth: report.growth,
        statistics,
        periodSummary: report.operational,
        topProducts: report.topProducts,
        topCustomers: report.topCustomers
      })
    );
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
