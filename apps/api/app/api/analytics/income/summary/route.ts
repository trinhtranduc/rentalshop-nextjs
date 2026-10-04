import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { computeIncomePeriodSummary } from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';
import { readAnalyticsTimeZone, readCivilRange } from '../../../../../lib/analytics-days';

/**
 * GET /api/analytics/income/summary
 * Period totals (startDate–endDate) + optional daily breakdown.
 * Supports any duration: single day, 7d, 30d, custom range, year.
 * Days are civil days of the shop (Asia/Ho_Chi_Minh) or of a valid `timeZone` param (#355).
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

      const timeZone = readAnalyticsTimeZone(searchParams);
      if (!timeZone) {
        return NextResponse.json(ResponseBuilder.error('INVALID_QUERY'), { status: API.STATUS.BAD_REQUEST });
      }
      const range = readCivilRange(startDate, endDate, timeZone);
      if (!range) {
        return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), {
          status: API.STATUS.BAD_REQUEST
        });
      }
      if (range.start > range.end) {
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
        includeDailyPeriods: true,
        timeZone
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
