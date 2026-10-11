/**
 * #825 — products across branches.
 * - PUT /api/products/:id writes stock only to outlets of the product's shop (another shop's outlet was written before).
 * - A branch role (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY) edits only its own branch stock: a changed shared
 *   field (name, prices, photos, category, ...) or an attached photo is refused before any upload; the same values
 *   sent again (whole payload from an app or a stale tab) pass and only the stock is written.
 * - A branch role without an outlet is refused instead of skipping the branch checks.
 * - Only the merchant deletes products (DELETE and batch-delete).
 * - A new product (form or Excel import) gets a 0-stock row at every other active outlet of the shop.
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

const mockDb: any = {
  products: { findById: jest.fn(), update: jest.fn(), create: jest.fn() },
  outlets: { findById: jest.fn(), search: jest.fn() },
  merchants: { findById: jest.fn() },
  categories: { search: jest.fn() },
  embeddingJobs: { kickOff: jest.fn() },
};
const mockPrisma: any = {
  outlet: { findMany: jest.fn() },
  orderItem: { findMany: jest.fn() },
  product: { updateMany: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma, syncProductTotalStock: jest.fn() }));
jest.mock('@rentalshop/database/server', () => ({
  getVectorStore: () => ({ deleteProductEmbeddings: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('@rentalshop/utils', () => ({
  productUpdateSchema: { parse: (data: any) => data },
  productCreateSchema: { safeParse: (data: any) => ({ success: true, data }) },
  productsQuerySchema: { safeParse: (data: any) => ({ success: true, data }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  normalizeImagesInput: (images: any) => images,
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
  combineProductImages: (a: any) => a,
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  generateStagingKey: jest.fn(),
  generateProductImageKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
}));
const mockUploadToS3 = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: (...args: any[]) => mockUploadToS3(...args),
  commitStagingFiles: jest.fn(),
  deleteFromS3: jest.fn(),
  getBucketName: jest.fn(),
  extractS3KeyFromUrl: jest.fn(),
  generateAccessUrl: jest.fn(),
  checkPlanLimitIfNeeded: jest.fn().mockResolvedValue(null),
  createAuditHelper: () => ({
    logUpdate: () => Promise.resolve(),
    logCreate: () => Promise.resolve(),
    logDelete: () => Promise.resolve(),
  }),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));

import { PUT, DELETE } from '../../apps/api/app/api/products/[id]/route';
import { POST as createProduct } from '../../apps/api/app/api/products/route';
import { POST as batchDelete } from '../../apps/api/app/api/products/batch-delete/route';
import { POST as bulkImport } from '../../apps/api/app/api/products/bulk-import/route';
import { changedSharedFields, zeroStockRowsForOtherOutlets } from '../../apps/api/lib/product-branch-rules';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 1 } };
const inventory = { user: { id: 9, role: 'OUTLET_INVENTORY', email: 'k@x' }, userScope: { merchantId: 2, outletId: 1 } };
const outletAdminNoOutlet = { user: { id: 10, role: 'OUTLET_ADMIN', email: 'n@x' }, userScope: { merchantId: 2 } };

// Merchant 2 owns outlets 1 and 3; outlet 50 belongs to merchant 99.
const outlets: Record<number, any> = {
  1: { id: 1, name: 'Main', merchant: { id: 2, name: 'Shop' } },
  3: { id: 3, name: 'Second', merchant: { id: 2, name: 'Shop' } },
  50: { id: 50, name: 'Other shop', merchant: { id: 99, name: 'Other' } },
};

const product = {
  id: 7,
  name: 'Vest đen',
  description: 'Size M',
  barcode: '123',
  rentPrice: 200000,
  salePrice: null,
  costPrice: null,
  deposit: 0,
  pricingType: 'FIXED',
  durationConfig: null,
  isActive: true,
  images: ['https://cdn/a.jpg'],
  category: { id: 4, name: 'Vest' },
  merchant: { id: 2, name: 'Shop' },
  pricingOptions: [
    { type: 'FIXED', price: 200000, isDefault: true, isActive: true, sortOrder: 0 },
    { type: 'DAILY', price: 50000, isDefault: false, isActive: true, sortOrder: 1 },
  ],
  outletStock: [
    { outletId: 1, stock: 3, renting: 0, available: 3, outlet: { id: 1, name: 'Main' } },
    { outletId: 3, stock: 4, renting: 0, available: 4, outlet: { id: 3, name: 'Second' } },
  ],
};

/** What the web form and the apps send on save: every field, unchanged. */
const wholePayload = {
  name: 'Vest đen',
  description: 'Size M',
  barcode: '123',
  categoryId: 4,
  rentPrice: 200000,
  salePrice: 0,
  deposit: 0,
  totalStock: 9,
  images: ['https://cdn/a.jpg'],
  pricingOptions: [
    { type: 'DAILY', price: 50000, isDefault: false },
    { type: 'FIXED', price: 200000, isDefault: true },
  ],
  merchantId: 2,
};

