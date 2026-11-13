/**
 * #1536 GET /api/products?categoryIds=3,7 — products of any of several categories (web "Danh mục" filter, many picked).
 * Spec .agent/changes/1536-category-multi-filter (1-4). `categoryId` alone and calls without `categoryIds` are unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(false),
}));
jest.mock('@rentalshop/middleware', () => ({ searchRateLimiter: () => null }));

const stockRows = () => [
  { id: 1, stock: 8, renting: 2, available: 6, isListed: true, outlet: { id: 1, name: 'Main', address: null } },
  { id: 2, stock: 0, renting: 0, available: 0, isListed: false, outlet: { id: 3, name: 'Second', address: null } },
];
const product = (id: number) => ({
  id,
  name: `Product ${id}`,
  images: [],
  totalStock: 8,
  merchant: { id: 2, name: 'Shop' },
  category: { id: 1, name: 'Cat' },
  pricingOptions: [],
  outletStock: stockRows(),
});

const mockOutletCount = jest.fn(async () => 2);
const mockDb: any = {
  outlets: { findDefaultForMerchant: jest.fn(async () => null) },
  products: {
    search: jest.fn(async () => ({ data: [product(11)], total: 1, page: 1, limit: 50, hasMore: false })),
    findById: jest.fn(),
  },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  prisma: { outlet: { count: (...a: any[]) => (mockOutletCount as any)(...a), findMany: jest.fn(async () => []) } },
}));
jest.mock('../../apps/api/lib/product-list-effective-availability', () => ({
  ...jest.requireActual('../../apps/api/lib/product-list-effective-availability'),
  batchTodayEffectiveAvailability: jest.fn(async (products: { id: number }[]) => new Map(products.map((p) => [p.id, 6]))),
}));
jest.mock('@rentalshop/utils', () => ({
  productsQuerySchema: {
    safeParse: (q: any) => ({ success: true, data: { ...q, outletId: q.outletId ? Number(q.outletId) : undefined, page: 1, limit: 50 } }),
  },
  productCreateSchema: { safeParse: () => ({ success: false }) },
  productUpdateSchema: { parse: (d: any) => d },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  parseProductImages: () => [],
  normalizeImagesInput: (a: any) => a,
  combineProductImages: (a: any) => a,
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  generateStagingKey: jest.fn(),
  generateProductImageKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
}));
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: jest.fn().mockResolvedValue(null),
  createAuditHelper: () => ({ logCreate: () => Promise.resolve(), logUpdate: () => Promise.resolve() }),
  deleteFromS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  generateAccessUrl: jest.fn(),
  uploadToS3: jest.fn(),
  getBucketName: jest.fn(),
  extractS3KeyFromUrl: jest.fn(),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));

import { GET as LIST } from '../../apps/api/app/api/products/route';

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
const admin = { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} };
const branch = (role: string, outletId = 3) => ({
  user: { id: 5, role, merchantId: 2, outletId, email: `${role}@x` },
  userScope: { merchantId: 2, outletId },
});

function req(query = ''): any {
  return { url: `http://localhost/api/products?${query}`, headers: { get: () => null } };
}
const filtersOfLastSearch = () => (mockDb.products.search.mock.calls.at(-1) as any[])[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockOutletCount.mockResolvedValue(2);
  ctx = merchant;
});

describe('GET /api/products — categoryIds', () => {
  it('categoryIds=3,7 reaches the database layer as [3, 7]', async () => {
    const res: any = await LIST(req('categoryIds=3,7'));
    expect(res.status).toBe(200);
    expect(filtersOfLastSearch().categoryIds).toEqual([3, 7]);
  });

  it('drops junk, zero, negative and repeated ids', async () => {
    await LIST(req('categoryIds=3,abc,0,-1,3,%207,2.5'));
    expect(filtersOfLastSearch().categoryIds).toEqual([3, 7]);
  });

  it('nothing valid left: same filters as without it (no categoryIds key)', async () => {
    await LIST(req('categoryIds=abc,0'));
    expect('categoryIds' in filtersOfLastSearch()).toBe(false);
  });

  it('with categoryId too: categoryIds is passed (the database layer prefers it), categoryId stays as sent', async () => {
    await LIST(req('categoryId=5&categoryIds=3,7'));
    expect(filtersOfLastSearch()).toEqual(expect.objectContaining({ categoryId: '5', categoryIds: [3, 7] }));
  });

  it('a branch role keeps its own outlet scope with categoryIds', async () => {
    ctx = branch('OUTLET_STAFF', 3);
    await LIST(req('categoryIds=3,7'));
    expect(filtersOfLastSearch()).toEqual(expect.objectContaining({ outletId: 3, categoryIds: [3, 7] }));
  });
});
