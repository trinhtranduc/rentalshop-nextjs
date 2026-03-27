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

export const simplifiedEmbeddingJobs = {
  enqueue: async (input: EnqueueInput) => {
    const { productId, source = 'manual', priority = 0, maxAttempts = 5 } = input;

    // Avoid flooding queue with duplicate pending/running jobs for same product.
    const existing = await prismaAny.embeddingJob.findFirst({
      where: {
        productId,
        status: { in: ['PENDING', 'RUNNING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      return existing;
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

  processPending: async (options?: { batchSize?: number }) => {
    const batchSize = Math.max(1, Math.min(50, options?.batchSize ?? 5));
    let processed = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    const pendingJobs = await prismaAny.embeddingJob.findMany({
      where: {
        status: 'PENDING',
        nextRunAt: { lte: new Date() }
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
        await generateProductEmbedding(job.productId);
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
  }
};
