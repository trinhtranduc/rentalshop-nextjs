/**
 * #830 — OUTLET_ADMIN and OUTLET_INVENTORY see the stock of the other active outlets of their shop, read only
 * (owner decision on #823). GET /api/products and GET /api/products/[id] add `otherOutlets` for those two roles.
 * OUTLET_STAFF, MERCHANT and ADMIN get no new field, and no existing field changes. The list uses one outlet query.
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

// Merchant 2: outlet 1 "Main", outlet 3 "Second", outlet 4 "Closed" (disabled), outlet 5 "New" (no stock rows).
// Merchant 9 owns outlet 7.
type OutletRow = { id: number; name: string; merchantId: number; isActive: boolean };
const outlets: OutletRow[] = [
  { id: 1, name: 'Main', merchantId: 2, isActive: true },
  { id: 3, name: 'Second', merchantId: 2, isActive: true },
  { id: 4, name: 'Closed', merchantId: 2, isActive: false },
  { id: 5, name: 'New', merchantId: 2, isActive: true },
  { id: 7, name: 'Other shop', merchantId: 9, isActive: true },
];

const stockRows = () => [
  { id: 'os1', stock: 15, renting: 3, available: 12, outlet: { id: 1, name: 'Main', address: null } },
  { id: 'os3', stock: 10, renting: 4, available: 6, outlet: { id: 3, name: 'Second', address: null } },
  { id: 'os4', stock: 9, renting: 0, available: 9, outlet: { id: 4, name: 'Closed', address: null } },
];
const product = (id: number) => ({
  id,
  name: `Product ${id}`,
  images: [],
  totalStock: 34,
  merchant: { id: 2, name: 'Shop' },
  category: { id: 1, name: 'Cat' },
  pricingOptions: [],
  outletStock: stockRows(),
});

const mockFindMany = jest.fn(async ({ where }: any) =>
  outlets
    .filter((o) => o.merchantId === where.merchantId && o.isActive === where.isActive && o.id !== where.id?.not)
    .sort((a, b) => a.id - b.id)
    .map((o) => ({ id: o.id, name: o.name }))
);

const mockDb: any = {
  outlets: { findDefaultForMerchant: jest.fn(async () => null) },
  products: {
    search: jest.fn(async () => ({ data: [product(11), product(12)], total: 2, page: 1, limit: 50, hasMore: false })),
    findById: jest.fn(async (id: number) => product(id)),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { outlet: { findMany: (...a: any[]) => (mockFindMany as any)(...a) } } }));

const mockBatch = jest.fn(async (products: { id: number }[]) => new Map(products.map((p) => [p.id, 12])));
jest.mock('../../apps/api/lib/product-list-effective-availability', () => ({
  ...jest.requireActual('../../apps/api/lib/product-list-effective-availability'),
  batchTodayEffectiveAvailability: (...args: any[]) => (mockBatch as any)(...args),
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
import { GET as DETAIL } from '../../apps/api/app/api/products/[id]/route';

const branch = (role: string) => ({
  user: { id: 5, role, merchantId: 2, outletId: 1, email: `${role}@x` },
  userScope: { merchantId: 2, outletId: 1 },
});
const merchant = () => ({ user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } });

function req(path: string, query = ''): any {
  return { url: `http://localhost${path}?${query}`, headers: { get: () => null } };
}
async function list(query = 'page=1&limit=25') {
  const res: any = await LIST(req('/api/products', query));
  expect(res.status).toBe(200);
  return res.body.data.products;
}
async function detail(id = 11) {
  const res: any = await DETAIL(req(`/api/products/${id}`), { params: { id: String(id) } });
  expect(res.status).toBe(200);
  return res.body.data;
}

const EXPECTED_OTHERS = [
  { outletId: 3, outletName: 'Second', stock: 10, available: 6, renting: 4 },
  { outletId: 5, outletName: 'New', stock: 0, available: 0, renting: 0 },
];

describe('#830 other outlets stock — product list', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY'])('%s gets otherOutlets: active outlets of its shop except its own', async (role) => {
    ctx = branch(role);
    const products = await list();
    expect(products.map((p: any) => p.otherOutlets)).toEqual([EXPECTED_OTHERS, EXPECTED_OTHERS]);
    // one outlet query for the whole page
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('keeps the existing fields: available today stays the own outlet (#837)', async () => {
    ctx = branch('OUTLET_ADMIN');
    const [p] = await list('page=1&limit=25&outletId=3');
    expect(mockBatch).toHaveBeenCalledWith(expect.any(Array), 1);
    expect(p.available).toBe(12);
    expect(p.effectiveAvailableToday).toBe(12);
    expect(p.totalStock).toBe(15);
    expect(p.renting).toBe(3);
    expect(p.outletStock.map((s: any) => s.outlet.id)).toEqual([1, 3, 4]);
  });

  it.each([
    ['OUTLET_STAFF', () => branch('OUTLET_STAFF')],
    ['MERCHANT', merchant],
  ])('%s gets no otherOutlets field and no extra query', async (_role, make) => {
    ctx = make();
    const products = await list();
    for (const p of products) expect(p).not.toHaveProperty('otherOutlets');
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('#830 other outlets stock — product detail', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY'])('%s gets otherOutlets on the detail', async (role) => {
    ctx = branch(role);
    const p = await detail();
    expect(p.otherOutlets).toEqual(EXPECTED_OTHERS);
    // existing outletStock unchanged
    expect(p.outletStock.map((s: any) => [s.outletId, s.stock, s.available, s.renting])).toEqual([
      [1, 15, 12, 3],
      [3, 10, 6, 4],
      [4, 9, 9, 0],
    ]);
  });

  it.each([
    ['OUTLET_STAFF', () => branch('OUTLET_STAFF')],
    ['MERCHANT', merchant],
  ])('%s gets no otherOutlets on the detail', async (_role, make) => {
    ctx = make();
    const p = await detail();
    expect(p).not.toHaveProperty('otherOutlets');
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
