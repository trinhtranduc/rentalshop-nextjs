/**
 * #1095 — the admin image-search monitor: newest jobs of one status, counts per status, and progress of the
 * last run (jobs touched since it started) with a time-left estimate from the jobs finished in the last 10 min.
 * Ids are the integer EmbeddingJob / Product / Merchant ids (these models have no CUID).
 */
import { prisma } from '@rentalshop/database';
import { parseProductImages } from '@rentalshop/utils';

export const JOB_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const ERROR_MAX = 300;
const RATE_WINDOW_MIN = 10;

export type EmbeddingJobsQuery = { merchantId?: number; status: JobStatus; since: Date; limit: number; page?: number };

/** Jobs of one status for a shop (or all) touched since `since` */
function jobsWhere(status: JobStatus, merchantId: number | undefined, since: Date) {
  return { status, ...(merchantId ? { product: { merchantId } } : {}), updatedAt: { gte: since } };
}

const JOB_SELECT = {
  id: true,
  productId: true,
  status: true,
  attempts: true,
  maxAttempts: true,
  updatedAt: true,
  lastError: true,
  product: { select: { id: true, name: true, images: true, merchantId: true, merchant: { select: { name: true } } } },
} as const;
const ORDER = [{ updatedAt: 'desc' as const }, { id: 'desc' as const }];

type JobRecord = {
  id: number;
  productId: number;
  status: string;
  attempts: number;
  maxAttempts: number;
  updatedAt: Date | string;
  lastError: string | null;
  product: { id: number; name: string; images: unknown; merchantId: number; merchant: { name: string } | null } | null;
};

function toRow(job: JobRecord) {
  return {
    jobId: job.id,
    productId: job.product?.id ?? job.productId,
    productName: job.product?.name ?? '',
    thumbnail: parseProductImages(job.product?.images)[0] ?? null,
    merchantId: job.product?.merchantId ?? null,
    merchantName: job.product?.merchant?.name ?? '',
    status: job.status as JobStatus,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    updatedAt: new Date(job.updatedAt).toISOString(),
    lastError: job.lastError ? String(job.lastError).slice(0, ERROR_MAX) : null,
  };
}

export async function getEmbeddingJobs({ merchantId, status, since, limit, page = 1 }: EmbeddingJobsQuery) {
  const shop = merchantId ? { product: { merchantId } } : {};
  const recent = { updatedAt: { gte: since } };

  const jobs: JobRecord[] = await prisma.embeddingJob.findMany({
    where: jobsWhere(status, merchantId, since),
    orderBy: ORDER,
    skip: (page - 1) * limit,
    take: limit,
    select: JOB_SELECT,
  });

  const counts = {} as Record<JobStatus, number>;
  for (const s of JOB_STATUSES) {
    counts[s] = await prisma.embeddingJob.count({ where: { status: s, ...shop, ...recent } });
  }

  const completedLast10Min = await prisma.embeddingJob.count({
    where: { status: 'COMPLETED', ...shop, finishedAt: { gte: new Date(Date.now() - RATE_WINDOW_MIN * 60_000) } },
  });
  const perMinute = completedLast10Min / RATE_WINDOW_MIN;
  const pending = counts.PENDING;

  return {
    rows: jobs.map(toRow),
    page,
    limit,
    total: counts[status],
    counts,
    progress: {
      since: since.toISOString(),
      total: counts.PENDING + counts.RUNNING + counts.COMPLETED + counts.FAILED,
      done: counts.COMPLETED,
      running: counts.RUNNING,
      failed: counts.FAILED,
      pending,
      completedLast10Min,
      etaMinutes: pending === 0 ? 0 : perMinute > 0 ? Math.ceil(pending / perMinute) : null,
    },
  };
}

export const CSV_MAX_ROWS = 10000;
const CSV_BATCH = 1000;
const CSV_HEADER = ['productId', 'productName', 'shop', 'status', 'attempts', 'updatedAt', 'lastError'];

/** RFC 4180 field; a value that a spreadsheet would run as a formula gets a leading quote */
export function csvField(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * #1095: the jobs of one tab as CSV lines (header first), read 1000 at a time, at most CSV_MAX_ROWS rows,
 * so a big queue is never loaded at once.
 */
export async function* embeddingJobsCsv(query: Omit<EmbeddingJobsQuery, 'limit' | 'page'>): AsyncGenerator<string> {
  yield CSV_HEADER.join(',') + '\r\n';
  for (let skip = 0; skip < CSV_MAX_ROWS; skip += CSV_BATCH) {
    const jobs: JobRecord[] = await prisma.embeddingJob.findMany({
      where: jobsWhere(query.status, query.merchantId, query.since),
      orderBy: ORDER,
      skip,
      take: Math.min(CSV_BATCH, CSV_MAX_ROWS - skip),
      select: JOB_SELECT,
    });
    if (jobs.length === 0) break;
    let chunk = '';
    for (const row of jobs.map(toRow)) {
      chunk +=
        [row.productId, row.productName, row.merchantName, row.status, `${row.attempts}/${row.maxAttempts}`, row.updatedAt, row.lastError]
          .map(csvField)
          .join(',') + '\r\n';
    }
    yield chunk;
    if (jobs.length < CSV_BATCH) break;
  }
}
