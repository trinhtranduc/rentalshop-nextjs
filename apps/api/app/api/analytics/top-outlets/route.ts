import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import {
  handleApiError,
  ResponseBuilder,
  normalizeStartDate,
  normalizeEndDate
} from '@rentalshop/utils';
import {
  computeTopOutletsRanking,
  parseRankingQuery,
  resolveAnalyticsOutletFilter
} from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/top-outlets
 * Shops (outlets) ranked by revenue in the date range.
 *
 * Query: startDate, endDate (YYYY-MM-DD), page, limit (default 5, max 100)
 */
export const GET = withPermissions(['analytics.view.orders'])(
  async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const { page, limit } = parseRankingQuery(searchParams);

      if (!startDate || !endDate) {
        return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const start = normalizeStartDate(startDate);
      const end = normalizeEndDate(endDate);
      if (!start || !end || start > end) {
        return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const outletFilter = await resolveAnalyticsOutletFilter(db, user, userScope);
      if (outletFilter === null) {
        return NextResponse.json(
          ResponseBuilder.success('NO_DATA_AVAILABLE', {
            items: [],
            page: 1,
            limit,
            total: 0,
            totalPages: 1
          })
        );
      }

      const topOutlets = await computeTopOutletsRanking(prisma, {
        outletFilter,
        rangeStart: start,
        rangeEnd: end,
        page,
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
