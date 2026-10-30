/**
 * #825 — products across branches (owner decisions 2026-10-11).
 * - PUT /api/products/:id writes stock only to outlets of the product's shop (another shop's outlet was written before).
 * - Every branch role (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY) writes stock only at its own outlet, and a branch
 *   role without an outlet is refused instead of skipping the branch checks.
 * - OUTLET_ADMIN and OUTLET_INVENTORY edit shared fields (name, prices, photos, category, ...) and delete products
 *   stocked at their outlet. OUTLET_STAFF does not: a changed shared field or an attached photo is refused before any
 *   upload (the same values sent again pass and only the stock is written), and delete is refused.
 * - A new product (form or Excel import) gets a 0-stock row at every other active outlet of the shop.
 * - Outlet staff do not add products, even with a customised products.create.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(true),
  validateMerchantAccess: async (id: number) => ({ valid: true, merchant: { id } }),
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
  outletStock: { deleteMany: jest.fn(), create: jest.fn() },
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
import { PUT as merchantProductPut } from '../../apps/api/app/api/merchants/[id]/products/[productId]/route';
import { POST as merchantProductPost } from '../../apps/api/app/api/merchants/[id]/products/route';
import { changedSharedFields, holdsStockAt, otherOutletsHolding, zeroStockRowsForOtherOutlets } from '../../apps/api/lib/product-branch-rules';
import { resolveProductListAvailabilityOutletId } from '../../apps/api/lib/product-list-effective-availability';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 1 } };
const inventory = { user: { id: 9, role: 'OUTLET_INVENTORY', email: 'k@x' }, userScope: { merchantId: 2, outletId: 1 } };
const staff = { user: { id: 11, role: 'OUTLET_STAFF', email: 's@x' }, userScope: { merchantId: 2, outletId: 1 } };
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

describe('otherOutletsHolding', () => {
  it('lists the other outlets with stock, units on rent or open orders; own outlet and empty rows are left out', () => {
    const rows = [
      { outletId: 1, stock: 3, renting: 0, outlet: { id: 1, name: 'Main' } },
      { outletId: 3, stock: 0, renting: 0, outlet: { id: 3, name: 'Second' } },
      { outletId: 4, stock: 2, renting: 1, outlet: { id: 4, name: 'Kho' } },
    ];
    const open = [{ outletId: 3, name: 'Second', orders: 2 }, { outletId: 1, name: 'Main', orders: 1 }];
    expect(otherOutletsHolding(rows, 1, open)).toEqual([
      { id: 3, name: 'Second', stock: 0, renting: 0, openOrders: 2 },
      { id: 4, name: 'Kho', stock: 2, renting: 1, openOrders: 0 },
    ]);
    expect(otherOutletsHolding(rows.slice(0, 2), 1, [])).toEqual([]);
  });
});

describe('holdsStockAt / list availability outlet', () => {
  it('a 0-stock row (added for every outlet since #825) is not holding the product', () => {
    expect(holdsStockAt([{ outlet: { id: 1 }, stock: 0, renting: 0 }], 1)).toBe(false);
    expect(holdsStockAt([{ outletId: 1, stock: 0, renting: 1 }], 1)).toBe(true);
    expect(holdsStockAt([{ outlet: { id: 1 }, stock: 2 }], 1)).toBe(true);
    expect(holdsStockAt([{ outlet: { id: 1 }, stock: 2 }], 3)).toBe(false);
    expect(holdsStockAt([{ outlet: { id: 1 }, stock: 2 }], undefined)).toBe(false);
  });

  it("a branch role's list counts its own outlet, not the outletId it asks for (BF-ROLE-06)", () => {
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect(resolveProductListAvailabilityOutletId({ role, userOutletId: 1, queryOutletId: 3, filterOutletId: 1 })).toBe(1);
    }
    expect(resolveProductListAvailabilityOutletId({ role: 'MERCHANT', queryOutletId: 3 })).toBe(3);
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

describe('PUT /api/products/:id — branch roles', () => {
  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])(
    '%s edits shared fields and its own outlet stock (owner 2026-10-11)',
    async (_role, who) => {
      ctx = who;
      const res = await put({ ...wholePayload, name: 'Vest xanh', rentPrice: 250000, outletStock: [{ outletId: 1, stock: 8 }] });
      expect(res.status).toBe(200);
      const data = mockDb.products.update.mock.calls[0][1];
      expect(data).toMatchObject({ name: 'Vest xanh', rentPrice: 250000 });
      expect(data.outletStock.upsert).toHaveLength(1);
    }
  );

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])(
    '%s cannot change shared fields of a product its outlet only has a 0-stock row for (a row that is not listed, #1341)',
    async (_role, who) => {
      ctx = who;
      mockDb.products.findById.mockResolvedValue({
        ...product,
        outletStock: [
          { outletId: 1, stock: 0, renting: 0, available: 0, isListed: false, outlet: { id: 1, name: 'Main' } },
          { outletId: 3, stock: 4, renting: 0, available: 4, isListed: true, outlet: { id: 3, name: 'Second' } },
        ],
      });
      const rename = await put({ name: 'Vest xanh' });
      expect([rename.status, rename.body.code]).toEqual([403, 'PRODUCT_NOT_AVAILABLE_AT_OUTLET']);
      // its own stock it still sets
      const stock = await put({ ...wholePayload, outletStock: [{ outletId: 1, stock: 2 }] });
      expect(stock.status).toBe(200);
      const del: any = await DELETE({ url: 'x', headers: { get: () => null } } as any, { params: { id: '7' } });
      expect([del.status, del.body.code]).toEqual([403, 'PRODUCT_NOT_AVAILABLE_AT_OUTLET']);
    }
  );

  // OUTLET_STAFF has no products.update by default; these cover a shop that customised the role to have it
  it('OUTLET_STAFF: the whole payload with unchanged values passes and writes only the stock', async () => {
    ctx = staff;
    const res = await put({ ...wholePayload, outletStock: [{ outletId: 1, stock: 8 }] });
    expect(res.status).toBe(200);
    const data = mockDb.products.update.mock.calls[0][1];
    expect(Object.keys(data)).toEqual(['outletStock']);
    expect(data.outletStock.upsert).toHaveLength(1);
  });

  it('OUTLET_STAFF: a changed shared field is refused with PRODUCT_SHARED_FIELDS_MERCHANT_ONLY', async () => {
    ctx = staff;
    const res = await put({ ...wholePayload, rentPrice: 1, outletStock: [{ outletId: 1, stock: 8 }] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_SHARED_FIELDS_MERCHANT_ONLY');
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('OUTLET_STAFF: an attached photo is refused before uploading it', async () => {
    ctx = staff;
    const res = await put({ outletStock: [{ outletId: 1, stock: 8 }] }, [photo()]);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRODUCT_SHARED_FIELDS_MERCHANT_ONLY');
    expect(mockUploadToS3).not.toHaveBeenCalled();
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory], ['OUTLET_STAFF', staff]])(
    '%s: stock at another branch of the same shop is still refused',
    async (_role, who) => {
      ctx = who;
      const res = await put({ outletStock: [{ outletId: 3, stock: 8 }] });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET');
      expect(mockDb.products.update).not.toHaveBeenCalled();
    }
  );

  it('a branch role without an outlet is refused (the branch checks were skipped before)', async () => {
    ctx = outletAdminNoOutlet;
    const res = await put({ name: 'Vest xanh' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });
});

describe('deleting products', () => {
  const delReq = (): any => ({ url: 'http://localhost/api/products/7', headers: { get: () => null } });
  const del = () => DELETE(delReq(), { params: { id: '7' } }) as Promise<any>;

  beforeEach(() => {
    mockPrisma.orderItem.findMany.mockResolvedValue([]);
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
  });

  it('DELETE: OUTLET_STAFF gets 403 PRODUCT_DELETE_MERCHANT_ONLY', async () => {
    ctx = staff;
    const res = await del();
    expect([res.status, res.body.code]).toEqual([403, 'PRODUCT_DELETE_MERCHANT_ONLY']);
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  /** Product 7 held only at outlet 1 (outlet 3 has its 0-stock row). */
  const onlyHere = {
    ...product,
    outletStock: [
      { outletId: 1, stock: 3, renting: 0, available: 3, outlet: { id: 1, name: 'Main' } },
      { outletId: 3, stock: 0, renting: 0, available: 0, outlet: { id: 3, name: 'Second' } },
    ],
  };
  /** An open (RESERVED / PICKUPED) order line of product 7 at outlet `outletId`. */
  const openLine = (outletId: number, name: string) => ({ productId: 7, orderId: 900 + outletId, order: { outletId, outlet: { id: outletId, name } } });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('DELETE: %s deletes a product only its outlet holds', async (_r, who) => {
    ctx = who;
    mockDb.products.findById.mockResolvedValue(onlyHere);
    const res = await del();
    expect(res.status).toBe(200);
    expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])(
    'DELETE: %s gets 409 PRODUCT_HELD_BY_OTHER_OUTLETS when another outlet has stock, listing it',
    async (_r, who) => {
      ctx = who;
      const res = await del(); // product: outlet 1 stock 3, outlet 3 stock 4
      expect([res.status, res.body.code]).toEqual([409, 'PRODUCT_HELD_BY_OTHER_OUTLETS']);
      expect(res.body.data.outlets).toEqual([{ id: 3, name: 'Second', stock: 4, renting: 0, openOrders: 0 }]);
      expect(res.body.data.messageParams).toEqual({ outlets: 'Second (4)' });
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    }
  );

  it('DELETE: units on rent or an open order at another outlet also hold the product there', async () => {
    ctx = inventory;
    mockDb.products.findById.mockResolvedValue({
      ...onlyHere,
      outletStock: [onlyHere.outletStock[0], { outletId: 3, stock: 0, renting: 1, available: 0, outlet: { id: 3, name: 'Second' } }],
    });
    const renting = await del();
    expect([renting.status, renting.body.data?.outlets]).toEqual([409, [{ id: 3, name: 'Second', stock: 0, renting: 1, openOrders: 0 }]]);

    mockDb.products.findById.mockResolvedValue(onlyHere);
    mockPrisma.orderItem.findMany.mockResolvedValue([openLine(3, 'Second'), openLine(1, 'Main')]);
    const ordered = await del();
    expect([ordered.status, ordered.body.data?.outlets]).toEqual([409, [{ id: 3, name: 'Second', stock: 0, renting: 0, openOrders: 1 }]]);
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('DELETE: MERCHANT still deletes a product held at several outlets', async () => {
    ctx = merchant;
    const res = await del();
    expect(res.status).toBe(200);
  });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('DELETE: %s cannot delete a product with no row at its outlet', async (_r, who) => {
    ctx = { ...who, userScope: { merchantId: 2, outletId: 5 } };
    const res = await del();
    expect([res.status, res.body.code]).toEqual([403, 'PRODUCT_NOT_AVAILABLE_AT_OUTLET']);
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('batch-delete: OUTLET_ADMIN deletes what only its outlet holds and reports the rest per product', async () => {
    ctx = outletAdmin;
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 7, name: 'Vest đen', merchant: { id: 2 }, outletStock: [{ outletId: 1, stock: 3, renting: 0, outlet: { id: 1, name: 'Main' } }, { outletId: 3, stock: 0, renting: 0, outlet: { id: 3, name: 'Second' } }] },
      { id: 8, name: 'Áo dài', merchant: { id: 2 }, outletStock: [{ outletId: 1, stock: 1, renting: 0, outlet: { id: 1, name: 'Main' } }, { outletId: 3, stock: 2, renting: 0, outlet: { id: 3, name: 'Second' } }] },
    ]);
    const res: any = await batchDelete({ json: async () => ({ productIds: [7, 8] }) } as any);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ deleted: 1, failed: 1, deletedProducts: [{ id: 7, name: 'Vest đen' }] });
    expect(res.body.data.errors).toEqual([
      { id: 8, name: 'Áo dài', error: 'PRODUCT_HELD_BY_OTHER_OUTLETS', code: 'PRODUCT_HELD_BY_OTHER_OUTLETS', outlets: [{ id: 3, name: 'Second', stock: 2, renting: 0, openOrders: 0 }] },
    ]);
    expect(mockPrisma.product.updateMany.mock.calls[0][0].where).toEqual({ id: { in: [7] }, deletedAt: null });
  });

  it('batch-delete: 409 PRODUCT_HELD_BY_OTHER_OUTLETS when every product is held elsewhere', async () => {
    ctx = inventory;
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 8, name: 'Áo dài', merchant: { id: 2 }, outletStock: [{ outletId: 1, stock: 1, renting: 0, outlet: { id: 1, name: 'Main' } }, { outletId: 3, stock: 2, renting: 0, outlet: { id: 3, name: 'Second' } }] },
    ]);
    const res: any = await batchDelete({ json: async () => ({ productIds: [8] }) } as any);
    expect([res.status, res.body.code]).toEqual([409, 'PRODUCT_HELD_BY_OTHER_OUTLETS']);
    expect(res.body.data.messageParams).toEqual({ outlets: 'Second (2)' });
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('batch-delete: OUTLET_STAFF gets 403 PRODUCT_DELETE_MERCHANT_ONLY', async () => {
    ctx = staff;
    const res: any = await batchDelete({ json: async () => ({ productIds: [7] }) } as any);
    expect([res.status, res.body.code]).toEqual([403, 'PRODUCT_DELETE_MERCHANT_ONLY']);
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

  it.each([['MERCHANT', merchant], ['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('%s: 0 at the other active outlets', async (_r, who) => {
    ctx = who;
    const res: any = await createProduct(createRequest({ name: 'Áo dài', rentPrice: 1, outletStock: [{ outletId: 1, stock: 5 }] }));
    expect(res.status).toBe(200);
    expect(mockPrisma.outlet.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { merchantId: 2, isActive: true } }));
    const rows = mockDb.products.create.mock.calls[0][0].outletStock.create;
    expect(rows).toEqual([
      { outlet: { connect: { id: 1 } }, stock: 5, available: 5, renting: 0, isListed: true },
      { outlet: { connect: { id: 3 } }, stock: 0, available: 0, renting: 0, isListed: false },
    ]);
  });

  it('OUTLET_STAFF is refused with INSUFFICIENT_PERMISSIONS, nothing created', async () => {
    ctx = staff;
    const res: any = await createProduct(createRequest({ name: 'Áo dài', rentPrice: 1, outletStock: [{ outletId: 1, stock: 5 }] }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockDb.products.create).not.toHaveBeenCalled();
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
      { outletId: 1, stock: 4, available: 4, renting: 0, isListed: true },
      { outletId: 3, stock: 0, available: 0, renting: 0, isListed: false },
    ]);
  });

  it('OUTLET_STAFF is refused with INSUFFICIENT_PERMISSIONS', async () => {
    ctx = staff;
    const res: any = await bulkImport(importRequest());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('a branch role without an outlet is refused', async () => {
    ctx = outletAdminNoOutlet;
    const res: any = await bulkImport(importRequest());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(txCreate).not.toHaveBeenCalled();
  });
});

