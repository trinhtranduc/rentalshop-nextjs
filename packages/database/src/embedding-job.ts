import { prisma } from './client';
import { generateProductEmbedding } from './jobs/generate-product-embeddings';
import { parseProductImages } from '@rentalshop/utils';

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
  },

  /**
   * Scan a shop catalog and queue CLIP jobs for products that have photos
   * but are not indexed yet (`embeddingGeneratedAt` set = skip).
   */
  queueShopImageIndex: async (input: {
    merchantId: number;
    force?: boolean;
  }): Promise<{
    scanned: number;
    skippedIndexed: number;
    skippedNoImages: number;
    queued: number;
  }> => {
    const { merchantId, force = false } = input;

    const products = await prismaAny.product.findMany({
      where: { merchantId, isActive: true },
      select: { id: true, images: true, embeddingGeneratedAt: true }
    });

    let skippedIndexed = 0;
    let skippedNoImages = 0;
    const toQueue: number[] = [];

    for (const product of products) {
      const images = parseProductImages(product.images);
      if (images.length === 0) {
        skippedNoImages += 1;
        continue;
      }
      if (!force && product.embeddingGeneratedAt) {
        skippedIndexed += 1;
        continue;
      }
      toQueue.push(product.id);
    }

    let queued = toQueue.length;
    if (toQueue.length > 0) {
      const pending = await prismaAny.embeddingJob.findMany({
        where: { productId: { in: toQueue }, status: 'PENDING' },
        select: { productId: true }
      });
      const pendingIds = new Set(pending.map((row: { productId: number }) => row.productId));
      const fresh = toQueue.filter((id) => !pendingIds.has(id));
      queued = fresh.length;
      if (fresh.length > 0) {
        await prismaAny.embeddingJob.createMany({
          data: fresh.map((productId: number) => ({
            productId,
            source: force ? 'manual-force' : 'shop-index',
            priority: 5,
            status: 'PENDING'
          }))
        });
      }
    }

    void simplifiedEmbeddingJobs
      .processPending({ batchSize: 5 })
      .catch((error: any) => {
        console.error('[Shop image index] processPending failed:', error?.message || error);
      });

    return {
      scanned: products.length,
      skippedIndexed,
      skippedNoImages,
      queued
    };
  }
};
