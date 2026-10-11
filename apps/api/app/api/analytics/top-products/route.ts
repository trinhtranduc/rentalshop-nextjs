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
  computeTopProductsByShop,
  parseRankingQuery,
  resolveAnalyticsOutletFilter
} from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';
import { narrowAnalyticsOutletFilter } from '../../../../lib/analytics-outlets';

/**
 * GET /api/analytics/top-products
 * Products ranked per shop by revenue or quantity in the date range.
 *
 * Query: startDate, endDate, sortBy=revenue|quantity, page, limit,
 * outletIds? (#827, `1,3`: MERCHANT narrows to some of its outlets; another shop's → 403; ignored for outlet roles)
 */
export const GET = withPermissions(['analytics.view.products'])(
  async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const { page, limit, sortBy } = parseRankingQuery(searchParams);

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

      const scoped = narrowAnalyticsOutletFilter(
        await resolveAnalyticsOutletFilter(db, user, userScope),
        user.role,
        searchParams.get('outletIds')
      );
      if (!scoped.ok) {
        return NextResponse.json(ResponseBuilder.error(scoped.code), { status: scoped.status });
      }
      const outletFilter = scoped.filter;
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

      const topProducts = await computeTopProductsByShop(prisma, {
        outletFilter,
        rangeStart: start,
        rangeEnd: end,
        sortBy,
        page,
        limit
      });

      return NextResponse.json(ResponseBuilder.success('TOP_PRODUCTS_SUCCESS', topProducts));
    } catch (error) {
      console.error('Error fetching top products analytics:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

export const runtime = 'nodejs';
