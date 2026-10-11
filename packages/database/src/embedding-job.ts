import { prisma } from './client';
import { generateProductEmbedding } from './jobs/generate-product-embeddings';

const prismaAny = prisma as any;

type EnqueueInput = {
  productId: number;
  source?: string;
  priority?: number;
  maxAttempts?: number;
};

function nextBackoff(attempts: number): Date {
  // Exponential backoff capped at 60 minutes
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/** A RUNNING job older than this is treated as lost (process restarted mid-job). */
export function getEmbeddingJobStaleMinutes(): number {
  const configured = Number(process.env.EMBEDDING_JOB_STALE_MINUTES);
  return Number.isFinite(configured) && configured > 0 ? configured : 15;
}

export const simplifiedEmbeddingJobs = {
  enqueue: async (input: EnqueueInput) => {
    const { productId, source = 'manual', priority = 0, maxAttempts = 5 } = input;

    // Dedupe PENDING only. A RUNNING create-job may still be embedding the
    // previous photo — an image update must queue a second pass.
    const existingPending = await prismaAny.embeddingJob.findFirst({
      where: {
        productId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPending) {
      return prismaAny.embeddingJob.update({
        where: { id: existingPending.id },
        data: {
          source,
          priority: Math.max(existingPending.priority ?? 0, priority)
        }
      });
    }

    return prismaAny.embeddingJob.create({
      data: {
        productId,
        source,
        priority,
        maxAttempts,
        status: 'PENDING'
      }
    });
  },

  /**
   * Reclaim jobs stuck in RUNNING (the worker died before it could finish).
   * `attempts` was already counted when the job was claimed, so a job that has
   * used all its attempts becomes FAILED; the rest go back to PENDING now.
   */
  reclaimStale: async (options?: { staleMinutes?: number; now?: Date; limit?: number }) => {
    const staleMinutes = options?.staleMinutes ?? getEmbeddingJobStaleMinutes();
    const now = options?.now ?? new Date();
    const cutoff = new Date(now.getTime() - staleMinutes * 60 * 1000);
    let reclaimed = 0;
    let failed = 0;

    const staleJobs = await prismaAny.embeddingJob.findMany({
      where: {
        status: 'RUNNING',
        OR: [
          { startedAt: { lt: cutoff } },
          { startedAt: null, updatedAt: { lt: cutoff } }
        ]
      },
      orderBy: { startedAt: 'asc' },
      take: Math.max(1, Math.min(500, options?.limit ?? 100))
    });

    for (const job of staleJobs) {
      const exhausted = (job.attempts ?? 0) >= (job.maxAttempts || 5);
      const lastError = `Reclaimed: RUNNING for more than ${staleMinutes} min (attempt ${job.attempts ?? 0}/${job.maxAttempts || 5})`;
      // Guard on status + startedAt so a job that just finished or was re-claimed is not touched.
      const result = await prismaAny.embeddingJob.updateMany({
        where: { id: job.id, status: 'RUNNING', startedAt: job.startedAt ?? null },
        data: exhausted
          ? { status: 'FAILED', finishedAt: now, startedAt: null, lastError }
          : { status: 'PENDING', nextRunAt: now, startedAt: null, finishedAt: null, lastError }
      });
      if (result.count === 0) continue;
      if (exhausted) failed += 1;
      else reclaimed += 1;
    }

    if (reclaimed + failed > 0) {
      console.warn(`[Embedding] Reclaimed ${reclaimed} stuck job(s), failed ${failed} (stale > ${staleMinutes} min)`);
    }
    return { reclaimed, failed };
  },

  processPending: async (options?: { batchSize?: number; productId?: number }) => {
    const batchSize = Math.max(1, Math.min(50, options?.batchSize ?? 5));
    let processed = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    const pendingJobs = await prismaAny.embeddingJob.findMany({
      where: {
        status: 'PENDING',
        nextRunAt: { lte: new Date() },
        ...(typeof options?.productId === 'number' ? { productId: options.productId } : {})
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: batchSize
    });

    for (const job of pendingJobs) {
      // Atomic claim: only one process can move this specific PENDING job to RUNNING.
      const claim = await prismaAny.embeddingJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null
        }
      });

      if (claim.count === 0) {
        skipped += 1;
        continue;
      }

      processed += 1;

      try {
        await generateProductEmbedding(job.productId, {
          force:
            job.source === 'product-update' ||
            job.source === 'product-create' ||
            job.source === 'merchant-product-create' ||
            job.source === 'manual-force'
        });
        await prismaAny.embeddingJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            finishedAt: new Date(),
            lastError: null
          }
        });
        completed += 1;
      } catch (error: any) {
        const reloaded = await prismaAny.embeddingJob.findUnique({ where: { id: job.id } });
        const attempts = reloaded?.attempts ?? job.attempts + 1;
        const retryable = attempts < (job.maxAttempts || 5);

        await prismaAny.embeddingJob.update({
          where: { id: job.id },
          data: {
            status: retryable ? 'PENDING' : 'FAILED',
            nextRunAt: retryable ? nextBackoff(attempts) : job.nextRunAt,
            finishedAt: retryable ? null : new Date(),
            startedAt: null,
            lastError: error?.message ? String(error.message).slice(0, 2000) : 'Unknown embedding error'
          }
        });

        failed += 1;
      }
    }

    return {
      queued: pendingJobs.length,
      processed,
      completed,
      failed,
      skipped
    };
  },

  /**
   * Enqueue a job and kick the worker without blocking the HTTP response.
   * Cron still drains leftover PENDING jobs if this isolate is frozen.
   */
  kickOff: (input: EnqueueInput) => {
    void (async () => {
      try {
        await simplifiedEmbeddingJobs.enqueue(input);
        await simplifiedEmbeddingJobs.processPending({
          batchSize: 1,
          productId: input.productId
        });
      } catch (error: any) {
        console.error(
          `[Embedding] kickOff failed for product ${input.productId}:`,
          error?.message || error
        );
      }
    })();
  },

  /**
   * Enqueue and wait until this product's pending job has been attempted.
   * Only for explicit Update image search — create/update product must not wait.
   */
  runNow: async (input: EnqueueInput) => {
    await simplifiedEmbeddingJobs.enqueue(input);
    return simplifiedEmbeddingJobs.processPending({
      batchSize: 1,
      productId: input.productId
    });
  }
};
