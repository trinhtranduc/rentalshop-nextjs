/**
 * #1341 (#1335) PUT /api/products/listing — tick / untick "Hiện ở chi nhánh" for one branch, one or many products.
 * - Only MERCHANT (and ADMIN): OUTLET_ADMIN / OUTLET_INVENTORY / OUTLET_STAFF get 403 INSUFFICIENT_PERMISSIONS, even for
 *   their own branch.
 * - A branch outside the shop, or a closed one: 404 OUTLET_NOT_FOUND. A product outside the shop: 404 PRODUCT_NOT_FOUND.
 * - Unticking is never refused: stock, units on rent and open orders do not matter (owner 2026-10-30). No 409.
 * - Sending the current value again is not a change and not an error.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

type Row = { productId: number; outletId: number; isListed: boolean; stock: number; renting: number };
// Merchant 2: outlets 1, 3 (active) and 4 (closed). Merchant 9: outlet 7. Products 11, 12 (merchant 2), 13 (merchant 9).
const outlets: Record<number, { id: number; name: string; merchantId: number; isActive: boolean }> = {
  1: { id: 1, name: 'Main', merchantId: 2, isActive: true },
  3: { id: 3, name: 'Second', merchantId: 2, isActive: true },
  4: { id: 4, name: 'Closed', merchantId: 2, isActive: false },
  7: { id: 7, name: 'Other shop', merchantId: 9, isActive: true },
};
const products: Record<number, { id: number; name: string; merchantId: number }> = {
  11: { id: 11, name: 'Áo dài đỏ', merchantId: 2 },
  12: { id: 12, name: 'Áo dài xanh', merchantId: 2 },
  13: { id: 13, name: 'Vest', merchantId: 9 },
};
let rows: Row[] = [];

const mockPrisma: any = {
  outlet: {
    findFirst: jest.fn(async ({ where }: any) => {
      const o = outlets[where.id];
      if (!o || (where.isActive !== undefined && o.isActive !== where.isActive)) return null;
      if (where.merchantId !== undefined && o.merchantId !== where.merchantId) return null;
      return o;
    }),
  },
  product: {
    findMany: jest.fn(async ({ where }: any) =>
      (where.id.in as number[]).map((id) => products[id]).filter((p) => p && p.merchantId === where.merchantId)
    ),
  },
  outletStock: {
    findMany: jest.fn(async ({ where }: any) =>
      rows.filter((r) => r.outletId === where.outletId && (where.productId.in as number[]).includes(r.productId))
    ),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const r of rows) {
        if (r.outletId === where.outletId && (where.productId.in as number[]).includes(r.productId)) {
          r.isListed = data.isListed;
          count += 1;
        }
      }
      return { count };
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const d of data) rows.push({ ...d, stock: 0, renting: 0 });
      return { count: data.length };
    }),
  },
  order: { count: jest.fn() },
  orderItem: { count: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
};
jest.mock('@rentalshop/database', () => ({ db: {}, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));
jest.mock('@rentalshop/utils/server', () => ({
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve() }),
}));

import { PUT } from '../../apps/api/app/api/products/listing/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} };
const branchCtx = (role: string, outletId: number) => ({ user: { id: 8, role, email: `${role}@x` }, userScope: { merchantId: 2, outletId } });

const put = (body: any): Promise<any> =>
  PUT({ url: 'http://localhost/api/products/listing', headers: { get: () => null }, json: async () => body } as any) as Promise<any>;
const stateOf = (productId: number, outletId: number) => rows.find((r) => r.productId === productId && r.outletId === outletId);

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  rows = [
    { productId: 11, outletId: 1, isListed: true, stock: 8, renting: 2 },
    { productId: 11, outletId: 3, isListed: false, stock: 0, renting: 0 },
    { productId: 12, outletId: 1, isListed: true, stock: 0, renting: 0 },
    { productId: 12, outletId: 3, isListed: false, stock: 0, renting: 0 },
  ];
});

describe('PUT /api/products/listing — who may tick', () => {
  it('MERCHANT lists a product at another branch', async () => {
    const res = await put({ outletId: 3, productIds: [11], isListed: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(stateOf(11, 3)?.isListed).toBe(true);
  });

  it('ADMIN (system) may as well, for any shop', async () => {
    ctx = admin;
    const res = await put({ outletId: 3, productIds: [11], isListed: true });
    expect(res.status).toBe(200);
    expect(stateOf(11, 3)?.isListed).toBe(true);
  });

  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF'])('%s gets 403 INSUFFICIENT_PERMISSIONS, even for its own branch', async (role) => {
    ctx = branchCtx(role, 3);
    const res = await put({ outletId: 3, productIds: [11], isListed: true });
    expect([res.status, res.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
    expect(stateOf(11, 3)?.isListed).toBe(false);
  });
});

describe('PUT /api/products/listing — what it may touch', () => {
  it('a branch of another shop: 404 OUTLET_NOT_FOUND, nothing written', async () => {
    const res = await put({ outletId: 7, productIds: [11], isListed: true });
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
  });

  it('a closed branch: 404 OUTLET_NOT_FOUND', async () => {
    const res = await put({ outletId: 4, productIds: [11], isListed: true });
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
  });

  it('a product of another shop (or none): 404 PRODUCT_NOT_FOUND, nothing written', async () => {
    for (const ids of [[13], [11, 13], [99]]) {
      const res = await put({ outletId: 3, productIds: ids, isListed: true });
      expect([res.status, res.body.code]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    }
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.outletStock.createMany).not.toHaveBeenCalled();
  });

  it('validation: outletId / productIds (1..200 positive integers) / isListed', async () => {
    for (const body of [
      {},
      { outletId: 3, productIds: [], isListed: true },
      { outletId: 3, productIds: Array.from({ length: 201 }, (_, i) => i + 1), isListed: true },
      { outletId: 3, productIds: [0], isListed: true },
      { outletId: 3, productIds: [1.5], isListed: true },
      { outletId: 'x', productIds: [11], isListed: true },
      { outletId: 3, productIds: [11] },
      { outletId: 3, productIds: [11], isListed: 'yes' },
    ]) {
      const res = await put(body);
      expect([res.status, res.body.code]).toEqual([400, 'VALIDATION_ERROR']);
    }
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
  });

  it('many products at once; the same id twice counts once', async () => {
    const res = await put({ outletId: 3, productIds: [11, 12, 11], isListed: true });
    expect(res.status).toBe(200);
    expect(stateOf(11, 3)?.isListed).toBe(true);
    expect(stateOf(12, 3)?.isListed).toBe(true);
    expect(res.body.data).toEqual(expect.objectContaining({ outletId: 3, isListed: true, productIds: [11, 12], changed: 2 }));
  });

  it('a product without a row at that branch gets one, listed (stock 0)', async () => {
    rows = rows.filter((r) => !(r.productId === 12 && r.outletId === 3));
    const res = await put({ outletId: 3, productIds: [12], isListed: true });
    expect(res.status).toBe(200);
    expect(mockPrisma.outletStock.createMany).toHaveBeenCalledWith({
      data: [{ productId: 12, outletId: 3, stock: 0, available: 0, renting: 0, isListed: true }],
      skipDuplicates: true,
    });
    expect(stateOf(12, 3)?.isListed).toBe(true);
  });

  it('unticking a product without a row at that branch writes nothing', async () => {
    rows = rows.filter((r) => !(r.productId === 12 && r.outletId === 3));
    const res = await put({ outletId: 3, productIds: [12], isListed: false });
    expect(res.status).toBe(200);
    expect(mockPrisma.outletStock.createMany).not.toHaveBeenCalled();
    expect(res.body.data.changed).toBe(0);
  });
});

describe('PUT /api/products/listing — unticking is never blocked (owner 2026-10-30)', () => {
  it('stock 8 with 2 on rent: unticks, 200, no 409, and stock / renting are not touched', async () => {
    const res = await put({ outletId: 1, productIds: [11], isListed: false });
    expect(res.status).toBe(200);
    expect(stateOf(11, 1)).toEqual({ productId: 11, outletId: 1, isListed: false, stock: 8, renting: 2 });
  });

  it('does not look at orders at all (open orders do not matter)', async () => {
    await put({ outletId: 1, productIds: [11], isListed: false });
    expect(mockPrisma.order.count).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.count).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled();
  });

  it('the update only sets isListed (never stock, renting or available)', async () => {
    await put({ outletId: 1, productIds: [11, 12], isListed: false });
    const call = mockPrisma.outletStock.updateMany.mock.calls[0][0];
    expect(call.data).toEqual({ isListed: false });
    expect(call.where.outletId).toBe(1);
  });

  it('sending the current value again is fine: 200, nothing changed', async () => {
    const res = await put({ outletId: 1, productIds: [11], isListed: true });
    expect(res.status).toBe(200);
    expect(res.body.data.changed).toBe(0);
    expect(mockPrisma.outletStock.updateMany).not.toHaveBeenCalled();
  });
});
