/**
 * #1535 — Excel import answers one `rows[]` entry per product sent (spec .agent/changes/1535-import-row-results, 1-9):
 * created, updated (stock added at branches with none), duplicate (barcodeExists / barcodeDeleted, with the existing
 * product's name), failed (with the error), notImported (another row failed, or the write rolled back).
 * Shop 2 has active outlets 1 (main) and 3. Old fields keep their values.
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
  mockDb.outlets.search.mockResolvedValue({ data: [{ id: 1 }, { id: 3 }] });
  mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id }));
  mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
  mockPrisma.product.findFirst.mockImplementation(async ({ where }: any) => existing[where.barcode] ?? null);
  tx.product.create.mockImplementation(async ({ data }: any) => ({ id: 71, name: data.name }));
  tx.product.update.mockResolvedValue({});
  tx.outletStock.upsert.mockResolvedValue({});
  tx.outletStock.aggregate.mockResolvedValue({ _sum: { stock: 5 } });
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));
});

/** Products already in shop 2, by barcode. */
const existing: Record<string, any> = {
  OLD: { id: 8, name: 'Áo cũ', deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 0 }] },
  UPD: { id: 9, name: 'Loa cũ', deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 0, renting: 0 }] },
  FULL: { id: 10, name: 'Vest đen', deletedAt: null, outletStock: [{ outletId: 1, stock: 2 }, { outletId: 3, stock: 1 }] },
  DEL: { id: 11, name: 'Váy đã xoá', deletedAt: new Date('2026-10-01T00:00:00Z'), outletStock: [] },
};

describe('rows[]: one entry per product sent, in order', () => {
  it('legacy call: created and duplicate (with the name of the product using the barcode); old fields unchanged', async () => {
    const res: any = await bulkImport(req({ products: [row({ barcode: 'NEW1' }), row({ barcode: 'OLD' }), row({ barcode: 'DEL' })] }));
    expect(res.body.data).toEqual({
      imported: 1,
      skipped: 2,
      failed: 0,
      total: 3,
      errors: [],
      rows: [
        { row: 1, status: 'created' },
        { row: 2, status: 'duplicate', reason: 'barcodeExists', existingName: 'Áo cũ' },
        { row: 3, status: 'duplicate', reason: 'barcodeDeleted', existingName: 'Váy đã xoá' },
      ],
    });
  });

  it('with branches: created, updated (written and skipped branches), duplicate with the branches that hold stock, deleted, no barcode', async () => {
    const res: any = await bulkImport(
      req({
        outletId: 1,
        products: [
          row({ barcode: 'NEW1', outlets: [{ outletId: 1, stock: 2 }] }),
          row({ barcode: 'UPD', outlets: [{ outletId: 1, stock: 4 }, { outletId: 3, stock: 3 }] }),
          row({ barcode: 'FULL', outlets: [{ outletId: 1, stock: 1 }] }),
          row({ barcode: 'DEL', outlets: [{ outletId: 1, stock: 1 }] }),
          row({ barcode: '', outlets: [{ outletId: 3, stock: 6 }] }),
        ],
      }),
    );
    expect(res.body.data.rows).toEqual([
      { row: 1, status: 'created' },
      { row: 2, status: 'updated', outlets: [3], skippedOutlets: [1] },
      { row: 3, status: 'duplicate', reason: 'barcodeExists', existingName: 'Vest đen', skippedOutlets: [1] },
      { row: 4, status: 'duplicate', reason: 'barcodeDeleted', existingName: 'Váy đã xoá' },
      { row: 5, status: 'created' },
    ]);
    expect(res.body.data).toMatchObject({ imported: 2, updated: 1, skipped: 2, failed: 0, total: 5 });
  });

  it('all rows duplicate (early answer) still lists them', async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ barcode: 'FULL' })] }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(res.body.data.rows).toEqual([{ row: 1, status: 'duplicate', reason: 'barcodeExists', existingName: 'Vest đen', skippedOutlets: [1] }]);
  });

  it('an invalid row: that row failed with the same error text, the others notImported, nothing written', async () => {
    const res: any = await bulkImport(req({ outletId: 1, products: [row({ barcode: 'NEW1' }), row({ barcode: 'NEW2', outlets: [] })] }));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(res.body.data.errors).toEqual([{ row: 2, error: expect.any(String) }]);
    expect(res.body.data.rows).toEqual([
      { row: 1, status: 'notImported' },
      { row: 2, status: 'failed', error: res.body.data.errors[0].error },
    ]);
  });

  it('a write error on row 2 rolls back: row 2 failed, the row created before it notImported, a duplicate stays duplicate', async () => {
    tx.product.create
      .mockImplementationOnce(async ({ data }: any) => ({ id: 71, name: data.name }))
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'P2003' }));
    const res: any = await bulkImport(req({ products: [row({ barcode: 'NEW1' }), row({ barcode: 'NEW2' }), row({ barcode: 'OLD' })] }));
    expect(res.body.data).toMatchObject({ imported: 0, failed: 1, errors: [{ row: 2, error: expect.any(String) }] });
    expect(res.body.data.rows).toEqual([
      { row: 1, status: 'notImported' },
      { row: 2, status: 'failed', error: res.body.data.errors[0].error },
      { row: 3, status: 'duplicate', reason: 'barcodeExists', existingName: 'Áo cũ' },
    ]);
  });

  it('a barcode taken while writing (P2002) is a duplicate', async () => {
    tx.product.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res: any = await bulkImport(req({ products: [row({ barcode: 'RACE' }), row({ barcode: 'NEW2' })] }));
    expect(res.body.data).toMatchObject({ imported: 1, skipped: 1 });
    expect(res.body.data.rows).toEqual([
      { row: 1, status: 'duplicate', reason: 'barcodeExists' },
      { row: 2, status: 'created' },
    ]);
  });

  it('the duplicate check fails: that row failed, the others go on', async () => {
    mockPrisma.product.findFirst.mockImplementation(async ({ where }: any) => {
      if (where.barcode === 'BAD') throw new Error('db down');
      return null;
    });
    const res: any = await bulkImport(req({ products: [row({ barcode: 'BAD' }), row({ barcode: 'NEW2' })] }));
    expect(res.body.data).toMatchObject({ imported: 1, skipped: 1 });
    expect(res.body.data.rows).toEqual([
      { row: 1, status: 'failed', error: expect.any(String) },
      { row: 2, status: 'created' },
    ]);
  });
});
