/**
 * #1339 — PUT /api/merchants/:id/products/:productId (admin web) must keep the units out on rent.
 *
 * Before: it deleted every OutletStock row of the product and created them again with `renting: 0`
 * (bug #359 only fixed PUT /api/products/:id). Returning a rented unit later made `renting` negative.
 *
 * The stock table below is a small stateful fake, so the tests check the rows that end up stored
 * (and that nothing was written when the request is refused), not how the route writes them.
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

// rows by `${productId}:${outletId}`
let rows: Map<string, any>;
let writes: string[];
const rowKey = (productId: number, outletId: number) => `${productId}:${outletId}`;
const outletNames: Record<number, string> = { 1: 'Main', 3: 'Second' };

const storedProduct = () => ({
  id: 7,
  name: 'Vest đen',
  merchant: { id: 2, name: 'Shop' },
  outletStock: [...rows.values()].map((r) => ({
    ...r,
    outlet: { id: r.outletId, name: outletNames[r.outletId], address: null },
  })),
});

const applyUpsert = (u: any) => {
  const { productId, outletId } = u.where.productId_outletId;
  const key = rowKey(productId, outletId);
  const current = rows.get(key);
  rows.set(key, current ? { ...current, ...u.update } : { productId, outletId, ...u.create });
};

const mockDb: any = {
  products: {
    findById: jest.fn(async () => storedProduct()),
    update: jest.fn(async (_id: number, data: any) => {
      writes.push('products.update');
      for (const u of data?.outletStock?.upsert ?? []) applyUpsert(u);
      return storedProduct();
    }),
  },
  outlets: {
    findById: jest.fn(async (id: number) =>
      ({ 1: { id: 1, name: 'Main', merchant: { id: 2 } }, 3: { id: 3, name: 'Second', merchant: { id: 2 } }, 50: { id: 50, name: 'Elsewhere', merchant: { id: 99 } } } as any)[id] ?? null),
  },
  categories: { findById: jest.fn() },
};
const mockPrisma: any = {
  outletStock: {
    deleteMany: jest.fn(async ({ where }: any) => {
      writes.push('outletStock.deleteMany');
      for (const [k, r] of [...rows]) if (r.productId === where.productId) rows.delete(k);
    }),
    create: jest.fn(async ({ data }: any) => {
      writes.push('outletStock.create');
      rows.set(rowKey(data.productId, data.outletId), { ...data });
    }),
    upsert: jest.fn(async (u: any) => {
      writes.push('outletStock.upsert');
      applyUpsert(u);
    }),
    update: jest.fn(async ({ where, data }: any) => {
      writes.push('outletStock.update');
      const { productId, outletId } = where.productId_outletId;
      rows.set(rowKey(productId, outletId), { ...rows.get(rowKey(productId, outletId)), ...data });
    }),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));

import { PUT } from '../../apps/api/app/api/merchants/[id]/products/[productId]/route';

const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 1 } };

const put = (body: any, merchantId = '2') =>
  PUT({ url: 'http://localhost/api/merchants/2/products/7', headers: { get: () => null }, json: async () => body } as any, {
    params: { id: merchantId, productId: '7' },
  }) as Promise<any>;

const stored = (outletId: number) => {
  const r = rows.get(rowKey(7, outletId));
  return r && { stock: r.stock, renting: r.renting, available: r.available };
};

beforeEach(() => {
  jest.clearAllMocks();
  ctx = admin;
  writes = [];
  // Main: 3 in stock, 2 out on rent. Second: 4 in stock, 1 out on rent.
  rows = new Map([
    [rowKey(7, 1), { productId: 7, outletId: 1, stock: 3, renting: 2, available: 1 }],
    [rowKey(7, 3), { productId: 7, outletId: 3, stock: 4, renting: 1, available: 3 }],
  ]);
});

describe('PUT /api/merchants/:id/products/:productId — outletStock keeps renting (#1339)', () => {
  it('raising stock keeps the 2 units out on rent: renting 2, available 3', async () => {
    const res = await put({ name: 'Vest đen', outletStock: [{ outletId: 1, stock: 5 }] });
    expect(res.status).toBe(200);
    expect(stored(1)).toEqual({ stock: 5, renting: 2, available: 3 });
  });

  it('an outlet that is not in the payload keeps its row, stock and renting', async () => {
    await put({ name: 'Vest đen', outletStock: [{ outletId: 1, stock: 5 }] });
    expect(stored(3)).toEqual({ stock: 4, renting: 1, available: 3 });
  });

  it('stock equal to renting is allowed: available 0', async () => {
    const res = await put({ name: 'Vest đen', outletStock: [{ outletId: 1, stock: 2 }] });
    expect(res.status).toBe(200);
    expect(stored(1)).toEqual({ stock: 2, renting: 2, available: 0 });
  });

  it('an outlet without a row yet gets one: renting 0, available = stock', async () => {
    rows.delete(rowKey(7, 3));
    const res = await put({ name: 'Vest đen', outletStock: [{ outletId: 3, stock: 6 }] });
    expect(res.status).toBe(200);
    expect(stored(3)).toEqual({ stock: 6, renting: 0, available: 6 });
    expect(stored(1)).toEqual({ stock: 3, renting: 2, available: 1 });
  });

  it('never deletes the stock rows of the product', async () => {
    await put({ name: 'Vest đen', outletStock: [{ outletId: 1, stock: 5 }] });
    expect(writes).not.toContain('outletStock.deleteMany');
    expect(mockPrisma.outletStock.deleteMany).not.toHaveBeenCalled();
  });

  it('stock below the 2 units out on rent: 400 STOCK_BELOW_RENTED and nothing is written', async () => {
    const before = JSON.stringify([...rows]);
    const res = await put({ name: 'renamed', outletStock: [{ outletId: 1, stock: 1 }] });
    expect([res.status, res.body.code]).toEqual([400, 'STOCK_BELOW_RENTED']);
    expect(writes).toEqual([]);
    expect(JSON.stringify([...rows])).toBe(before);
  });

  it('one outlet below its renting refuses the whole save, even when another outlet is fine', async () => {
    const before = JSON.stringify([...rows]);
    const res = await put({ name: 'renamed', outletStock: [{ outletId: 3, stock: 9 }, { outletId: 1, stock: 1 }] });
    expect([res.status, res.body.code]).toEqual([400, 'STOCK_BELOW_RENTED']);
    expect(writes).toEqual([]);
    expect(JSON.stringify([...rows])).toBe(before);
  });
});

describe('PUT /api/merchants/:id/products/:productId — refusals that stay as they were', () => {
  it("an outlet of another shop: 404 OUTLET_NOT_FOUND and nothing is written", async () => {
    const before = JSON.stringify([...rows]);
    const res = await put({ name: 'Vest đen', outletStock: [{ outletId: 50, stock: 3 }] });
    expect([res.status, res.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    expect(writes).toEqual([]);
    expect(JSON.stringify([...rows])).toBe(before);
  });

  it('a product of another merchant: 404 PRODUCT_NOT_FOUND and nothing is written', async () => {
    const res = await put({ name: 'x', outletStock: [{ outletId: 1, stock: 5 }] }, '99');
    expect([res.status, res.body.code]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    expect(writes).toEqual([]);
    expect(stored(1)).toEqual({ stock: 3, renting: 2, available: 1 });
  });

  it('a branch role: 403 INSUFFICIENT_PERMISSIONS and nothing is written', async () => {
    ctx = outletAdmin;
    const res = await put({ name: 'x', outletStock: [{ outletId: 1, stock: 5 }] });
    expect([res.status, res.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
    expect(writes).toEqual([]);
  });
});

describe('PUT /api/merchants/:id/products/:productId — response shape is unchanged', () => {
  it('returns { success: true, data: <the product as stored> } with every stock row and its outlet', async () => {
    const res = await put({ name: 'Vest đen', outletStock: [{ outletId: 1, stock: 5 }] });
    expect(Object.keys(res.body).sort()).toEqual(['data', 'success']);
    expect(res.body.success).toBe(true);
    expect(Object.keys(res.body.data).sort()).toEqual(['id', 'merchant', 'name', 'outletStock']);
    const main = res.body.data.outletStock.find((r: any) => r.outletId === 1);
    expect(main).toMatchObject({ outletId: 1, stock: 5, renting: 2, available: 3, outlet: { id: 1, name: 'Main' } });
    expect(res.body.data.outletStock).toHaveLength(2);
  });
});
