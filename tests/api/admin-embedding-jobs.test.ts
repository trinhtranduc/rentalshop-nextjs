/**
 * #1095 — GET /api/admin/embedding-jobs: the admin monitor's jobs table, counts per tab and progress of the last run.
 * ADMIN only; filter by status, shop and `since`; newest first; error text trimmed; ETA from the last 10 minutes.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockRoles: string[][] = [];
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: (roles: string[]) => {
    mockRoles.push(roles);
    return (handler: any) => (request: any) =>
      roles.includes(request.role)
        ? handler(request, { user: { id: 1, role: request.role }, userScope: {} })
        : { body: { success: false, code: 'INSUFFICIENT_PERMISSIONS' }, status: 403 };
  },
}));

type Job = {
  id: number;
  productId: number;
  status: string;
  attempts: number;
  maxAttempts: number;
  updatedAt: Date;
  finishedAt: Date | null;
  lastError: string | null;
};
const NOW = new Date('2026-10-19T13:30:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const products: Record<number, { id: number; name: string; images: any; merchantId: number }> = {
  1: { id: 1, name: 'Áo dài gấm đỏ', images: ['https://cdn.test/1.jpg', 'https://cdn.test/1b.jpg'], merchantId: 276 },
  2: { id: 2, name: 'Áo dài lụa hồng', images: '["https://cdn.test/2.jpg"]', merchantId: 276 },
  3: { id: 3, name: 'Váy cưới', images: [], merchantId: 276 },
  4: { id: 4, name: 'Vest', images: ['https://cdn.test/4.jpg'], merchantId: 28 },
};
const merchants: Record<number, string> = { 276: 'Linh Phương Beauty', 28: 'Áo dài Bình Dương' };
let jobs: Job[] = [];

function matches(j: Job, where: any): boolean {
  if (where?.status && j.status !== where.status) return false;
  if (where?.product?.merchantId && products[j.productId].merchantId !== where.product.merchantId) return false;
  if (where?.updatedAt?.gte && j.updatedAt < where.updatedAt.gte) return false;
  if (where?.finishedAt?.gte && (!j.finishedAt || j.finishedAt < where.finishedAt.gte)) return false;
  return true;
}

const mockPrisma = {
  embeddingJob: {
    findMany: jest.fn(async ({ where, take }: any) =>
      jobs
        .filter((j) => matches(j, where))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id)
        .slice(0, take)
        .map((j) => {
          const p = products[j.productId];
          return { ...j, product: { id: p.id, name: p.name, images: p.images, merchantId: p.merchantId, merchant: { name: merchants[p.merchantId] } } };
        }),
    ),
    count: jest.fn(async ({ where }: any) => jobs.filter((j) => matches(j, where)).length),
  },
};
const mockDb = { merchants: { findById: jest.fn(async (id: number) => (merchants[id] ? { id } : null)) } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/utils/product-image-helpers'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/admin/embedding-jobs/route';

const req = (role: string, query = '') => ({ role, url: `http://api.test/api/admin/embedding-jobs${query}` }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW });
  jobs = [
    { id: 10, productId: 1, status: 'RUNNING', attempts: 1, maxAttempts: 5, updatedAt: minutesAgo(1), finishedAt: null, lastError: null },
    { id: 11, productId: 2, status: 'PENDING', attempts: 0, maxAttempts: 5, updatedAt: minutesAgo(3), finishedAt: null, lastError: null },
    { id: 12, productId: 3, status: 'FAILED', attempts: 5, maxAttempts: 5, updatedAt: minutesAgo(5), finishedAt: minutesAgo(5), lastError: 'x'.repeat(900) },
    { id: 13, productId: 1, status: 'COMPLETED', attempts: 1, maxAttempts: 5, updatedAt: minutesAgo(4), finishedAt: minutesAgo(4), lastError: null },
    { id: 14, productId: 2, status: 'COMPLETED', attempts: 1, maxAttempts: 5, updatedAt: minutesAgo(8), finishedAt: minutesAgo(8), lastError: null },
    { id: 15, productId: 1, status: 'COMPLETED', attempts: 1, maxAttempts: 5, updatedAt: minutesAgo(60 * 30), finishedAt: minutesAgo(60 * 30), lastError: null }, // older than 24 h
    { id: 16, productId: 4, status: 'PENDING', attempts: 0, maxAttempts: 5, updatedAt: minutesAgo(2), finishedAt: null, lastError: null }, // other shop
  ];
});
afterEach(() => jest.useRealTimers());

describe('GET /api/admin/embedding-jobs', () => {
  it('is ADMIN only', async () => {
    expect(mockRoles).toContainEqual(['ADMIN']);
    const res: any = await GET(req('MERCHANT'));
    expect(res.status).toBe(403);
  });

  it('lists the running jobs by default, newest first, with product, shop and first photo', async () => {
    const res: any = await GET(req('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toEqual([
      {
        jobId: 10,
        productId: 1,
        productName: 'Áo dài gấm đỏ',
        thumbnail: 'https://cdn.test/1.jpg',
        merchantId: 276,
        merchantName: 'Linh Phương Beauty',
        status: 'RUNNING',
        attempts: 1,
        maxAttempts: 5,
        updatedAt: minutesAgo(1).toISOString(),
        lastError: null,
      },
    ]);
  });

  it('filters by status and shop; counts per tab use the same shop and since (default 24 h)', async () => {
    const res: any = await GET(req('ADMIN', '?status=COMPLETED&merchantId=276'));
    expect(res.body.data.rows.map((r: any) => r.jobId)).toEqual([13, 14]);
    expect(res.body.data.counts).toEqual({ PENDING: 1, RUNNING: 1, COMPLETED: 2, FAILED: 1 });
  });

  it('trims the error text and keeps a product with no photo', async () => {
    const res: any = await GET(req('ADMIN', '?status=FAILED'));
    const row = res.body.data.rows[0];
    expect(row.thumbnail).toBeNull();
    expect(row.lastError.length).toBeLessThanOrEqual(300);
  });

  it('progress of the last run counts jobs since `since` and estimates the time left from the last 10 minutes', async () => {
    const since = minutesAgo(9).toISOString();
    const res: any = await GET(req('ADMIN', `?merchantId=276&since=${encodeURIComponent(since)}`));
    expect(res.body.data.progress).toEqual({
      since,
      total: 5,
      done: 2,
      running: 1,
      failed: 1,
      pending: 1,
      completedLast10Min: 2,
      etaMinutes: 5, // 1 waiting at 2 done / 10 min → 5 min
    });
  });

  it('eta is null when nothing completed in the last 10 minutes', async () => {
    jobs = jobs.filter((j) => j.status !== 'COMPLETED');
    const res: any = await GET(req('ADMIN', '?merchantId=276'));
    expect(res.body.data.progress.etaMinutes).toBeNull();
  });

  it('rejects a bad status, limit or date and an unknown shop', async () => {
    expect(((await GET(req('ADMIN', '?status=DONE'))) as any).status).toBe(400);
    expect(((await GET(req('ADMIN', '?limit=500'))) as any).status).toBe(400);
    expect(((await GET(req('ADMIN', '?since=yesterday'))) as any).status).toBe(400);
    expect(((await GET(req('ADMIN', '?merchantId=999'))) as any).status).toBe(404);
  });

  it('caps the rows at limit', async () => {
    const res: any = await GET(req('ADMIN', '?status=COMPLETED&limit=1'));
    expect(res.body.data.rows).toHaveLength(1);
  });
});
