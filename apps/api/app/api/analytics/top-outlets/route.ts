import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  computeTopOutletsByOrderCount,
  resolveAnalyticsOutletFilter
} from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/top-outlets
 * Shops (outlets) with the most orders in the date range.
 *
 * Query: startDate, endDate (YYYY-MM-DD), limit (default 5, max 50)
 */
export const GET = withPermissions(['analytics.view.orders'])(
  async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const parsedLimit = parseInt(searchParams.get('limit') || '5', 10);
      const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 5;

      if (!startDate || !endDate) {
        return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const outletFilter = await resolveAnalyticsOutletFilter(db, user, userScope);
      if (outletFilter === null) {
        return NextResponse.json(ResponseBuilder.success('NO_DATA_AVAILABLE', []));
      }

      const topOutlets = await computeTopOutletsByOrderCount(prisma, {
        outletFilter,
        rangeStart: start,
        rangeEnd: end,
        limit
      });

      return NextResponse.json(ResponseBuilder.success('TOP_OUTLETS_SUCCESS', topOutlets));
    } catch (error) {
      console.error('Error fetching top outlets analytics:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

export const runtime = 'nodejs';
