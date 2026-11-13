/**
 * #1533 — Excel import picks the branch and the stock of each branch (spec .agent/changes/1533-import-branch-stock).
 * Shop 2 has active outlets 1 (main) and 3; outlet 50 belongs to another shop.
 * - No `outletId` and no `outlets` on the rows: as before (legacy path, same-barcode rows skipped).
 * - `outletId`: the file's stock goes to that branch; `outlets` per row: the branches ticked "Hiện" with their stock.
 * - Existing product (same barcode): a ticked branch at stock 0 gets the stock and is listed; a branch that already
 *   has stock is skipped; totalStock = sum of every row.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  outlets: { findById: jest.fn(), search: jest.fn() },
  merchants: { findById: jest.fn() },
  categories: { search: jest.fn() },
};
const mockPrisma: any = {
  outlet: { findMany: jest.fn() },
  product: { findFirst: jest.fn() },
  category: { findFirst: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({
  productCreateSchema: { safeParse: (data: any) => ({ success: true, data }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  clientSafeErrorText: (_e: any, fallback: string) => fallback,
  isTechnicalErrorText: () => false,
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));

import { POST as bulkImport } from '../../apps/api/app/api/products/bulk-import/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 3 } };
const inventory = { user: { id: 9, role: 'OUTLET_INVENTORY', email: 'k@x' }, userScope: { merchantId: 2, outletId: 3 } };

const req = (body: any): any => ({ json: async () => body });
const row = (extra: any = {}) => ({ name: 'Áo dài thêu rồng', barcode: 'AD001', rentPrice: 350000, stock: 2, ...extra });

const tx: any = {
  product: { create: jest.fn(), update: jest.fn() },
  outletStock: { upsert: jest.fn(), aggregate: jest.fn() },
};

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
  mockDb.categories.search.mockResolvedValue({ data: [{ id: 4, name: 'default' }] });
  // legacy path: the first outlet of the search, then findById
  mockDb.outlets.search.mockResolvedValue({ data: [{ id: 1 }, { id: 3 }] });
  mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id }));
  mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
  mockPrisma.product.findFirst.mockResolvedValue(null);
  tx.product.create.mockImplementation(async ({ data }: any) => ({ id: 71, name: data.name }));
  tx.product.update.mockResolvedValue({});
  tx.outletStock.upsert.mockResolvedValue({});
  tx.outletStock.aggregate.mockResolvedValue({ _sum: { stock: 5 } });
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));
});

const createdRows = (i = 0) => tx.product.create.mock.calls[i][0].data.outletStock.create;

describe('legacy call (no outletId, no outlets): unchanged', () => {
  it('stock goes to the first outlet of the search, the other active outlet gets an unlisted 0 row', async () => {
    const res: any = await bulkImport(req({ products: [row()] }));
    expect(res.status).toBe(200);
    expect(createdRows()).toEqual([
      { outletId: 1, stock: 2, available: 2, renting: 0, isListed: true },
      { outletId: 3, stock: 0, available: 0, renting: 0, isListed: false },
    ]);
    expect(res.body.data).toEqual({ imported: 1, skipped: 0, failed: 0, total: 1, errors: [], rows: [{ row: 1, status: 'created' }] });
  });

  it('a product with the same barcode is skipped and nothing is written to it', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 9, deletedAt: null, outletStock: [{ outletId: 3, stock: 0 }] });
    const res: any = await bulkImport(req({ products: [row()] }));
    expect(res.body.data).toEqual({
      imported: 0,
      skipped: 1,
      failed: 0,
      total: 1,
      errors: [],
      rows: [{ row: 1, status: 'duplicate', reason: 'barcodeExists' }],
    });
    expect(tx.outletStock.upsert).not.toHaveBeenCalled();
  });
});

describe('outletId: the file stock goes to the chosen branch', () => {
  it('new product: listed with stock at outlet 3, unlisted 0 at outlet 1, totalStock = 2', async () => {
    const res: any = await bulkImport(req({ outletId: 3, products: [row()] }));
    expect(res.status).toBe(200);
    expect(createdRows()).toEqual([
      { outletId: 1, stock: 0, available: 0, renting: 0, isListed: false },
      { outletId: 3, stock: 2, available: 2, renting: 0, isListed: true },
    ]);
    expect(tx.product.create.mock.calls[0][0].data.totalStock).toBe(2);
    expect(res.body.data).toMatchObject({
      imported: 1,
      updated: 0,
      skipped: 0,
      byOutlet: [
        { outletId: 1, listed: 0, outOfStock: 0, skipped: 0 },
        { outletId: 3, listed: 1, outOfStock: 0, skipped: 0 },
      ],
    });
  });

  it("an outlet of another shop is refused with OUTLET_NOT_FOUND and nothing is written", async () => {
    const res: any = await bulkImport(req({ outletId: 50, products: [row()] }));
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('outlets per row: the branches ticked "Hiện"', () => {
  it('two branches with their own stock: both listed, totalStock = sum', async () => {
    await bulkImport(req({ outletId: 1, products: [row({ stock: 4, outlets: [{ outletId: 1, stock: 4 }, { outletId: 3, stock: 3 }] })] }));
    expect(createdRows()).toEqual([
      { outletId: 1, stock: 4, available: 4, renting: 0, isListed: true },
      { outletId: 3, stock: 3, available: 3, renting: 0, isListed: true },
    ]);
    expect(tx.product.create.mock.calls[0][0].data.totalStock).toBe(7);
  });

  it('a ticked branch with 0: listed and out of stock', async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ stock: 6, outlets: [{ outletId: 1, stock: 6 }, { outletId: 3, stock: 0 }] })] }));
    expect(createdRows()[1]).toEqual({ outletId: 3, stock: 0, available: 0, renting: 0, isListed: true });
    expect(res.body.data.byOutlet).toContainEqual({ outletId: 3, listed: 1, outOfStock: 1, skipped: 0 });
  });

  it('only the other branch ticked: the chosen branch gets an unlisted 0 row', async () => {
    await bulkImport(req({ outletId: 1, products: [row({ outlets: [{ outletId: 3, stock: 2 }] })] }));
    expect(createdRows()).toEqual([
      { outletId: 1, stock: 0, available: 0, renting: 0, isListed: false },
      { outletId: 3, stock: 2, available: 2, renting: 0, isListed: true },
    ]);
  });

  it('a row with no branch ticked is a row error and nothing is imported', async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ outlets: [] })] }));
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.errors).toEqual([{ row: 1, error: expect.any(String) }]);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('a negative or broken stock on a branch is a row error', async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ outlets: [{ outletId: 1, stock: -1 }] })] }));
    expect(res.body.data.errors).toHaveLength(1);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("an outlet of another shop inside a row is refused with OUTLET_NOT_FOUND", async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ outlets: [{ outletId: 50, stock: 1 }] })] }));
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('existing product (same barcode): stock only where the branch has none', () => {
  it('outlet 3 at stock 0 gets the stock and is listed; outlet 1 is not touched; totalStock = sum of rows', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 9,
      deletedAt: null,
      outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 0 }],
    });
    tx.outletStock.aggregate.mockResolvedValue({ _sum: { stock: 3 } });
    const res: any = await bulkImport(req({ outletId: 3, products: [row({ stock: 1 })] }));
    expect(tx.product.create).not.toHaveBeenCalled();
    expect(tx.outletStock.upsert).toHaveBeenCalledTimes(1);
    expect(tx.outletStock.upsert).toHaveBeenCalledWith({
      where: { productId_outletId: { productId: 9, outletId: 3 } },
      create: { productId: 9, outletId: 3, stock: 1, available: 1, renting: 0, isListed: true },
      update: { stock: 1, available: 1, isListed: true },
    });
    expect(tx.outletStock.aggregate).toHaveBeenCalledWith({ where: { productId: 9 }, _sum: { stock: true } });
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { totalStock: 3 } });
    expect(res.body.data).toMatchObject({ imported: 0, updated: 1, skipped: 0 });
  });

  it('a branch with no stock row yet is created', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 9, deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }] });
    await bulkImport(req({ outletId: 3, products: [row({ stock: 1 })] }));
    expect(tx.outletStock.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { productId_outletId: { productId: 9, outletId: 3 } } }));
  });

  it('the branch already has stock: skipped, nothing written', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 9, deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 0 }] });
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ stock: 5 })] }));
    expect(tx.outletStock.upsert).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({ imported: 0, updated: 0, skipped: 1 });
    expect(res.body.data.byOutlet).toContainEqual({ outletId: 1, listed: 0, outOfStock: 0, skipped: 1 });
  });

  it('two ticked branches, one with stock: writes the empty one only', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 9, deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 0 }] });
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ outlets: [{ outletId: 1, stock: 9 }, { outletId: 3, stock: 4 }] })] }));
    expect(tx.outletStock.upsert).toHaveBeenCalledTimes(1);
    expect(tx.outletStock.upsert.mock.calls[0][0].where).toEqual({ productId_outletId: { productId: 9, outletId: 3 } });
    expect(res.body.data.byOutlet).toEqual([
      { outletId: 1, listed: 0, outOfStock: 0, skipped: 1 },
      { outletId: 3, listed: 1, outOfStock: 0, skipped: 0 },
    ]);
  });

  it('a deleted product with the same barcode is skipped as before', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 9, deletedAt: new Date('2026-10-01T00:00:00Z'), outletStock: [] });
    const res: any = await bulkImport(req({ outletId: 3, products: [row()] }));
    expect(tx.outletStock.upsert).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({ imported: 0, updated: 0, skipped: 1 });
  });
});

describe('branch roles: only their own outlet', () => {
  it.each([['OUTLET_ADMIN', outletAdmin], ['OUTLET_INVENTORY', inventory]])(
    '%s: another outlet in the body or the rows is ignored; the own row of `outlets` gives the number',
    async (_r, who) => {
      ctx = who;
      const res: any = await bulkImport(req({ outletId: 1, products: [row({ stock: 2, outlets: [{ outletId: 1, stock: 9 }, { outletId: 3, stock: 5 }] })] }));
      expect(res.status).toBe(200);
      expect(createdRows()).toEqual([
        { outletId: 1, stock: 0, available: 0, renting: 0, isListed: false },
        { outletId: 3, stock: 5, available: 5, renting: 0, isListed: true },
      ]);
    },
  );

  it('OUTLET_ADMIN with only outletId: the file stock goes to its own outlet', async () => {
    ctx = outletAdmin;
    await bulkImport(req({ outletId: 1, products: [row({ stock: 2 })] }));
    expect(createdRows()).toContainEqual({ outletId: 3, stock: 2, available: 2, renting: 0, isListed: true });
    expect(createdRows()).toContainEqual({ outletId: 1, stock: 0, available: 0, renting: 0, isListed: false });
  });
});
