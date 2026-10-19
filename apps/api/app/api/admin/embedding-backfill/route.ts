/**
 * #1017 — admin backfill of image-search embeddings across all merchants.
 *
 * GET  /api/admin/embedding-backfill[?merchantId=N]
 *   ADMIN only. Counts for active, non-deleted products with images: withImages, missingEmbedding,
 *   withEmbedding; EmbeddingJob counts by status; top 10 merchants by missing count.
 *
 * POST /api/admin/embedding-backfill  { merchantId?, includeFailed?, dryRun?, all? }
 *   ADMIN only. Queues one embedding job per product missing an embedding. Skips products with a
 *   PENDING/RUNNING job, and products whose last job FAILED unless includeFailed. dryRun writes nothing.
 *   `all` (#1087, model change): every product with photos, forced re-embed; a waiting job is upgraded.
 *   After queuing, kicks the in-process runner without waiting; `/api/cron/embedding-jobs` drains the rest.
 *   #1089: with `merchantId` that shop's jobs get priority 5 (waiting ones raised, `prioritized`), and
 *   `processSeconds` (0–60) runs that shop's batches in the request for up to that budget (`processing`).
 *
 * Ids are the integer Merchant.id (these models have no CUID).
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { z } from 'zod';
import { getEmbeddingBackfillStatus, runEmbeddingBackfill } from '../../../../lib/embedding-backfill';

export const runtime = 'nodejs';

const withAdminOnly = withAuthRoles(['ADMIN'], { requireActiveSubscription: false });

const statusQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
});

const backfillBodySchema = z.object({
  merchantId: z.number().int().positive().optional(),
  includeFailed: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  all: z.boolean().optional(),
  processSeconds: z.number().min(0).max(60).optional(),
});

/** #1089: batches of the shop's pending jobs until one processes nothing or the budget is used */
async function processForBudget(seconds: number, merchantId?: number) {
  const startedAt = Date.now();
  const total = { batches: 0, processed: 0, completed: 0, failed: 0 };
  for (;;) {
    const batch = await db.embeddingJobs.processPending({ batchSize: 5, ...(merchantId ? { merchantId } : {}) });
    total.batches += 1;
    total.processed += batch.processed;
    total.completed += batch.completed;
    total.failed += batch.failed;
    if (batch.processed === 0 || Date.now() - startedAt >= seconds * 1000) break;
  }
  return total;
}

async function merchantMissing(merchantId?: number): Promise<boolean> {
  if (!merchantId) return false;
  const merchant = await db.merchants.findById(merchantId);
  return !merchant;
}

export const GET = withAdminOnly(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = statusQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const { merchantId } = parsed.data;
    if (await merchantMissing(merchantId)) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });
    }

    const status = await getEmbeddingBackfillStatus(merchantId);
    return NextResponse.json(ResponseBuilder.success('EMBEDDING_BACKFILL_STATUS', status));
  } catch (error) {
    console.error('Error in GET /api/admin/embedding-backfill:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const POST = withAdminOnly(async (request: NextRequest) => {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = backfillBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const { merchantId, processSeconds = 0, ...options } = parsed.data;
    if (await merchantMissing(merchantId)) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });
    }

    const result = await runEmbeddingBackfill({ ...options, merchantId });

    if (!result.dryRun && processSeconds > 0) {
      const processing = await processForBudget(processSeconds, merchantId);
      return NextResponse.json(ResponseBuilder.success('EMBEDDING_BACKFILL_QUEUED', { ...result, processing }));
    }

    if (!result.dryRun && result.queued + result.upgradedPending > 0) {
      // Same kick as sync-embeddings: do not block the request; the cron drains the rest.
      void db.embeddingJobs.processPending({ batchSize: 3 }).catch((error: unknown) => {
        console.error('[Embedding backfill] processPending failed:', error instanceof Error ? error.message : error);
      });
    }

    return NextResponse.json(
      ResponseBuilder.success(result.dryRun ? 'EMBEDDING_BACKFILL_DRY_RUN' : 'EMBEDDING_BACKFILL_QUEUED', result)
    );
  } catch (error) {
    console.error('Error in POST /api/admin/embedding-backfill:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
