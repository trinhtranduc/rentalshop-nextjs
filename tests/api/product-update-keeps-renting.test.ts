/**
 * #359 — PUT /api/products/:id must not reset rented stock.
 * Editing a product while units were rented wrote `renting: 0` and deleted the other outlets' rows.
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

const mockDb = {
  products: { findById: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  outlets: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {}, syncProductTotalStock: jest.fn() }));

jest.mock('@rentalshop/utils', () => ({
  productUpdateSchema: { parse: (data: any) => data },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
  },
  normalizeImagesInput: (images: any) => images,
  parseProductImages: () => [],
  combineProductImages: (a: any) => a,
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  generateStagingKey: jest.fn(),
  generateProductImageKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
}));
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  deleteFromS3: jest.fn(),
  getBucketName: jest.fn(),
  extractS3KeyFromUrl: jest.fn(),
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve() }),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));

import { PUT } from '../../apps/api/app/api/products/[id]/route';

function putRequest(data: any): any {
  const form = new Map<string, any>([['data', JSON.stringify(data)]]);
  return {
    url: 'http://localhost/api/products/7',
    headers: { get: () => null },
    formData: async () => ({ get: (k: string) => form.get(k) ?? null, getAll: () => [] }),
  };
}

const existingProduct = {
  id: 7,
  name: 'Vest đen',
  images: [],
  merchant: { id: 2, name: 'Shop' },
  outletStock: [
    { outletId: 1, stock: 3, renting: 2, available: 1, outlet: { id: 1, name: 'Outlet 1' } },
    { outletId: 3, stock: 4, renting: 0, available: 4, outlet: { id: 3, name: 'Outlet 3' } },
  ],
};

describe('PUT /api/products/:id keeps rented stock (#359)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
    mockDb.products.findById.mockResolvedValue(existingProduct);
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, name: `Outlet ${id}` }));
    mockDb.products.update.mockImplementation(async (id: number, data: any) => ({
      ...existingProduct,
      ...data,
      id,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-03T00:00:00Z'),
    }));
  });

  it('keeps renting, sets available = stock − renting, and leaves other outlets', async () => {
    const res: any = await PUT(putRequest({ outletStock: [{ outletId: 1, stock: 5 }] }), { params: { id: '7' } });

    expect(res.status).toBe(200);
    const write = mockDb.products.update.mock.calls[0][1].outletStock;
    expect(write.deleteMany).toBeUndefined();
    expect(write.create).toBeUndefined();
    expect(write.upsert).toEqual([
      expect.objectContaining({
        where: { productId_outletId: { productId: 7, outletId: 1 } },
        update: { stock: 5, available: 3 },
      }),
    ]);
  });

  it('creates a row for an outlet that has none, with nothing rented', async () => {
    await PUT(putRequest({ outletStock: [{ outletId: 5, stock: 2 }] }), { params: { id: '7' } });

    const write = mockDb.products.update.mock.calls[0][1].outletStock;
    expect(write.upsert[0].create).toEqual({ outletId: 5, stock: 2, available: 2, renting: 0 });
  });

  it('rejects stock below what is rented with STOCK_BELOW_RENTED', async () => {
    const res: any = await PUT(putRequest({ outletStock: [{ outletId: 1, stock: 1 }] }), { params: { id: '7' } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'STOCK_BELOW_RENTED' }));
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });
});
