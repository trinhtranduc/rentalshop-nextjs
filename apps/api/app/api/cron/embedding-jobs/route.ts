import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

/** Constant-time compare so the secret cannot be guessed from response timing */
function sameSecret(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (
    sameSecret(request.headers.get('authorization'), `Bearer ${cronSecret}`) ||
    sameSecret(request.headers.get('x-cron-secret'), cronSecret)
  );
}

/**
 * POST /api/cron/embedding-jobs
 * Reclaim jobs stuck in RUNNING, then process pending embedding jobs.
 *
 * Authorization (route-managed, see lib/route-auth.ts):
 *   Authorization: Bearer ${CRON_SECRET}   or   x-cron-secret: ${CRON_SECRET}
 *
 * Railway cron (a small cron service, dev first; see .agent/changes/654-image-search-quality/plan.md):
 *   Schedule:  every 5 minutes (cron expression in that plan.md)
 *   Command:   curl -fsS -X POST "$API_URL/api/cron/embedding-jobs?batchSize=10" \
 *                -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(ResponseBuilder.error('UNAUTHORIZED'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchSizeParam = Number(searchParams.get('batchSize') || '5');
    const batchSize = Number.isFinite(batchSizeParam) ? batchSizeParam : 5;

    const reclaim = await db.embeddingJobs.reclaimStale();
    const result = await db.embeddingJobs.processPending({ batchSize });
    return NextResponse.json(
      ResponseBuilder.success('EMBEDDING_JOBS_PROCESSED', {
        ...result,
        reclaimed: reclaim.reclaimed,
        reclaimFailed: reclaim.failed
      })
    );
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function GET() {
  return NextResponse.json(
    ResponseBuilder.success('EMBEDDING_JOBS_CRON_HEALTHY', {
      healthy: true,
      timestamp: new Date().toISOString()
    })
  );
}
