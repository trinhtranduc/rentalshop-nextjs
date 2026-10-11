/**
 * #654 — a job left RUNNING by a restart is reclaimed: back to PENDING while
 * attempts remain, FAILED after maxAttempts.
 */
const mockJobs = { findMany: jest.fn(), updateMany: jest.fn() };
jest.mock('../packages/database/src/client', () => ({ prisma: { embeddingJob: mockJobs } }));
jest.mock('../packages/database/src/jobs/generate-product-embeddings', () => ({
  generateProductEmbedding: jest.fn(),
}));

import {
  getEmbeddingJobStaleMinutes,
  simplifiedEmbeddingJobs,
} from '../packages/database/src/embedding-job';

const now = new Date('2026-10-08T03:00:00.000Z');
const startedAt = new Date('2026-10-08T02:30:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.EMBEDDING_JOB_STALE_MINUTES;
  mockJobs.updateMany.mockResolvedValue({ count: 1 });
});

it('defaults to 15 minutes, overridable by EMBEDDING_JOB_STALE_MINUTES', () => {
  expect(getEmbeddingJobStaleMinutes()).toBe(15);
  process.env.EMBEDDING_JOB_STALE_MINUTES = '30';
  expect(getEmbeddingJobStaleMinutes()).toBe(30);
  process.env.EMBEDDING_JOB_STALE_MINUTES = 'nope';
  expect(getEmbeddingJobStaleMinutes()).toBe(15);
});

it('looks only at RUNNING jobs started before now - staleMinutes', async () => {
  mockJobs.findMany.mockResolvedValue([]);
  await simplifiedEmbeddingJobs.reclaimStale({ now });
  const where = mockJobs.findMany.mock.calls[0][0].where;
  expect(where.status).toBe('RUNNING');
  expect(where.OR[0].startedAt.lt.toISOString()).toBe('2026-10-08T02:45:00.000Z');
});

it('moves a stuck job with attempts left back to PENDING, runnable now', async () => {
  mockJobs.findMany.mockResolvedValue([{ id: 1, attempts: 2, maxAttempts: 5, startedAt }]);

  const result = await simplifiedEmbeddingJobs.reclaimStale({ now });

  expect(result).toEqual({ reclaimed: 1, failed: 0 });
  const call = mockJobs.updateMany.mock.calls[0][0];
  expect(call.where).toEqual({ id: 1, status: 'RUNNING', startedAt });
  expect(call.data).toMatchObject({ status: 'PENDING', nextRunAt: now, startedAt: null });
  expect(call.data.lastError).toMatch(/Reclaimed/);
});

it('marks a stuck job that used all attempts as FAILED', async () => {
  mockJobs.findMany.mockResolvedValue([{ id: 2, attempts: 5, maxAttempts: 5, startedAt }]);

  const result = await simplifiedEmbeddingJobs.reclaimStale({ now });

  expect(result).toEqual({ reclaimed: 0, failed: 1 });
  expect(mockJobs.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'FAILED', finishedAt: now });
});

it('does not count a job that finished between the read and the update', async () => {
  mockJobs.findMany.mockResolvedValue([{ id: 3, attempts: 1, maxAttempts: 5, startedAt }]);
  mockJobs.updateMany.mockResolvedValue({ count: 0 });

  expect(await simplifiedEmbeddingJobs.reclaimStale({ now })).toEqual({ reclaimed: 0, failed: 0 });
});
