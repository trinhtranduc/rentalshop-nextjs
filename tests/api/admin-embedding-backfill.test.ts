/**
 * #1017 — admin backfill of image-search embeddings across all merchants.
 * ADMIN only; dry run writes nothing; a second run queues 0; merchantId filter; FAILED skipped unless asked.
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

type Product = { id: number; merchantId: number; images: any; embeddingGeneratedAt: Date | null; isActive: boolean; deletedAt: Date | null };
type Job = { id: number; productId: number; status: string; source?: string; priority?: number; createdAt: number };

const store: { products: Product[]; jobs: Job[]; seq: number } = { products: [], jobs: [], seq: 0 };

const mockPrisma = {
  product: {
    findMany: jest.fn(async ({ where, take }: any) =>
      store.products
        .filter((p) => p.isActive === where.isActive && p.deletedAt === null)
        .filter((p) => (where.merchantId ? p.merchantId === where.merchantId : true))
        .filter((p) => (where.id?.gt !== undefined ? p.id > where.id.gt : true))
        .sort((a, b) => a.id - b.id)
        .slice(0, take)
        .map(({ id, merchantId, images, embeddingGeneratedAt }) => ({ id, merchantId, images, embeddingGeneratedAt })),
    ),
  },
  embeddingJob: {
    findMany: jest.fn(async ({ where }: any) =>
      store.jobs
        .filter((j) => where.productId.in.includes(j.productId))
        .sort((a, b) => a.productId - b.productId || b.createdAt - a.createdAt)
        .map(({ productId, status }) => ({ productId, status })),
    ),
    // #1087: `all` turns a waiting job into a forced re-embed instead of adding a second one
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const j of store.jobs) {
        if (where.productId.in.includes(j.productId) && j.status === where.status) {
          Object.assign(j, data);
          count += 1;
        }
      }
      return { count };
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const row of data) store.jobs.push({ id: ++store.seq, createdAt: store.seq, ...row });
      return { count: data.length };
    }),
    count: jest.fn(async ({ where }: any) => {
      const merchantId = where?.product?.merchantId;
      return store.jobs.filter((j) => {
        const p = store.products.find((x) => x.id === j.productId);
        return j.status === where.status && (!merchantId || p?.merchantId === merchantId);
      }).length;
    }),
  },
  merchant: {
    findMany: jest.fn(async ({ where }: any) =>
      where.id.in.map((id: number) => ({ id, name: `Shop ${id}` })),
    ),
  },
};

const mockDb = {
  merchants: { findById: jest.fn(async (id: number) => ([10, 20].includes(id) ? { id } : null)) },
  embeddingJobs: { processPending: jest.fn(async () => ({ queued: 0, processed: 0, completed: 0, failed: 0, skipped: 0 })) },
};
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

import { GET, POST } from '../../apps/api/app/api/admin/embedding-backfill/route';

function req(role: string, body?: any, url = 'http://api.test/api/admin/embedding-backfill') {
  return { role, url, json: async () => (body === undefined ? {} : body) } as any;
}

const img = ['https://cdn.test/a.jpg'];
function product(id: number, merchantId: number, extra: Partial<Product> = {}): Product {
  return { id, merchantId, images: img, embeddingGeneratedAt: null, isActive: true, deletedAt: null, ...extra };
}

beforeEach(() => {
  jest.clearAllMocks();
  store.seq = 0;
  store.jobs = [];
  store.products = [
    product(1, 10),
    product(2, 10),
    product(3, 10, { embeddingGeneratedAt: new Date() }), // already indexed
    product(4, 10, { images: [] }), // no photo
    product(5, 10, { isActive: false }), // inactive
    product(6, 10, { deletedAt: new Date() }), // soft deleted
    product(7, 20),
    product(8, 20, { images: '["https://cdn.test/b.jpg"]' }), // JSON string images
  ];
});

describe('role guard', () => {
  it('the handlers ask for ADMIN only', () => {
    expect(mockRoles.length).toBeGreaterThan(0);
    mockRoles.forEach((roles) => expect(roles).toEqual(['ADMIN']));
  });

  it.each(['OPS', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])('rejects %s', async (role) => {
    expect((await GET(req(role))).status).toBe(403);
    expect((await POST(req(role, {}))).status).toBe(403);
    expect(mockPrisma.embeddingJob.createMany).not.toHaveBeenCalled();
  });
});

describe('GET status', () => {
  it('counts active, non-deleted products with photos and jobs by status', async () => {
    store.jobs.push({ id: 99, productId: 7, status: 'FAILED', createdAt: 0 });
    const res: any = await GET(req('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual({ withImages: 5, missingEmbedding: 4, withEmbedding: 1 });
    expect(res.body.data.jobs).toEqual({ PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 1 });
    expect(res.body.data.topMerchants).toEqual([
      { id: 10, name: 'Shop 10', missingEmbedding: 2 },
      { id: 20, name: 'Shop 20', missingEmbedding: 2 },
    ]);
  });

  it('filters by merchantId and rejects a bad or unknown one', async () => {
    const res: any = await GET(req('ADMIN', undefined, 'http://api.test/api/admin/embedding-backfill?merchantId=20'));
    expect(res.body.data.products).toEqual({ withImages: 2, missingEmbedding: 2, withEmbedding: 0 });
    expect((await GET(req('ADMIN', undefined, 'http://api.test/x?merchantId=abc'))).status).toBe(400);
    expect((await GET(req('ADMIN', undefined, 'http://api.test/x?merchantId=999'))).status).toBe(404);
  });
});

describe('POST backfill', () => {
  it('dry run returns the counts and writes nothing', async () => {
    const res: any = await POST(req('ADMIN', { dryRun: true }));
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('EMBEDDING_BACKFILL_DRY_RUN');
    expect(res.body.data).toMatchObject({ dryRun: true, merchants: 2, products: 4, queued: 4, skippedAlreadyQueued: 0 });
    expect(mockPrisma.embeddingJob.createMany).not.toHaveBeenCalled();
    expect(mockDb.embeddingJobs.processPending).not.toHaveBeenCalled();
    expect(store.jobs).toHaveLength(0);
  });

  it('queues the missing ones, kicks the runner, and a second call queues 0', async () => {
    const first: any = await POST(req('ADMIN', {}));
    expect(first.body.code).toBe('EMBEDDING_BACKFILL_QUEUED');
    expect(first.body.data).toMatchObject({ dryRun: false, merchants: 2, products: 4, queued: 4, skippedAlreadyQueued: 0 });
    expect(store.jobs.map((j) => j.productId).sort()).toEqual([1, 2, 7, 8]);
    expect(store.jobs.every((j) => j.status === 'PENDING' && j.source === 'admin-backfill')).toBe(true);
    expect(mockDb.embeddingJobs.processPending).toHaveBeenCalledWith({ batchSize: 3 });

    const second: any = await POST(req('ADMIN', {}));
    expect(second.body.data).toMatchObject({ queued: 0, skippedAlreadyQueued: 4, merchants: 0 });
    expect(store.jobs).toHaveLength(4);
  });

  it('skips a product with a RUNNING job', async () => {
    store.jobs.push({ id: 50, productId: 1, status: 'RUNNING', createdAt: 0 });
    const res: any = await POST(req('ADMIN', { dryRun: true }));
    expect(res.body.data).toMatchObject({ queued: 3, skippedAlreadyQueued: 1 });
  });

  it('only that merchant with merchantId', async () => {
    const res: any = await POST(req('ADMIN', { merchantId: 20 }));
    expect(res.body.data).toMatchObject({ merchantId: 20, merchants: 1, products: 2, queued: 2 });
    expect(store.jobs.map((j) => j.productId).sort()).toEqual([7, 8]);
  });

  it('skips products whose last job FAILED unless includeFailed', async () => {
    store.jobs.push({ id: 60, productId: 2, status: 'FAILED', createdAt: 0 });
    const skip: any = await POST(req('ADMIN', { dryRun: true }));
    expect(skip.body.data).toMatchObject({ queued: 3, skippedFailed: 1 });
    const retry: any = await POST(req('ADMIN', { dryRun: true, includeFailed: true }));
    expect(retry.body.data).toMatchObject({ queued: 4, skippedFailed: 0 });
  });

  // #1029: the admin confirm count is the dry run, not GET missingEmbedding (which still counts queued products)
  it('after a run, GET still counts them missing but the dry run the confirm uses says 0 to queue', async () => {
    await POST(req('ADMIN', {}));
    const status: any = await GET(req('ADMIN'));
    expect(status.body.data.products.missingEmbedding).toBe(4);
    expect(status.body.data.jobs.PENDING).toBe(4);
    const check: any = await POST(req('ADMIN', { dryRun: true }));
    expect(check.body.data).toMatchObject({ dryRun: true, products: 4, queued: 0, skippedAlreadyQueued: 4 });
    expect(store.jobs).toHaveLength(4);
  });

  it.each([false, true])('dry run queued equals what the real run queues (includeFailed %s)', async (includeFailed) => {
    store.jobs.push({ id: 70, productId: 1, status: 'RUNNING', createdAt: 0 });
    store.jobs.push({ id: 71, productId: 2, status: 'FAILED', createdAt: 1 });
    const check: any = await POST(req('ADMIN', { dryRun: true, includeFailed }));
    const real: any = await POST(req('ADMIN', { includeFailed }));
    expect(check.body.data.queued).toBe(includeFailed ? 3 : 2);
    expect(real.body.data.queued).toBe(check.body.data.queued);
  });

  it('rejects a bad body and an unknown merchant', async () => {
    expect((await POST(req('ADMIN', { dryRun: 'yes' }))).status).toBe(400);
    expect((await POST(req('ADMIN', { merchantId: 999 }))).status).toBe(404);
    expect(mockPrisma.embeddingJob.createMany).not.toHaveBeenCalled();
  });
});

// #1087: a model change needs every product re-embedded into the new collection
describe('POST backfill with all', () => {
  it('dry run counts every active product with photos, also indexed and failed ones, and writes nothing', async () => {
    store.jobs.push({ id: 80, productId: 2, status: 'FAILED', createdAt: 0 });
    const res: any = await POST(req('ADMIN', { all: true, dryRun: true }));
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('EMBEDDING_BACKFILL_DRY_RUN');
    expect(res.body.data).toMatchObject({
      all: true, dryRun: true, products: 5, queued: 5, merchants: 2, skippedAlreadyQueued: 0, skippedFailed: 0, upgradedPending: 0,
    });
    expect(mockPrisma.embeddingJob.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.embeddingJob.updateMany).not.toHaveBeenCalled();
  });

  it('queues forced jobs, turns a waiting job into a forced one, skips a running one', async () => {
    store.jobs.push({ id: 81, productId: 1, status: 'PENDING', source: 'admin-backfill', createdAt: 0 });
    store.jobs.push({ id: 82, productId: 7, status: 'RUNNING', source: 'admin-backfill', createdAt: 1 });
    const res: any = await POST(req('ADMIN', { all: true }));
    expect(res.body.code).toBe('EMBEDDING_BACKFILL_QUEUED');
    expect(res.body.data).toMatchObject({ all: true, products: 5, queued: 3, upgradedPending: 1, skippedAlreadyQueued: 1 });
    const pending = store.jobs.filter((j) => j.status === 'PENDING');
    expect(pending.map((j) => j.productId).sort()).toEqual([1, 2, 3, 8]);
    expect(pending.every((j) => j.source === 'manual-force')).toBe(true);
    expect(store.jobs.find((j) => j.id === 82)?.source).toBe('admin-backfill');
    expect(mockDb.embeddingJobs.processPending).toHaveBeenCalledWith({ batchSize: 3 });
  });

  it('a second run adds nothing', async () => {
    await POST(req('ADMIN', { all: true }));
    const again: any = await POST(req('ADMIN', { all: true }));
    expect(again.body.data).toMatchObject({ queued: 0, upgradedPending: 5 });
    expect(store.jobs).toHaveLength(5);
  });

  it('without all the old behaviour stays (no all field change in counts)', async () => {
    const res: any = await POST(req('ADMIN', { dryRun: true }));
    expect(res.body.data).toMatchObject({ all: false, products: 4, queued: 4, upgradedPending: 0 });
  });

  it('rejects a non-boolean all', async () => {
    expect((await POST(req('ADMIN', { all: 'yes' }))).status).toBe(400);
  });
});


// #1089: one shop at a time — its jobs go first and can be processed in the request
describe('POST backfill for one shop', () => {
  it('new jobs of the chosen shop get priority 5; system-wide ones keep 1', async () => {
    await POST(req('ADMIN', { merchantId: 20 }));
    expect(store.jobs.map((j) => j.priority)).toEqual([5, 5]);
    store.jobs = [];
    await POST(req('ADMIN', {}));
    expect(store.jobs.every((j) => j.priority === 1)).toBe(true);
  });

  it("raises that shop's waiting jobs to 5 and reports them; other shops untouched", async () => {
    store.jobs.push({ id: 90, productId: 7, status: 'PENDING', priority: 1, createdAt: 0 });
    store.jobs.push({ id: 91, productId: 1, status: 'PENDING', priority: 1, createdAt: 1 });
    const res: any = await POST(req('ADMIN', { merchantId: 20 }));
    expect(res.body.data).toMatchObject({ queued: 1, skippedAlreadyQueued: 1, prioritized: 1 });
    expect(store.jobs.find((j) => j.id === 90)?.priority).toBe(5);
    expect(store.jobs.find((j) => j.id === 91)?.priority).toBe(1);
  });

  it('dry run raises nothing; without merchantId prioritized is 0', async () => {
    store.jobs.push({ id: 92, productId: 7, status: 'PENDING', priority: 1, createdAt: 0 });
    const dry: any = await POST(req('ADMIN', { merchantId: 20, dryRun: true }));
    expect(dry.body.data.prioritized).toBe(1);
    expect(store.jobs.find((j) => j.id === 92)?.priority).toBe(1);
    const all: any = await POST(req('ADMIN', { dryRun: true }));
    expect(all.body.data.prioritized).toBe(0);
  });

  it('processSeconds runs that shop’s batches in the request until one processes nothing', async () => {
    mockDb.embeddingJobs.processPending
      .mockResolvedValueOnce({ queued: 5, processed: 5, completed: 4, failed: 1, skipped: 0 })
      .mockResolvedValueOnce({ queued: 2, processed: 2, completed: 2, failed: 0, skipped: 0 })
      .mockResolvedValueOnce({ queued: 0, processed: 0, completed: 0, failed: 0, skipped: 0 });
    const res: any = await POST(req('ADMIN', { merchantId: 20, all: true, processSeconds: 45 }));
    expect(res.status).toBe(200);
    expect(mockDb.embeddingJobs.processPending).toHaveBeenCalledTimes(3);
    expect(mockDb.embeddingJobs.processPending).toHaveBeenCalledWith({ batchSize: 5, merchantId: 20 });
    expect(res.body.data.processing).toEqual({ batches: 3, processed: 7, completed: 6, failed: 1 });
  });

  it('processSeconds 0 or a dry run keeps the old kick and adds no processing', async () => {
    const run: any = await POST(req('ADMIN', { merchantId: 20 }));
    expect(run.body.data.processing).toBeUndefined();
    expect(mockDb.embeddingJobs.processPending).toHaveBeenCalledWith({ batchSize: 3 });
    jest.clearAllMocks();
    const dry: any = await POST(req('ADMIN', { merchantId: 20, dryRun: true, processSeconds: 30 }));
    expect(dry.body.data.processing).toBeUndefined();
    expect(mockDb.embeddingJobs.processPending).not.toHaveBeenCalled();
  });

  it('rejects processSeconds out of 0–60 or not a number', async () => {
    expect((await POST(req('ADMIN', { merchantId: 20, processSeconds: 61 }))).status).toBe(400);
    expect((await POST(req('ADMIN', { merchantId: 20, processSeconds: -1 }))).status).toBe(400);
    expect((await POST(req('ADMIN', { merchantId: 20, processSeconds: '30' }))).status).toBe(400);
  });
});