describe('/api/merchants/:id/products (admin web routes) — same shop only, not for branch roles', () => {
  const putReq = (body: any): any => ({ url: 'http://localhost/api/merchants/2/products/7', headers: { get: () => null }, json: async () => body });
  const mput = (body: any, merchantId = '2') => merchantProductPut(putReq(body), { params: { id: merchantId, productId: '7' } }) as Promise<any>;

  it("refuses a product of another merchant with PRODUCT_NOT_FOUND and writes nothing (any id was accepted before)", async () => {
    const res = await mput({ name: 'x' }, '99');
    expect([res.status, res.body.code]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it("refuses another shop's outlet with OUTLET_NOT_FOUND before writing anything", async () => {
    const res = await mput({ name: 'Vest đen', outletStock: [{ outletId: 50, stock: 3 }] });
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    expect(mockDb.products.update).not.toHaveBeenCalled();
    expect(mockPrisma.outletStock.deleteMany).not.toHaveBeenCalled();
  });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('%s is sent to /api/products (403 on PUT and POST)', async (_r, who) => {
    ctx = who;
    const res = await mput({ name: 'x' });
    expect([res.status, res.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
    const post: any = await merchantProductPost({ json: async () => ({ name: 'x' }) } as any, { params: { id: '2' } });
    expect([post.status, post.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
    expect(mockDb.products.update).not.toHaveBeenCalled();
    expect(mockDb.products.create).not.toHaveBeenCalled();
  });
});

describe('PRODUCT_HELD_BY_OTHER_OUTLETS message (web)', () => {
  // ICU formatting as next-intl does it (intl-messageformat), over the vi / en sentences the shop web loads
  const { IntlMessageFormat } = require('../../node_modules/intl-messageformat');
  const { lookupErrorTranslation } = require('../../packages/utils/src/core/error-display');
  const translator = (locale: string, messages: Record<string, string>) => {
    const t: any = (key: string, values?: Record<string, unknown>) => new IntlMessageFormat(messages[key], locale).format(values) as string;
    t.has = (key: string) => key in messages;
    return t;
  };

  it.each([
    ['vi', 'Second (4) còn sản phẩm này; chỉ chủ shop xóa được. Muốn ngừng bán ở chi nhánh mình, hãy đặt tồn về 0.'],
    ['en', 'Second (4) still has this product; only the shop owner can delete it. To stop selling it at your branch, set your stock to 0.'],
  ])('%s: the outlets the API sends in data.messageParams are in the sentence', (locale, text) => {
    const t = translator(locale, require(`../../locales/${locale}/errors.json`));
    expect(lookupErrorTranslation(t, 'PRODUCT_HELD_BY_OTHER_OUTLETS', { outlets: 'Second (4)' })).toBe(text);
  });
});
