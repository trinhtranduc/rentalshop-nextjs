/**
 * #1095 — GET /api/admin/embedding-jobs: the admin monitor's jobs table, counts per tab and progress of the last run.
 * ADMIN only; filter by status, shop and `since`; newest first; error text trimmed; ETA from the last 10 minutes.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  // `new NextResponse(stream, init)` (the CSV) is a plain Response here; `.json` as in the other route tests
  NextResponse: Object.assign(
    function NextResponse(body: any, init?: any) {
      return new Response(body, init);
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
  ),
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
    findMany: jest.fn(async ({ where, take, skip = 0 }: any) =>
      jobs
        .filter((j) => matches(j, where))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id)
        .slice(skip, skip + take)
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

  it('pages: page 2 skips the first page and every answer says the total of the tab', async () => {
    const first: any = await GET(req('ADMIN', '?status=COMPLETED&limit=1'));
    expect(first.body.data).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(first.body.data.rows.map((r: any) => r.jobId)).toEqual([13]);
    const second: any = await GET(req('ADMIN', '?status=COMPLETED&limit=1&page=2'));
    expect(second.body.data).toMatchObject({ page: 2, total: 2 });
    expect(second.body.data.rows.map((r: any) => r.jobId)).toEqual([14]);
    expect(((await GET(req('ADMIN', '?page=0'))) as any).status).toBe(400);
  });
});

describe('GET /api/admin/embedding-jobs?format=csv', () => {
  async function csv(query: string) {
    const res: any = await GET(req('ADMIN', query));
    return { res, text: await res.text() };
  }

  it('is ADMIN only', async () => {
    const res: any = await GET(req('OPS', '?status=COMPLETED&format=csv'));
    expect(res.status).toBe(403);
  });

  it('downloads the tab as CSV with a header, one line per job, quoted fields and the same filters', async () => {
    jobs.push({ id: 20, productId: 4, status: 'FAILED', attempts: 2, maxAttempts: 5, updatedAt: minutesAgo(6), finishedAt: null, lastError: 'bad "quote", comma\nnew line' });
    const { res, text } = await csv('?status=FAILED&format=csv');
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const lines = text.trim().split('\r\n');
    expect(lines[0]).toBe('productId,productName,shop,status,attempts,updatedAt,lastError');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(`3,Váy cưới,Linh Phương Beauty,FAILED,5/5,${minutesAgo(5).toISOString()},${'x'.repeat(300)}`);
    expect(lines[2]).toBe(`4,Vest,Áo dài Bình Dương,FAILED,2/5,${minutesAgo(6).toISOString()},"bad ""quote"", comma\nnew line"`.replace('\\n', '\n'));

    const shopOnly = await csv('?status=FAILED&format=csv&merchantId=28');
    expect(shopOnly.text.trim().split('\r\n')).toHaveLength(2);
  });

  it('a value that starts like a formula is neutralised', async () => {
    products[1].name = '=HYPERLINK("x")';
    const { text } = await csv('?status=RUNNING&format=csv');
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
    products[1].name = 'Áo dài gấm đỏ';
  });

  it('stops at 10000 rows and reads the jobs in batches', async () => {
    const many: Job[] = [];
    for (let i = 0; i < 10005; i++) {
      many.push({ id: 1000 + i, productId: 1, status: 'COMPLETED', attempts: 1, maxAttempts: 5, updatedAt: minutesAgo(1), finishedAt: minutesAgo(1), lastError: null });
    }
    jobs = many;
    const { text } = await csv('?status=COMPLETED&format=csv');
    expect(text.trim().split('\r\n')).toHaveLength(10001); // header + 10000
    const takes = mockPrisma.embeddingJob.findMany.mock.calls.map((c: any) => c[0].take);
    expect(Math.max(...takes)).toBeLessThanOrEqual(1000);
  });
});

