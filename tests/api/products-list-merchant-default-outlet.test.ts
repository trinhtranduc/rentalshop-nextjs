/**
 * #432 — GET /api/products from a MERCHANT login on iOS/Android sends no outletId (a merchant has no
 * outlet). Home showed "21 free" (shelf stock summed over every outlet) while the product detail strip
 * and the outlet's staff showed 12. For a mobile merchant without outletId the list must count today's
 * free units on the merchant's default outlet, like the availability routes do since #398.
 * The web product list keeps its all-outlets view.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('@rentalshop/middleware', () => ({ searchRateLimiter: () => null }));

// Merchant 2 owns outlet 1 (default) and outlet 3. Product 11: outlet 1 has 15 on the shelf, 3 out;
// outlet 3 has 10, 1 out. All outlets: 25 - 4 = 21. Today's schedulable count on outlet 1 is 12.
type OutletRow = { id: number; merchantId: number; isDefault: boolean; isActive: boolean };
let outlets: OutletRow[] = [];

const product = () => ({
  id: 11,
  name: 'Product 1',
  images: [],
  totalStock: 25,
  outletStock: [
    { stock: 15, renting: 3, available: 12, outlet: { id: 1, name: 'Main' } },
    { stock: 10, renting: 1, available: 9, outlet: { id: 3, name: 'Second' } },
  ],
});

const mockDb: any = {
  outlets: {
    // Same contract as packages/database/src/outlet.ts findDefaultForMerchant
    findDefaultForMerchant: jest.fn(async (merchantId: number) => {
      const active = outlets.filter((o) => o.merchantId === merchantId && o.isActive);
      return active.find((o) => o.isDefault) || (active.length === 1 ? active[0] : null);
    }),
  },
  products: {
    search: jest.fn(async () => ({ data: [product()], total: 1, page: 1, limit: 50, hasMore: false })),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

const todayFreeByOutlet: Record<number, number> = { 1: 12, 3: 8 };
const mockBatch = jest.fn(async (products: { id: number }[], outletId: number) =>
  new Map(products.map((p) => [p.id, todayFreeByOutlet[outletId]]))
);
jest.mock('../../apps/api/lib/product-list-effective-availability', () => ({
  ...jest.requireActual('../../apps/api/lib/product-list-effective-availability'),
  batchTodayEffectiveAvailability: (...args: any[]) => (mockBatch as any)(...args),
}));

jest.mock('@rentalshop/utils', () => ({
  productsQuerySchema: {
    safeParse: (q: any) => ({
      success: true,
      data: { ...q, outletId: q.outletId ? Number(q.outletId) : undefined, page: 1, limit: 50 },
    }),
  },
  productCreateSchema: { safeParse: () => ({ success: false }) },
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
  createAuditHelper: () => ({ logCreate: () => Promise.resolve() }),
  deleteFromS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  generateAccessUrl: jest.fn(),
  uploadToS3: jest.fn(),
  getBucketName: jest.fn(),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));

import { GET } from '../../apps/api/app/api/products/route';

function listRequest(query: string, platform: 'mobile' | 'web'): any {
  const headers: Record<string, string> = { 'x-client-platform': platform };
  return {
    url: `http://localhost/api/products?${query}`,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  };
}

const merchant = () => ({
  user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'merchant1@x' },
  userScope: { merchantId: 2 },
});

async function firstProduct(query: string, platform: 'mobile' | 'web') {
  const res: any = await GET(listRequest(query, platform));
  expect(res.status).toBe(200);
  return res.body.data.products[0];
}

describe('GET /api/products — mobile merchant without outletId uses the default outlet (#432)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant();
    outlets = [
      { id: 1, merchantId: 2, isDefault: true, isActive: true },
      { id: 3, merchantId: 2, isDefault: false, isActive: true },
      { id: 7, merchantId: 99, isDefault: true, isActive: true },
    ];
  });

  it('counts today\'s free units on the merchant\'s default outlet (12, not 21)', async () => {
    const p = await firstProduct('page=1&limit=20&sortBy=createdAt&sortOrder=desc', 'mobile');

    expect(mockDb.outlets.findDefaultForMerchant).toHaveBeenCalledWith(2);
    expect(mockBatch).toHaveBeenCalledWith([{ id: 11 }], 1);
    expect(p.effectiveAvailableToday).toBe(12);
    expect(p.available).toBe(12);
    expect(p.totalStock).toBe(15);
    expect(p.renting).toBe(3);
    // The list is not filtered by outlet: every outlet's stock row is still there
    expect(p.outletStock.map((s: any) => s.outlet.id)).toEqual([1, 3]);
    expect(mockDb.products.search).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 2, outletId: undefined }));
  });

  it('keeps the all-outlets numbers when the merchant has no default and several outlets', async () => {
    outlets = outlets.map((o) => ({ ...o, isDefault: false }));
    const p = await firstProduct('page=1&limit=20', 'mobile');

    expect(mockBatch).not.toHaveBeenCalled();
    expect(p.available).toBe(21);
    expect(p.totalStock).toBe(25);
  });

  it('leaves the web product list on all outlets', async () => {
    const p = await firstProduct('page=1&limit=25', 'web');

    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
    expect(mockBatch).not.toHaveBeenCalled();
    expect(p.available).toBe(21);
  });

  it('an explicit outletId still wins', async () => {
    const p = await firstProduct('page=1&limit=20&outletId=3', 'mobile');

    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
    expect(mockBatch).toHaveBeenCalledWith([{ id: 11 }], 3);
    expect(p.available).toBe(8);
  });

  it('outlet staff keep their own outlet', async () => {
    ctx = {
      user: { id: 5, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 'staff@x' },
      userScope: { merchantId: 2, outletId: 1 },
    };
    const p = await firstProduct('page=1&limit=20', 'mobile');

    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
    expect(mockBatch).toHaveBeenCalledWith([{ id: 11 }], 1);
    expect(p.available).toBe(12);
  });
});
