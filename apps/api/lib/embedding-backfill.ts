/**
 * #1017 — admin backfill of image-search embeddings across all merchants.
 *
 * A candidate is an active, non-deleted product with at least one image. The backfill queues one
 * EmbeddingJob per candidate that has no embedding yet; the existing runner (`db.embeddingJobs.processPending`,
 * kicked here and drained by `/api/cron/embedding-jobs`) does the work.
 */
import { prisma } from '@rentalshop/database';
import { parseProductImages } from '@rentalshop/utils';

const SCAN_BATCH = 1000;
const WRITE_BATCH = 500;
const TOP_MERCHANTS = 10;
const JOB_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;

export const BACKFILL_SOURCE = 'admin-backfill';
/** #1087: re-embed even with a recent embedding (the job runner forces this source past the cooldown) */
export const REINDEX_SOURCE = 'manual-force';
export const BACKFILL_PRIORITY = 1;

type Candidate = { id: number; merchantId: number; hasEmbedding: boolean };

/** Active, non-deleted products with images, read in id order so a big catalog is not loaded at once. */
async function scanCandidates(merchantId?: number): Promise<Candidate[]> {
  const out: Candidate[] = [];
  let cursor: number | undefined;
  for (;;) {
    const rows: Array<{ id: number; merchantId: number; images: unknown; embeddingGeneratedAt: Date | null }> =
      await prisma.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(merchantId ? { merchantId } : {}),
          ...(cursor !== undefined ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, merchantId: true, images: true, embeddingGeneratedAt: true },
        orderBy: { id: 'asc' },
        take: SCAN_BATCH,
      });
    for (const row of rows) {
      if (parseProductImages(row.images).length === 0) continue;
      out.push({ id: row.id, merchantId: row.merchantId, hasEmbedding: row.embeddingGeneratedAt != null });
    }
    if (rows.length < SCAN_BATCH) break;
    cursor = rows[rows.length - 1].id;
  }
  return out;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getEmbeddingBackfillStatus(merchantId?: number) {
  const candidates = await scanCandidates(merchantId);
  const missing = candidates.filter((c) => !c.hasEmbedding);

  const jobs: Record<string, number> = {};
  for (const status of JOB_STATUSES) {
    jobs[status] = await prisma.embeddingJob.count({
      where: { status, ...(merchantId ? { product: { merchantId } } : {}) },
    });
  }

  const perMerchant = new Map<number, number>();
  for (const c of missing) perMerchant.set(c.merchantId, (perMerchant.get(c.merchantId) ?? 0) + 1);
  const top = [...perMerchant.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_MERCHANTS);
  const names: Array<{ id: number; name: string }> = top.length
    ? await prisma.merchant.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(names.map((m) => [m.id, m.name]));

  return {
    merchantId: merchantId ?? null,
    products: {
      withImages: candidates.length,
      missingEmbedding: missing.length,
      withEmbedding: candidates.length - missing.length,
    },
    jobs,
    topMerchants: top.map(([id, count]) => ({ id, name: nameById.get(id) ?? '', missingEmbedding: count })),
  };
}

export type BackfillOptions = { merchantId?: number; includeFailed?: boolean; dryRun?: boolean; all?: boolean };

/**
 * `all` (#1087, model change): every product with photos is re-embedded, also those with an embedding or a
 * failed last job. A waiting job becomes a forced one (no second job); a running one is left alone.
 */
export async function runEmbeddingBackfill(options: BackfillOptions) {
  const { merchantId, includeFailed = false, dryRun = false, all = false } = options;
  const candidates = await scanCandidates(merchantId);
  const missing = all ? candidates : candidates.filter((c) => !c.hasEmbedding);

  const toQueue: Candidate[] = [];
  const toUpgrade: number[] = [];
  let skippedAlreadyQueued = 0;
  let skippedFailed = 0;

  for (const batch of chunks(missing, WRITE_BATCH)) {
    const ids = batch.map((c) => c.id);
    // Latest job first per product: decides "already queued" and "last job failed".
    const jobs: Array<{ productId: number; status: string }> = await prisma.embeddingJob.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, status: true },
      orderBy: [{ productId: 'asc' }, { createdAt: 'desc' }],
    });
    const active = new Set<number>();
    const pending = new Set<number>();
    const latest = new Map<number, string>();
    for (const job of jobs) {
      if (job.status === 'PENDING' || job.status === 'RUNNING') active.add(job.productId);
      if (job.status === 'PENDING') pending.add(job.productId);
      if (!latest.has(job.productId)) latest.set(job.productId, job.status);
    }
    for (const c of batch) {
      if (all && pending.has(c.id)) toUpgrade.push(c.id);
      else if (active.has(c.id)) skippedAlreadyQueued += 1;
      else if (all) toQueue.push(c);
      else if (!includeFailed && latest.get(c.id) === 'FAILED') skippedFailed += 1;
      else toQueue.push(c);
    }
  }

  if (!dryRun) {
    for (const ids of chunks(toUpgrade, WRITE_BATCH)) {
      await prisma.embeddingJob.updateMany({
        where: { productId: { in: ids }, status: 'PENDING' },
        data: { source: REINDEX_SOURCE },
      });
    }
    for (const batch of chunks(toQueue, WRITE_BATCH)) {
      await prisma.embeddingJob.createMany({
        data: batch.map((c) => ({
          productId: c.id,
          source: all ? REINDEX_SOURCE : BACKFILL_SOURCE,
          priority: BACKFILL_PRIORITY,
          status: 'PENDING',
        })),
      });
    }
  }

  return {
    merchantId: merchantId ?? null,
    dryRun,
    all,
    merchants: new Set(toQueue.map((c) => c.merchantId)).size,
    products: missing.length,
    queued: toQueue.length,
    skippedAlreadyQueued,
    skippedFailed,
    upgradedPending: toUpgrade.length,
  };
}
