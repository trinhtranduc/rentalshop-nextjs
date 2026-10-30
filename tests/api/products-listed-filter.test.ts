/**
 * #1341 (#1335) GET /api/products?listed=true — only the products listed at one branch.
 * - A branch role is filtered by its own branch; MERCHANT / ADMIN by the `outletId` of the query (without one: no filter).
 * - A shop with a single active branch ignores `listed`.
 * - Without `listed` the call reaches the database layer exactly as before (an installed app never sends it).
 * - Every `outletStock[]` row carries `isListed` (an addition; old keys and types stay).
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
});

describe('GET /api/products — listed filter', () => {
  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF'])('%s with listed=true: filtered by its own branch', async (role) => {
    ctx = branch(role, 3);
    const res: any = await LIST(req('listed=true'));
    expect(res.status).toBe(200);
    expect(filtersOfLastSearch()).toEqual(expect.objectContaining({ outletId: 3, listedOutletId: 3 }));
  });

  it('a branch role cannot look at another branch: its outletId is its own, whatever the query says', async () => {
    ctx = branch('OUTLET_STAFF', 3);
    await LIST(req('listed=true&outletId=1'));
    expect(filtersOfLastSearch().listedOutletId).toBe(3);
  });

  it('MERCHANT with listed=true&outletId: listed filter at that branch; the merchant still is not filtered by outlet', async () => {
    ctx = merchant;
    await LIST(req('listed=true&outletId=3'));
    expect(filtersOfLastSearch().listedOutletId).toBe(3);
    expect(filtersOfLastSearch().outletId).toBeUndefined();
  });

  it('ADMIN with listed=true&outletId=3 filters at branch 3', async () => {
    ctx = admin;
    await LIST(req('listed=true&outletId=3'));
    expect(filtersOfLastSearch().listedOutletId).toBe(3);
  });

  it('MERCHANT with listed=true and no outletId: no filter ("Tất cả chi nhánh")', async () => {
    ctx = merchant;
    await LIST(req('listed=true'));
    expect(filtersOfLastSearch().listedOutletId).toBeUndefined();
  });

  it('listed=false / 0 / junk is not the filter', async () => {
    ctx = branch('OUTLET_STAFF', 3);
    for (const v of ['false', '0', 'no', '']) {
      await LIST(req(`listed=${v}`));
      expect(filtersOfLastSearch().listedOutletId).toBeUndefined();
    }
  });

  it('a shop with one active branch ignores listed (the products do not vanish), and counts the branches of the caller shop', async () => {
    mockOutletCount.mockResolvedValue(1);
    ctx = branch('OUTLET_STAFF', 3);
    await LIST(req('listed=true'));
    expect(filtersOfLastSearch().listedOutletId).toBeUndefined();
    expect(mockOutletCount).toHaveBeenCalledWith({ where: { merchantId: 2, isActive: true } });
  });

  it('does not count branches when listed is not asked for', async () => {
    ctx = branch('OUTLET_STAFF', 3);
    await LIST(req('page=1&limit=25'));
    expect(mockOutletCount).not.toHaveBeenCalled();
  });
});

describe('GET /api/products — compatibility with installed apps', () => {
  it('no listed: the database layer gets the same filters as before (no new key at all)', async () => {
    ctx = branch('OUTLET_STAFF', 3);
    await LIST(req('outletId=3&page=1&limit=25&sortBy=createdAt&sortOrder=desc'));
    expect(Object.keys(filtersOfLastSearch()).sort()).toEqual(
      ['available', 'categoryId', 'limit', 'maxPrice', 'merchantId', 'minPrice', 'outletId', 'page', 'q', 'search', 'sortBy', 'sortOrder'].sort()
    );
  });

  it('the response only gains isListed on outletStock rows: every old key is still there with the same type', async () => {
    ctx = merchant;
    const res: any = await LIST(req('outletId=1'));
    const row = res.body.data.products[0];
    for (const key of ['id', 'name', 'images', 'totalStock', 'available', 'effectiveAvailableToday', 'outletStock', 'merchant', 'category']) {
      expect(row).toHaveProperty(key);
    }
    expect(row.outletStock[0]).toEqual(
      expect.objectContaining({ id: 1, stock: 8, renting: 2, available: 6, isListed: true, outlet: { id: 1, name: 'Main', address: null } })
    );
  });

  it('a row of a branch that does not sell the product says isListed: false (and a missing column reads as listed)', async () => {
    ctx = merchant;
    mockDb.products.search.mockResolvedValueOnce({
      data: [{ ...product(12), outletStock: [{ id: 9, stock: 1, renting: 0, available: 1, outlet: { id: 1, name: 'Main', address: null } }, ...stockRows().slice(1)] }],
      total: 1, page: 1, limit: 50, hasMore: false,
    });
    const res: any = await LIST(req(''));
    const rows = res.body.data.products[0].outletStock;
    expect(rows[0].isListed).toBe(true);
    expect(rows[1].isListed).toBe(false);
  });
});
