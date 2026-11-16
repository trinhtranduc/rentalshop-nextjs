import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { formatDateKeyInTimeZone, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { readAnalyticsTimeZone } from '../../../../lib/analytics-days';
import { AiSummaryError, aiSummaryAvailable, writeSummaryWithClaude } from '../../../../lib/weekly-summary/claude';
import { resolveSummaryLanguage } from '../../../../lib/weekly-summary/prompt';
import { readWeeklySummary, summaryScope, writeWeeklySummary } from '../../../../lib/weekly-summary/service';

/**
 * #1612 AI summary of last week (Monday..Sunday, civil days of `timeZone`, default Asia/Ho_Chi_Minh).
 *
 * GET  — the stored summary and whether the AI is on; never calls AI. `status` NONE = not opened yet this week.
 * POST — returns the stored summary, or writes it now: once per scope (whole shop for MERCHANT, own branch for
 *        OUTLET_ADMIN) and week, shared by the app and the web. No activity in the week → NO_ORDERS without AI.
 *        503 AI_SUMMARY_UNAVAILABLE when ANTHROPIC_API_KEY is unset; 502 AI_SUMMARY_FAILED when the AI call fails
 *        (nothing stored, the next tap retries).
 *
 * Query: timeZone (optional IANA zone, like the analytics routes). The text follows Accept-Language.
 */
async function handle(request: Request, user: any, userScope: any, write: boolean) {
  try {
    const { searchParams } = new URL(request.url);
    const timeZone = readAnalyticsTimeZone(searchParams);
    if (!timeZone) {
      return NextResponse.json(ResponseBuilder.error('INVALID_QUERY'), { status: API.STATUS.BAD_REQUEST });
    }
    const scope = summaryScope(user, userScope);
    if (!scope) {
      return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
    }
    const todayKey = formatDateKeyInTimeZone(new Date(), timeZone);
    if (!write) {
      const data = await readWeeklySummary(prisma, scope, todayKey);
      return NextResponse.json(ResponseBuilder.success('AI_WEEKLY_SUMMARY_SUCCESS', data));
    }
    const stored = await readWeeklySummary(prisma, scope, todayKey);
    if (stored.status !== 'NONE') {
      return NextResponse.json(ResponseBuilder.success('AI_WEEKLY_SUMMARY_SUCCESS', stored));
    }
    if (!aiSummaryAvailable()) {
      return NextResponse.json(ResponseBuilder.error('AI_SUMMARY_UNAVAILABLE'), { status: 503 });
    }
    const data = await writeWeeklySummary(prisma, db, writeSummaryWithClaude, {
      scope,
      user,
      userScope,
      todayKey,
      timeZone,
      language: resolveSummaryLanguage(request.headers.get('accept-language'))
    });
    return NextResponse.json(ResponseBuilder.success('AI_WEEKLY_SUMMARY_SUCCESS', data));
  } catch (error) {
    if (error instanceof AiSummaryError) {
      console.error('AI weekly summary failed:', error.message);
      return NextResponse.json(ResponseBuilder.error('AI_SUMMARY_FAILED'), { status: 502 });
    }
    console.error('Error in weekly summary:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) =>
  handle(request, user, userScope, false)
);

export const POST = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) =>
  handle(request, user, userScope, true)
);

export const runtime = 'nodejs';
// Writing can take a few seconds (one Claude call)
export const maxDuration = 60;
