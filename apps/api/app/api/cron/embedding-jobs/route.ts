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
 *
 * #1087 `maxSeconds` (0–270, default 0): 0 = one batch as before. Above 0, batches run until one processes
 * nothing or the time is used (a batch is not started after the budget), e.g. `?batchSize=20&maxSeconds=240`
 * every 5 minutes for a full re-index.
 */
const MAX_SECONDS_CAP = 270;

type BatchResult = { queued: number; processed: number; completed: number; failed: number; skipped: number };
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(ResponseBuilder.error('UNAUTHORIZED'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchSizeParam = Number(searchParams.get('batchSize') || '5');
    const batchSize = Number.isFinite(batchSizeParam) ? batchSizeParam : 5;
    const maxSecondsParam = searchParams.get('maxSeconds');
    const maxSeconds = maxSecondsParam === null ? 0 : Number(maxSecondsParam);
    if (!Number.isFinite(maxSeconds) || maxSeconds < 0) {
      return NextResponse.json(ResponseBuilder.error('VALIDATION_ERROR'), { status: 400 });
    }
    const budgetMs = Math.min(maxSeconds, MAX_SECONDS_CAP) * 1000;

    const reclaim = await db.embeddingJobs.reclaimStale();
    const startedAt = Date.now();
    const result: BatchResult = { queued: 0, processed: 0, completed: 0, failed: 0, skipped: 0 };
    let batches = 0;
    for (;;) {
      const batch: BatchResult = await db.embeddingJobs.processPending({ batchSize });
      batches += 1;
      result.queued += batch.queued;
      result.processed += batch.processed;
      result.completed += batch.completed;
      result.failed += batch.failed;
      result.skipped += batch.skipped;
      if (budgetMs === 0 || batch.processed === 0 || Date.now() - startedAt >= budgetMs) break;
    }
    return NextResponse.json(
      ResponseBuilder.success('EMBEDDING_JOBS_PROCESSED', {
        ...result,
        batches,
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
