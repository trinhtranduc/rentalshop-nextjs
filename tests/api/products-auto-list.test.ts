/**
 * #1341 (#1335) Where the server writes OutletStock.isListed on its own.
 * - POST /api/products: the branch that creates is listed, the zero rows the server adds are not; the owner may send
 *   isListed per row; a branch role always lists its own branch; an old app (no isListed) behaves as before.
 * - POST /api/orders: an order from an OLD app (no `X-Client-Capabilities: branch-listing`) lists the products it puts
 *   on the order at the branch of the order; a new app / the web (token) does not, so a draft cart with a product the
 *   owner unticked still creates an order and does not undo the untick.
 * - PUT /api/products/[id]: an old app that raises the stock of an unlisted branch lists it; the same stock sent back
 *   (read then save) and a client with the token never do. PUT ignores an `isListed` in the body.
 * - POST /api/products/bulk-import: the import branch is listed, the other branches get a 0 row that is not.
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
  outlets: { findById: jest.fn(), search: jest.fn(), findDefaultForMerchant: jest.fn() },
  merchants: { findById: jest.fn() },
  categories: { search: jest.fn() },
  embeddingJobs: { kickOff: jest.fn() },
  orders: { create: jest.fn(), createOnce: jest.fn() },
  prisma: {
    $transaction: jest.fn(async (fn: any) => fn({ order: { findUnique: async () => null } })),
    merchant: { findUnique: jest.fn(async () => null) },
  },
};
const mockUpdateStock = jest.fn();
const mockPrisma: any = {
  outlet: { findMany: jest.fn() },
  product: { findFirst: jest.fn(), findMany: jest.fn() },
  outletStock: { updateMany: jest.fn(async () => ({ count: 1 })) },
  merchant: { findUnique: jest.fn(async () => ({ id: 2, settings: null })) },
  $transaction: jest.fn(),
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  prisma: mockPrisma,
  syncProductTotalStock: jest.fn(),
  updateOutletStockForOrder: (...a: any[]) => (mockUpdateStock as any)(...a),
}));
jest.mock('@rentalshop/database/server', () => ({
  getVectorStore: () => ({ deleteProductEmbeddings: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/legacy-plan-days'),
  productUpdateSchema: { parse: (data: any) => data },
  productCreateSchema: { safeParse: (data: any) => ({ success: true, data }) },
  productsQuerySchema: { safeParse: (data: any) => ({ success: true, data }) },
  orderCreateSchema: { safeParse: (body: any) => ({ success: true, data: { depositAmount: 0, ...body, outletId: Number(body.outletId) } }) },
  ordersQuerySchema: { safeParse: () => ({ success: false }) },
  orderUpdateSchema: { safeParse: () => ({ success: false }) },
  PricingResolver: { resolvePricingType: () => 'FIXED' },
  resolveSelectedOption: () => null,
  calculateDurationInUnit: () => ({ duration: 1 }),
  countRentalDays: () => 1,
  getDurationUnitLabel: () => '',
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  normalizeImagesInput: (images: any) => images,
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
  combineProductImages: (a: any) => a,
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  generateStagingKey: jest.fn(),
  generateProductImageKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
  getUtcRangeForDateKeys: jest.fn(),
  toDateKeyInTimeZone: jest.fn(),
  PerformanceMonitor: {},
}));
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  deleteFromS3: jest.fn(),
  getBucketName: jest.fn(),
  extractS3KeyFromUrl: jest.fn(),
  generateAccessUrl: jest.fn(),
  checkPlanLimitIfNeeded: jest.fn().mockResolvedValue(null),
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve(), logCreate: () => Promise.resolve(), logDelete: () => Promise.resolve() }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  calculateAmountDue: jest.fn().mockReturnValue(0),
  handleLoyaltyOnOrderCreate: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/analytics-days', () => ({ readAnalyticsTimeZone: jest.fn() }));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PUT as updateProduct } from '../../apps/api/app/api/products/[id]/route';
import { POST as createProduct } from '../../apps/api/app/api/products/route';
import { POST as bulkImport } from '../../apps/api/app/api/products/bulk-import/route';
import { POST as createOrder } from '../../apps/api/app/api/orders/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 1 } };
const inventory = { user: { id: 9, role: 'OUTLET_INVENTORY', email: 'k@x' }, userScope: { merchantId: 2, outletId: 1 } };

const outlets: Record<number, any> = {
  1: { id: 1, name: 'Main', merchantId: 2, isActive: true, isDefault: true, merchant: { id: 2, name: 'Shop' } },
  3: { id: 3, name: 'Second', merchantId: 2, isActive: true, isDefault: false, merchant: { id: 2, name: 'Shop' } },
};
const headersOf = (capabilities?: string) => ({ get: (k: string) => (k.toLowerCase() === 'x-client-capabilities' ? capabilities ?? null : null) });

// ------------------------------------------------------------------------------------------------ POST /api/products

describe('POST /api/products — isListed of the new rows', () => {
  function createRequest(data: any): any {
    const form = new Map<string, any>([['data', JSON.stringify(data)]]);
    return { url: 'http://localhost/api/products', headers: headersOf(), formData: async () => ({ get: (k: string) => form.get(k) ?? null, getAll: () => [] }) };
  }
  const rowsCreated = () => mockDb.products.create.mock.calls[0][0].outletStock.create;
  const base = { name: 'Áo dài', rentPrice: 1 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
    mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    mockDb.products.create.mockImplementation(async (data: any) => ({ id: 70, images: [], ...data }));
  });

  it('an old app (one row, no isListed): its branch is listed, the other active branch gets a 0 row that is not', async () => {
    ctx = merchant;
    const res: any = await createProduct(createRequest({ ...base, outletStock: [{ outletId: 1, stock: 5 }] }));
    expect(res.status).toBe(200);
    expect(rowsCreated()).toEqual([
      { outlet: { connect: { id: 1 } }, stock: 5, available: 5, renting: 0, isListed: true },
      { outlet: { connect: { id: 3 } }, stock: 0, available: 0, renting: 0, isListed: false },
    ]);
  });

  it('the owner (web form) sends isListed per branch', async () => {
    ctx = merchant;
    await createProduct(createRequest({ ...base, outletStock: [{ outletId: 1, stock: 5, isListed: true }, { outletId: 3, stock: 2, isListed: false }] }));
    expect(rowsCreated().map((r: any) => [r.outlet.connect.id, r.stock, r.isListed])).toEqual([[1, 5, true], [3, 2, false]]);
  });

  it('the old web tab (every branch, stock 0, no isListed) lists every branch, as it did before', async () => {
    ctx = merchant;
    await createProduct(createRequest({ ...base, outletStock: [{ outletId: 1, stock: 4 }, { outletId: 3, stock: 0 }] }));
    expect(rowsCreated().map((r: any) => r.isListed)).toEqual([true, true]);
  });

  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])('%s: its branch is listed even when it sends isListed: false', async (_r, who) => {
    ctx = who;
    await createProduct(createRequest({ ...base, outletStock: [{ outletId: 1, stock: 5, isListed: false }] }));
    expect(rowsCreated().map((r: any) => [r.outlet.connect.id, r.isListed])).toEqual([[1, true], [3, false]]);
  });
});

// ------------------------------------------------------------------------------------------------ PUT /api/products/[id]

describe('PUT /api/products/[id] — isListed', () => {
  const product = {
    id: 7, name: 'Vest', description: '', barcode: '123', rentPrice: 1, salePrice: null, costPrice: null, deposit: 0,
    pricingType: 'FIXED', durationConfig: null, isActive: true, images: [], category: { id: 4, name: 'Vest' }, merchant: { id: 2, name: 'Shop' },
    pricingOptions: [{ type: 'FIXED', price: 1, isDefault: true, isActive: true, sortOrder: 0 }],
    outletStock: [
      { outletId: 1, stock: 4, renting: 1, available: 3, isListed: true, outlet: { id: 1, name: 'Main' } },
      { outletId: 3, stock: 0, renting: 0, available: 0, isListed: false, outlet: { id: 3, name: 'Second' } },
    ],
  };
  const putRequest = (data: any, capabilities?: string): any => {
    const form = new Map<string, any>([['data', JSON.stringify(data)]]);
    return { url: 'http://localhost/api/products/7', headers: headersOf(capabilities), formData: async () => ({ get: (k: string) => form.get(k) ?? null, getAll: () => [] }) };
  };
  const upsertsSent = () => mockDb.products.update.mock.calls[0][1].outletStock?.upsert ?? [];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.products.findById.mockResolvedValue(product);
    mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
    mockDb.products.update.mockImplementation(async (id: number, data: any) => ({ ...product, ...data, id, createdAt: new Date(), updatedAt: new Date() }));
  });

  it('an old app raises the stock of an unlisted branch: that row is listed in the same upsert', async () => {
    await updateProduct(putRequest({ outletStock: [{ outletId: 3, stock: 6 }] }), { params: { id: '7' } });
    const up = upsertsSent().find((u: any) => u.where.productId_outletId.outletId === 3);
    expect(up.update).toEqual({ stock: 6, available: 6, isListed: true });
  });

  it('read then save: the whole stock sent back unchanged lists nothing and unlists nothing', async () => {
    await updateProduct(putRequest({ outletStock: [{ outletId: 1, stock: 4 }, { outletId: 3, stock: 0 }] }), { params: { id: '7' } });
    for (const u of upsertsSent()) expect(u.update).not.toHaveProperty('isListed');
  });

  it('a client with the branch-listing token does not list on a stock write', async () => {
    await updateProduct(putRequest({ outletStock: [{ outletId: 3, stock: 6 }] }, 'branch-listing'), { params: { id: '7' } });
    for (const u of upsertsSent()) expect(u.update).not.toHaveProperty('isListed');
  });

  it('an isListed sent in the body is ignored (ticking has its own route)', async () => {
    await updateProduct(putRequest({ outletStock: [{ outletId: 1, stock: 4, isListed: false }, { outletId: 3, stock: 0, isListed: true }] }), { params: { id: '7' } });
    for (const u of upsertsSent()) {
      expect(u.update).not.toHaveProperty('isListed');
      expect(u.create).not.toHaveProperty('isListed');
    }
  });

  it('OUTLET_ADMIN may now edit the shared fields of a product its branch lists, even with stock 0', async () => {
    ctx = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 3 } };
    mockDb.products.findById.mockResolvedValue({
      ...product,
      outletStock: [
        { outletId: 1, stock: 4, renting: 1, available: 3, isListed: true, outlet: { id: 1, name: 'Main' } },
        { outletId: 3, stock: 0, renting: 0, available: 0, isListed: true, outlet: { id: 3, name: 'Second' } },
      ],
    });
    const res: any = await updateProduct(putRequest({ name: 'Vest xanh' }), { params: { id: '7' } });
    expect(res.status).toBe(200);
  });

  it('OUTLET_ADMIN still cannot edit the shared fields of a product its branch neither holds nor lists', async () => {
    ctx = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 3 } };
    mockDb.products.findById.mockResolvedValue(product);
    const res: any = await updateProduct(putRequest({ name: 'Vest xanh' }), { params: { id: '7' } });
    expect([res.status, res.body.code]).toEqual([403, 'PRODUCT_NOT_AVAILABLE_AT_OUTLET']);
  });
});

// ------------------------------------------------------------------------------------------------ POST /api/orders

describe('POST /api/orders — products of the order at the order branch', () => {
  const body = {
    orderType: 'SALE',
    outletId: 1,
    orderItems: [
      { productId: 11, quantity: 1, unitPrice: 100000, totalPrice: 100000 },
      { productId: 12, quantity: 2, unitPrice: 50000, totalPrice: 100000 },
    ],
    totalAmount: 200000,
  };
  const post = (capabilities?: string): any => ({
    url: 'http://localhost/api/orders',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : k.toLowerCase() === 'x-client-capabilities' ? capabilities ?? null : null) },
    json: async () => body,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop', pricingConfig: null });
    mockDb.products.findById.mockImplementation(async (id: number) => ({ id, name: 'Dress', pricingType: 'FIXED', pricingOptions: [], merchantId: 2, merchant: { id: 2 } }));
    const created = {
      id: 500, orderNumber: '123456', orderType: 'SALE', status: 'COMPLETED', outletId: 1, totalAmount: 200000, payments: [],
      orderItems: [{ productId: 11, quantity: 1 }, { productId: 12, quantity: 2 }],
    };
    mockDb.orders.create.mockResolvedValue(created);
    mockDb.orders.createOnce.mockImplementation(async () => ({ order: created, replay: false }));
  });

  it('an old app (no token): the products of the order are listed at the branch of the order', async () => {
    const res: any = await createOrder(post());
    expect(res.status).toBe(200);
    expect(mockPrisma.outletStock.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.outletStock.updateMany).toHaveBeenCalledWith({
      where: { outletId: 1, productId: { in: [11, 12] }, isListed: false },
      data: { isListed: true },
    });
  });

  it('other tokens only (installments, block-pricing) is still an old app for this', async () => {
    await createOrder(post('installments,block-pricing'));
    expect(mockPrisma.outletStock.updateMany).toHaveBeenCalledTimes(1);
  });

  it('a new app / the web (branch-listing token) does not list anything: a draft cart does not undo the owner\'s untick', async () => {
    const res: any = await createOrder(post('installments,block-pricing,branch-listing'));
    expect(res.status).toBe(200);
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
  });

  it('the order is created even when listing fails (best effort, like the stock update)', async () => {
    mockPrisma.outletStock.updateMany.mockRejectedValueOnce(new Error('db down'));
    const res: any = await createOrder(post());
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('ORDER_CREATED_SUCCESS');
  });

  it('a replayed request (same idempotency key) lists nothing again', async () => {
    mockDb.orders.createOnce.mockImplementationOnce(async () => ({ order: { id: 500, orderNumber: '123456', orderType: 'SALE', status: 'COMPLETED', outletId: 1, totalAmount: 200000, payments: [], orderItems: [{ productId: 11, quantity: 1 }] }, replay: true }));
    await createOrder(post());
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------------------------------------ bulk-import

describe('POST /api/products/bulk-import — isListed of the imported rows', () => {
  const txCreate = jest.fn();
  const importRequest = (): any => ({ json: async () => ({ products: [{ name: 'Áo dài', rentPrice: 1, stock: 4 }] }) });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
    mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
    mockDb.categories.search.mockResolvedValue({ data: [{ id: 4, name: 'default' }] });
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    txCreate.mockImplementation(async ({ data }: any) => ({ id: 71, name: data.name }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({ product: { create: txCreate } }));
  });

  it('the import branch is listed, the other active branches get a 0 row that is not', async () => {
    ctx = outletAdmin;
    const res: any = await bulkImport(importRequest());
    expect(res.status).toBe(200);
    expect(txCreate.mock.calls[0][0].data.outletStock.create).toEqual([
      { outletId: 1, stock: 4, available: 4, renting: 0, isListed: true },
      { outletId: 3, stock: 0, available: 0, renting: 0, isListed: false },
    ]);
  });
});
