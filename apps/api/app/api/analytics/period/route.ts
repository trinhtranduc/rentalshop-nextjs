import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  buildAnalyticsPeriodReport,
  emptyAnalyticsPeriodReport,
  resolveAnalyticsOutletFilter
} from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/period
 *
 * Canonical duration-based analytics for mobile Overview (and web dashboards).
 *
 * Query params:
 *   - startDate (required, YYYY-MM-DD)
 *   - endDate   (required, YYYY-MM-DD)
 *   - groupBy   (optional) `day` | `month` — chart granularity (default: day if range ≤ 45 days, else month)
 *   - limit     (optional) top products/customers count (default 3, max 50)
 *
 * Response sections:
 *   - operational  — event-based order counts + deposit held/due (same as income/summary)
 *   - revenue      — totalRevenue, totalActualRevenue, totalOrders for the period
 *   - growth       — orders/revenue vs previous period of equal length (7d→prev 7d, 30d→prev 30d, year→prev year)
 *   - series       — chart points (daily or monthly)
 *   - topProducts  — top products by revenue in the period
 *   - topCustomers — top customers by spend in the period
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const parsedLimit = parseInt(searchParams.get('limit') || '3', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 3;

    if (!startDate || !endDate) {
      return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), {
        status: API.STATUS.BAD_REQUEST
      });
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), {
        status: API.STATUS.BAD_REQUEST
      });
    }

    const daySpan =
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const groupByParam = searchParams.get('groupBy');
    const groupBy: 'day' | 'month' =
      groupByParam === 'day' || groupByParam === 'month'
        ? groupByParam
        : daySpan <= 45
          ? 'day'
          : 'month';

    const outletFilter = await resolveAnalyticsOutletFilter(db, user, userScope);
    if (outletFilter === null) {
      return NextResponse.json(
        ResponseBuilder.success('ANALYTICS_PERIOD_SUCCESS', emptyAnalyticsPeriodReport(startDate, endDate, groupBy))
      );
    }

    const report = await buildAnalyticsPeriodReport(prisma, db, {
      startDate,
      endDate,
      groupBy,
      limit,
      outletFilter,
      userRole: user.role
    });

    return NextResponse.json(ResponseBuilder.success('ANALYTICS_PERIOD_SUCCESS', report));
  } catch (error) {
    console.error('Error fetching analytics period:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