function putRequest(data: any, files: any[] = []): any {
  const form = new Map<string, any>([['data', JSON.stringify(data)]]);
  return {
    url: 'http://localhost/api/products/7',
    headers: { get: () => null },
    formData: async () => ({ get: (k: string) => form.get(k) ?? null, getAll: (k: string) => (k === 'images' ? files : []) }),
  };
}
const put = (data: any, files: any[] = []) => PUT(putRequest(data, files), { params: { id: '7' } }) as Promise<any>;
const photo = () => ({ name: 'p.jpg', type: 'image/jpeg', size: 5000, arrayBuffer: async () => new ArrayBuffer(5000) });

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  mockDb.products.findById.mockResolvedValue(product);
  mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
  mockDb.products.update.mockImplementation(async (id: number, data: any) => ({
    ...product,
    ...data,
    id,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-03T00:00:00Z'),
  }));
});

describe('changedSharedFields', () => {
  it('the whole product sent again with its saved values changes nothing', () => {
    expect(changedSharedFields(wholePayload, product)).toEqual([]);
  });

  it('names each changed shared field', () => {
    expect(changedSharedFields({ ...wholePayload, name: 'Vest xanh', salePrice: 900000 }, product)).toEqual(['name', 'salePrice']);
    expect(changedSharedFields({ images: ['https://cdn/b.jpg'] }, product)).toEqual(['images']);
    expect(changedSharedFields({ categoryId: 5 }, product)).toEqual(['categoryId']);
    expect(changedSharedFields({ pricingOptions: [{ type: 'FIXED', price: 250000, isDefault: true }] }, product)).toEqual(['pricingOptions']);
    expect(changedSharedFields({ merchantId: 99 }, product)).toEqual(['merchantId']);
  });

  it('stock-only fields and an empty photo list are not shared changes', () => {
    expect(changedSharedFields({ outletStock: [{ outletId: 1, stock: 9 }], totalStock: 1, images: [] }, product)).toEqual([]);
  });
});

describe('zeroStockRowsForOtherOutlets', () => {
  it('adds 0 for every other active outlet, once', () => {
    expect(zeroStockRowsForOtherOutlets([{ outletId: 1 }], [1, 3, 5, 3])).toEqual([
      { outletId: 3, stock: 0 },
      { outletId: 5, stock: 0 },
    ]);
  });
});

