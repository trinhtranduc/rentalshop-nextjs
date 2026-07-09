import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { computeIncomePeriodSummary } from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income/summary
 * Period totals (startDate–endDate) + optional daily breakdown.
 * Supports any duration: single day, 7d, 30d, custom range, year.
 */
export const GET = withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])(
  async (request, { userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!startDate || !endDate) {
        return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const filterStart = new Date(startDate + 'T00:00:00.000Z');
      const filterEnd = new Date(endDate + 'T23:59:59.999Z');
      if (isNaN(filterStart.getTime()) || isNaN(filterEnd.getTime())) {
        return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), {
          status: API.STATUS.BAD_REQUEST
        });
      }
      if (filterStart > filterEnd) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const outletFilter: Record<string, unknown> = {};
      if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) outletFilter.outletId = outletObj.id;
      } else if (userScope.merchantId) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant?.outlets) {
          outletFilter.outletId = { in: merchant.outlets.map((o: { id: number }) => o.id) };
        }
      }

      const { summary, periods } = await computeIncomePeriodSummary(prisma, {
        startDate,
        endDate,
        outletFilter,
        includeDailyPeriods: true
      });

      return NextResponse.json(
        ResponseBuilder.success('INCOME_SUMMARY_SUCCESS', {
          startDate,
          endDate,
          summary,
          periods: periods ?? []
        })
      );
    } catch (error) {
      console.error('Error fetching income summary:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

export const runtime = 'nodejs';