describe('PUT /api/products/:id — stock only at outlets of the same shop', () => {
  it("refuses another shop's outlet with OUTLET_NOT_FOUND and writes nothing", async () => {
    const res = await put({ outletStock: [{ outletId: 1, stock: 5 }, { outletId: 50, stock: 9 }] });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OUTLET_NOT_FOUND');
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('refuses an unknown outlet instead of skipping it', async () => {
    const res = await put({ outletStock: [{ outletId: 777, stock: 2 }] });
    expect(res.status).toBe(404);
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('the merchant still edits shared fields and every outlet of the shop', async () => {
    const res = await put({ ...wholePayload, name: 'Vest xanh', outletStock: [{ outletId: 3, stock: 6 }] });
    expect(res.status).toBe(200);
    const data = mockDb.products.update.mock.calls[0][1];
    expect(data.name).toBe('Vest xanh');
    expect(data.outletStock.upsert[0].where).toEqual({ productId_outletId: { productId: 7, outletId: 3 } });
  });
});

describe('PUT /api/products/:id — branch roles edit only their own stock', () => {
  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])(
    '%s: the whole payload with unchanged values passes and writes only the stock',
    async (_role, who) => {
      ctx = who;
      const res = await put({ ...wholePayload, outletStock: [{ outletId: 1, stock: 8 }] });
      expect(res.status).toBe(200);
      const data = mockDb.products.update.mock.calls[0][1];
      expect(Object.keys(data)).toEqual(['outletStock']);
      expect(data.outletStock.upsert).toHaveLength(1);
    }
  );

  it('refuses a changed shared field with PRODUCT_SHARED_FIELDS_MERCHANT_ONLY', async () => {
    ctx = outletAdmin;
    const res = await put({ ...wholePayload, rentPrice: 1, outletStock: [{ outletId: 1, stock: 8 }] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_SHARED_FIELDS_MERCHANT_ONLY');
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('refuses an attached photo before uploading it', async () => {
    ctx = inventory;
    const res = await put({ outletStock: [{ outletId: 1, stock: 8 }] }, [photo()]);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_SHARED_FIELDS_MERCHANT_ONLY');
    expect(mockUploadToS3).not.toHaveBeenCalled();
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('still refuses stock at another branch of the same shop', async () => {
    ctx = outletAdmin;
    const res = await put({ outletStock: [{ outletId: 3, stock: 8 }] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET');
  });

  it('a branch role without an outlet is refused (the branch checks were skipped before)', async () => {
    ctx = outletAdminNoOutlet;
    const res = await put({ name: 'Vest xanh' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });
});

describe('only the merchant deletes products', () => {
  const delReq = (): any => ({ url: 'http://localhost/api/products/7', headers: { get: () => null } });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('DELETE: %s gets 403 PRODUCT_DELETE_MERCHANT_ONLY', async (_r, who) => {
    ctx = who;
    const res: any = await DELETE(delReq(), { params: { id: '7' } });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_DELETE_MERCHANT_ONLY');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('batch-delete: a branch role gets 403 PRODUCT_DELETE_MERCHANT_ONLY', async () => {
    ctx = outletAdmin;
    const res: any = await batchDelete({ json: async () => ({ productIds: [7] }) } as any);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_DELETE_MERCHANT_ONLY');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/products — a new product has a row at every active outlet', () => {
  function createRequest(data: any): any {
    const form = new Map<string, any>([['data', JSON.stringify(data)]]);
    return {
      url: 'http://localhost/api/products',
      headers: { get: () => null },
      formData: async () => ({ get: (k: string) => form.get(k) ?? null, getAll: () => [] }),
    };
  }

  beforeEach(() => {
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    mockDb.products.create.mockImplementation(async (data: any) => ({ id: 70, images: [], ...data }));
  });

  it.each([['MERCHANT', merchant], ['OUTLET_ADMIN', outletAdmin]])('%s: 0 at the other active outlets', async (_r, who) => {
    ctx = who;
    const res: any = await createProduct(createRequest({ name: 'Áo dài', rentPrice: 1, outletStock: [{ outletId: 1, stock: 5 }] }));
    expect(res.status).toBe(200);
    expect(mockPrisma.outlet.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { merchantId: 2, isActive: true } }));
    const rows = mockDb.products.create.mock.calls[0][0].outletStock.create;
    expect(rows).toEqual([
      { outlet: { connect: { id: 1 } }, stock: 5, available: 5, renting: 0 },
      { outlet: { connect: { id: 3 } }, stock: 0, available: 0, renting: 0 },
    ]);
  });

  it('a branch role without an outlet is refused', async () => {
    ctx = outletAdminNoOutlet;
    const res: any = await createProduct(createRequest({ name: 'Áo dài', rentPrice: 1, outletStock: [{ outletId: 1, stock: 5 }] }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(mockDb.products.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/products/bulk-import — imported products have a row at every active outlet', () => {
  const txCreate = jest.fn();
  const importRequest = (): any => ({ json: async () => ({ products: [{ name: 'Áo dài', rentPrice: 1, stock: 4 }] }) });

  beforeEach(() => {
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
    mockDb.categories.search.mockResolvedValue({ data: [{ id: 4, name: 'default' }] });
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    txCreate.mockImplementation(async ({ data }: any) => ({ id: 71, name: data.name }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({ product: { create: txCreate } }));
  });

  it('the import outlet gets the stock, the other active outlets 0', async () => {
    ctx = outletAdmin;
    const res: any = await bulkImport(importRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.outlet.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { merchantId: 2, isActive: true } }));
    expect(txCreate.mock.calls[0][0].data.outletStock.create).toEqual([
      { outletId: 1, stock: 4, available: 4, renting: 0 },
      { outletId: 3, stock: 0, available: 0, renting: 0 },
    ]);
  });

  it('a branch role without an outlet is refused', async () => {
    ctx = outletAdminNoOutlet;
    const res: any = await bulkImport(importRequest());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(txCreate).not.toHaveBeenCalled();
  });
});
