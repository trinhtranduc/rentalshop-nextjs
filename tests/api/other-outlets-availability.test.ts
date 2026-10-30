/**
 * #1347 (#1335, PR 2) POST /api/products/other-outlets-availability
 * "Chi nhánh khác còn N": for a product that is short at the order's branch, the other open branches of the shop that
 * list it and still have units on the order's days, counted the way POST /api/products/batch-availability counts.
 *
 * - Seen by MERCHANT, ADMIN, OUTLET_ADMIN, OUTLET_INVENTORY; OUTLET_STAFF gets 403 INSUFFICIENT_PERMISSIONS.
 * - Only other branches that are open and have ticked the product (`OutletStock.isListed`), `available > 0`,
 *   most units first, then branch id.
 * - Days are Vietnam civil days (`Asia/Ho_Chi_Minh`): run with TZ=UTC and TZ=Asia/Ho_Chi_Minh, same result.
 * - Parity: for any window the answer for branch B equals `effectivelyAvailable` that batch-availability gives for B.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

type OutletRow = { id: number; name: string; merchantId: number; isActive: boolean; isDefault?: boolean };
type StockRow = { productId: number; outletId: number; stock: number; available: number; renting: number; isListed: boolean };
type OrderRow = {
  id: number;
  outletId: number;
  orderType: 'RENT' | 'SALE';
  status: string;
  orderNumber: string;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  deletedAt: Date | null;
  items: Array<{ productId: number; quantity: number }>;
};

// Shop 2: A(1, default), B(3), C(5) open; D(4) closed. Shop 9: E(7) only.
const outlets: OutletRow[] = [
  { id: 1, name: 'Quận 1', merchantId: 2, isActive: true, isDefault: true },
  { id: 3, name: 'Quận 7', merchantId: 2, isActive: true },
  { id: 5, name: 'Thủ Đức', merchantId: 2, isActive: true },
  { id: 4, name: 'Đóng cửa', merchantId: 2, isActive: false },
  { id: 7, name: 'Shop khác', merchantId: 9, isActive: true, isDefault: true },
];
const products: Record<number, { id: number; name: string; merchantId: number; deletedAt: Date | null }> = {
  11: { id: 11, name: 'Áo dài đỏ', merchantId: 2, deletedAt: null },
  12: { id: 12, name: 'Áo dài xanh', merchantId: 2, deletedAt: null },
  13: { id: 13, name: 'Vest', merchantId: 9, deletedAt: null },
  14: { id: 14, name: 'Đã xoá', merchantId: 2, deletedAt: new Date('2026-01-01T00:00:00Z') },
  15: { id: 15, name: 'Trả lúc 23:59:59', merchantId: 2, deletedAt: null },
  16: { id: 16, name: 'Lấy lúc 00:00', merchantId: 2, deletedAt: null },
};
let stocks: StockRow[] = [];
let orders: OrderRow[] = [];

// Prisma ignores `{ in: undefined }` (batch-availability sends one when the body has `products`, not `productIds`)
const inList = (cond: any, value: any) =>
  cond === undefined || (typeof cond === 'object' && cond !== null ? cond.in === undefined || cond.in.includes(value) : cond === value);

/** Evaluates the parts of an Order `where` the two availability routes use. */
function orderMatches(o: OrderRow, w: any): boolean {
  if (w.outletId !== undefined && !inList(w.outletId, o.outletId)) return false;
  if (w.deletedAt === null && o.deletedAt !== null) return false;
  if (w.orderType !== undefined && o.orderType !== w.orderType) return false;
  if (w.status?.in && !w.status.in.includes(o.status)) return false;
  if (w.id?.not !== undefined && o.id === w.id.not) return false;
  if (w.orderItems?.some && !o.items.some((i) => inList(w.orderItems.some.productId, i.productId))) return false;
  if (w.OR) {
    const ok = w.OR.some((c: any) => {
      if (c.status !== undefined) return o.status === c.status;
      if (c.AND) {
        return c.AND.every((p: any) => {
          if (p.status !== undefined) return o.status === p.status;
          if (p.pickupPlanAt?.gte) return !!o.pickupPlanAt && o.pickupPlanAt >= p.pickupPlanAt.gte;
          return true;
        });
      }
      const pick = o.pickupPlanAt;
      const ret = o.returnPlanAt;
      if (c.returnPlanAt === null) {
        return ret === null && !!pick && pick >= c.pickupPlanAt.gte && pick < c.pickupPlanAt.lt;
      }
      return !!pick && !!ret && pick < c.pickupPlanAt.lt && ret >= c.returnPlanAt.gte;
    });
    if (!ok) return false;
  }
  return true;
}

const mockPrisma: any = {
  outlet: {
    findFirst: jest.fn(async ({ where }: any) => {
      const o = outlets.find((x) => x.id === where.id);
      if (!o) return null;
      if (where.isActive !== undefined && o.isActive !== where.isActive) return null;
      if (where.merchantId !== undefined && o.merchantId !== where.merchantId) return null;
      return o;
    }),
    findMany: jest.fn(async ({ where }: any) =>
      outlets.filter(
        (o) =>
          o.merchantId === where.merchantId &&
          (where.isActive === undefined || o.isActive === where.isActive) &&
          (where.id?.not === undefined || o.id !== where.id.not)
      )
    ),
  },
  product: {
    findMany: jest.fn(async ({ where }: any) =>
      (where.id.in as number[])
        .map((id) => products[id])
        .filter((p) => p && (where.deletedAt === null ? p.deletedAt === null : true))
        .filter((p) => where.merchantId === undefined || p.merchantId === where.merchantId)
    ),
  },
  outletStock: {
    findMany: jest.fn(async ({ where }: any) =>
      stocks
        .filter((s) => inList(where.productId, s.productId) && inList(where.outletId, s.outletId))
        .filter((s) => where.isListed === undefined || s.isListed === where.isListed)
        .map((s) => ({ ...s, outlet: outlets.find((o) => o.id === s.outletId) }))
    ),
  },
  order: {
    findMany: jest.fn(async ({ where }: any) =>
      orders
        .filter((o) => orderMatches(o, where))
        .map((o) => ({
          id: o.id,
          outletId: o.outletId,
          orderType: o.orderType,
          status: o.status,
          orderNumber: o.orderNumber,
          pickupPlanAt: o.pickupPlanAt,
          returnPlanAt: o.returnPlanAt,
          customer: null,
          outlet: outlets.find((x) => x.id === o.outletId),
          orderItems: o.items.filter((i) => inList(where.orderItems?.some?.productId, i.productId)),
        }))
    ),
  },
};
jest.mock('@rentalshop/database', () => ({
  db: {
    prisma: mockPrisma,
    outlets: {
      findDefaultForMerchant: jest.fn(async (merchantId: number) => {
        const open = outlets.filter((o) => o.merchantId === merchantId && o.isActive);
        return open.find((o) => o.isDefault) || (open.length === 1 ? open[0] : null);
      }),
    },
  },
  prisma: mockPrisma,
}));

jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  formatFullName: (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(' '),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));

import { POST } from '../../apps/api/app/api/products/other-outlets-availability/route';
import { POST as BATCH } from '../../apps/api/app/api/products/batch-availability/route';
import { buildOtherOutletsResults, canSeeOtherOutlets } from '../../apps/api/lib/other-outlets-availability';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} };
const branchCtx = (role: string, outletId: number) => ({ user: { id: 8, role, email: `${role}@x` }, userScope: { merchantId: 2, outletId } });

const req = (body: any) => ({ url: 'http://localhost/api/x', headers: { get: () => null }, json: async () => body }) as any;
const post = (body: any): Promise<any> => POST(req(body)) as Promise<any>;
const batch = (body: any): Promise<any> => BATCH(req(body)) as Promise<any>;
const day = (date: string, ids: number[], extra: any = {}) => ({ date, products: ids.map((productId) => ({ productId, quantity: 1 })), ...extra });
const names = (res: any, productId: number) =>
  (res.body.data.results.find((r: any) => r.productId === productId)?.outlets || []).map((o: any) => `${o.outletName}:${o.available}`);

const order = (o: Partial<OrderRow> & Pick<OrderRow, 'id' | 'outletId' | 'items'>): OrderRow => ({
  orderType: 'RENT',
  status: 'RESERVED',
  orderNumber: `#${o.id}`,
  pickupPlanAt: null,
  returnPlanAt: null,
  deletedAt: null,
  ...o,
});

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  stocks = [
    // Product 11: A has 2, B has 5, C has 4, D (closed) has 9
    { productId: 11, outletId: 1, stock: 2, available: 2, renting: 0, isListed: true },
    { productId: 11, outletId: 3, stock: 5, available: 5, renting: 0, isListed: true },
    { productId: 11, outletId: 5, stock: 4, available: 4, renting: 0, isListed: true },
    { productId: 11, outletId: 4, stock: 9, available: 9, renting: 0, isListed: true },
    // Product 12: B has 3 but did not tick it, C has 2 and listed it, A 0
    { productId: 12, outletId: 1, stock: 0, available: 0, renting: 0, isListed: true },
    { productId: 12, outletId: 3, stock: 3, available: 3, renting: 0, isListed: false },
    { productId: 12, outletId: 5, stock: 2, available: 2, renting: 0, isListed: true },
    // Product 15 / 16 at B (Vietnam midnight edges)
    { productId: 15, outletId: 3, stock: 2, available: 2, renting: 0, isListed: true },
    { productId: 16, outletId: 3, stock: 2, available: 2, renting: 0, isListed: true },
    // Product 13: other shop
    { productId: 13, outletId: 7, stock: 5, available: 5, renting: 0, isListed: true },
  ];
  orders = [
    // B: 2 units of 11 on 02/11 10:00 -> 04/11 17:00 (VN), reserved
    order({ id: 1, outletId: 3, items: [{ productId: 11, quantity: 2 }], pickupPlanAt: new Date('2026-11-02T03:00:00Z'), returnPlanAt: new Date('2026-11-04T10:00:00Z') }),
    // C: 4 units of 11, picked up and returned the same day 05/11 (09:00 -> 16:00 VN)
    order({ id: 2, outletId: 5, status: 'PICKUPED', items: [{ productId: 11, quantity: 4 }], pickupPlanAt: new Date('2026-11-05T02:00:00Z'), returnPlanAt: new Date('2026-11-05T09:00:00Z') }),
    // B: cancelled and sale orders never hold a rental
    order({ id: 3, outletId: 3, status: 'CANCELLED', items: [{ productId: 11, quantity: 3 }], pickupPlanAt: new Date('2026-11-02T03:00:00Z'), returnPlanAt: new Date('2026-11-04T10:00:00Z') }),
    order({ id: 4, outletId: 3, orderType: 'SALE', status: 'COMPLETED', items: [{ productId: 11, quantity: 3 }], pickupPlanAt: new Date('2026-11-02T03:00:00Z') }),
    // A: A's own order must not change the answer for other branches
    order({ id: 5, outletId: 1, items: [{ productId: 11, quantity: 2 }], pickupPlanAt: new Date('2026-11-03T03:00:00Z'), returnPlanAt: new Date('2026-11-03T09:00:00Z') }),
    // B: product 15 returns at 23:59:59 VN on 05/11; product 16 is picked up at 00:00 VN on 06/11
    order({ id: 6, outletId: 3, items: [{ productId: 15, quantity: 2 }], pickupPlanAt: new Date('2026-11-04T03:00:00Z'), returnPlanAt: new Date('2026-11-05T16:59:59Z') }),
    order({ id: 7, outletId: 3, items: [{ productId: 16, quantity: 2 }], pickupPlanAt: new Date('2026-11-05T17:00:00Z'), returnPlanAt: new Date('2026-11-06T05:00:00Z') }),
    // Soft-deleted order holds nothing
    order({ id: 8, outletId: 5, items: [{ productId: 11, quantity: 4 }], pickupPlanAt: new Date('2026-11-10T03:00:00Z'), returnPlanAt: new Date('2026-11-10T09:00:00Z'), deletedAt: new Date('2026-11-01T00:00:00Z') }),
  ];
});

describe('canSeeOtherOutlets', () => {
  it.each(['MERCHANT', 'ADMIN', 'OUTLET_ADMIN', 'OUTLET_INVENTORY'])('%s sees the other branches', (role) => {
    expect(canSeeOtherOutlets(role)).toBe(true);
  });
  it.each(['OUTLET_STAFF', 'OPS', 'ARTICLE', '', null, undefined])('%s does not', (role) => {
    expect(canSeeOtherOutlets(role as any)).toBe(false);
  });
});

describe('buildOtherOutletsResults (pure)', () => {
  const outletList = [
    { id: 3, name: 'Quận 7' },
    { id: 5, name: 'Thủ Đức' },
    { id: 8, name: 'Bình Thạnh' },
  ];
  const stockRows = [
    { productId: 1, outletId: 3, stock: 3, isListed: true },
    { productId: 1, outletId: 5, stock: 3, isListed: true },
    { productId: 1, outletId: 8, stock: 7, isListed: true },
    { productId: 2, outletId: 3, stock: 4, isListed: false },
    { productId: 2, outletId: 5, stock: 1, isListed: true },
  ];

  it('sorts by units left (most first), then by branch id', () => {
    const out = buildOtherOutletsResults({ productIds: [1], outlets: outletList, stocks: stockRows, heldOrders: [], orderType: 'RENT' });
    expect(out).toEqual([
      { productId: 1, outlets: [
        { outletId: 8, outletName: 'Bình Thạnh', available: 7 },
        { outletId: 3, outletName: 'Quận 7', available: 3 },
        { outletId: 5, outletName: 'Thủ Đức', available: 3 },
      ] },
    ]);
  });

  it('drops branches that did not tick the product and branches with nothing left', () => {
    const held = [{ id: 1, outletId: 5, orderType: 'RENT', status: 'RESERVED', orderItems: [{ productId: 2, quantity: 5 }] }];
    const out = buildOtherOutletsResults({ productIds: [2], outlets: outletList, stocks: stockRows, heldOrders: held, orderType: 'RENT' });
    expect(out).toEqual([{ productId: 2, outlets: [] }]);
  });

  it('never goes below zero and keeps the order of productIds, one entry per product', () => {
    const out = buildOtherOutletsResults({ productIds: [2, 1, 9], outlets: outletList, stocks: stockRows, heldOrders: [], orderType: 'RENT' });
    expect(out.map((r) => r.productId)).toEqual([2, 1, 9]);
    expect(out[2].outlets).toEqual([]);
  });

  it('SALE counts reserved / picked-up sale orders only', () => {
    const held = [
      { id: 1, outletId: 3, orderType: 'SALE', status: 'RESERVED', orderItems: [{ productId: 1, quantity: 1 }] },
      { id: 2, outletId: 3, orderType: 'RENT', status: 'RESERVED', orderItems: [{ productId: 1, quantity: 3 }] },
    ];
    const out = buildOtherOutletsResults({ productIds: [1], outlets: [outletList[0]], stocks: stockRows, heldOrders: held, orderType: 'SALE' });
    expect(out[0].outlets).toEqual([{ outletId: 3, outletName: 'Quận 7', available: 2 }]);
  });
});

describe('POST /api/products/other-outlets-availability — who may ask', () => {
  it('MERCHANT without outletId: the default branch is the order branch', async () => {
    const res = await post(day('2026-11-03', [11]));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Not A itself, not the closed D
    expect(names(res, 11)).toEqual(['Thủ Đức:4', 'Quận 7:3']);
  });

  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY'])('%s of branch A sees the other branches', async (role) => {
    ctx = branchCtx(role, 1);
    const res = await post(day('2026-11-03', [11]));
    expect(res.status).toBe(200);
    expect(names(res, 11)).toEqual(['Thủ Đức:4', 'Quận 7:3']);
  });

  it('ADMIN (system) asks for a branch of any shop', async () => {
    ctx = admin;
    const res = await post(day('2026-11-03', [11], { outletId: 1 }));
    expect(res.status).toBe(200);
    expect(names(res, 11)).toEqual(['Thủ Đức:4', 'Quận 7:3']);
  });

  it('ADMIN must say which branch', async () => {
    ctx = admin;
    const res = await post(day('2026-11-03', [11]));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
  });

  it('OUTLET_STAFF gets 403 INSUFFICIENT_PERMISSIONS and nothing is read', async () => {
    ctx = branchCtx('OUTLET_STAFF', 1);
    const res = await post(day('2026-11-03', [11]));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockPrisma.outletStock.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('a branch role cannot ask on behalf of another branch (403 NO_OUTLET_ACCESS)', async () => {
    ctx = branchCtx('OUTLET_ADMIN', 1);
    const res = await post(day('2026-11-03', [11], { outletId: 3 }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NO_OUTLET_ACCESS');
  });
});

describe('POST /api/products/other-outlets-availability — scope', () => {
  it('a branch of another shop is 404 OUTLET_NOT_FOUND', async () => {
    const res = await post(day('2026-11-03', [11], { outletId: 7 }));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OUTLET_NOT_FOUND');
  });

  it('a closed branch is 404 OUTLET_NOT_FOUND', async () => {
    const res = await post(day('2026-11-03', [11], { outletId: 4 }));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OUTLET_NOT_FOUND');
  });

  it('a product of another shop is 404 PRODUCTS_NOT_FOUND', async () => {
    const res = await post(day('2026-11-03', [11, 13], { outletId: 1 }));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCTS_NOT_FOUND');
  });

  it('a deleted product is 404 PRODUCTS_NOT_FOUND', async () => {
    const res = await post(day('2026-11-03', [14], { outletId: 1 }));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCTS_NOT_FOUND');
  });

  it('a shop with a single branch gets empty lists (route does not refuse)', async () => {
    ctx = { user: { id: 20, role: 'MERCHANT', email: 'n@x' }, userScope: { merchantId: 9 } };
    stocks.push({ productId: 13, outletId: 7, stock: 1, available: 1, renting: 0, isListed: true });
    const res = await post(day('2026-11-03', [13]));
    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual([{ productId: 13, outlets: [] }]);
  });

  it('validation: RENT needs days, products must not be empty', async () => {
    const noDays = await post({ products: [{ productId: 11 }], outletId: 1 });
    expect(noDays.status).toBe(400);
    const empty = await post({ date: '2026-11-03', products: [], outletId: 1 });
    expect(empty.status).toBe(400);
  });

  it('only branches that ticked the product are listed (B has 3 of product 12 but did not tick it)', async () => {
    // Product 12 at A has 0 (short); B did not tick it, C did
    const res = await post(day('2026-11-03', [12], { outletId: 1 }));
    expect(names(res, 12)).toEqual(['Thủ Đức:2']);
  });
});

describe('POST /api/products/other-outlets-availability — by day', () => {
  it('multi-day order: B is held 02-04/11, so B has 3 left on 03/11', async () => {
    const res = await post(day('2026-11-03', [11], { outletId: 1 }));
    expect(names(res, 11)).toEqual(['Thủ Đức:4', 'Quận 7:3']);
  });

  it('one-day window outside every hold: all stock is left', async () => {
    const res = await post(day('2026-11-08', [11], { outletId: 1 }));
    expect(names(res, 11)).toEqual(['Quận 7:5', 'Thủ Đức:4']);
  });

  it('same-day pickup and return still holds that day (C has 0 on 05/11, so C is not listed)', async () => {
    const res = await post(day('2026-11-05', [11], { outletId: 1 }));
    expect(names(res, 11)).toEqual(['Quận 7:5']);
  });

  it('a window that spans several days counts every order touching it', async () => {
    const res = await post({ startDate: '2026-10-31T17:00:00.000Z', endDate: '2026-11-06T16:59:59.999Z', products: [{ productId: 11, quantity: 1 }], outletId: 1 });
    expect(res.status).toBe(200);
    // B: 5 - 2 (02-04/11) = 3; C: 4 - 4 (05/11) = 0
    expect(names(res, 11)).toEqual(['Quận 7:3']);
  });

  it('web window (VN midnight of the first day to the last ms of the last day) gives the same as date=', async () => {
    const web = await post({ startDate: '2026-11-02T17:00:00.000Z', endDate: '2026-11-03T16:59:59.999Z', products: [{ productId: 11, quantity: 1 }], outletId: 1 });
    const one = await post(day('2026-11-03', [11], { outletId: 1 }));
    expect(names(web, 11)).toEqual(names(one, 11));
  });

  it('Vietnam midnight edge, return at 23:59:59 VN holds that day and not the next', async () => {
    const on = await post(day('2026-11-05', [15], { outletId: 1 }));
    const after = await post(day('2026-11-06', [15], { outletId: 1 }));
    expect(names(on, 15)).toEqual([]);
    expect(names(after, 15)).toEqual(['Quận 7:2']);
  });

  it('Vietnam midnight edge, pickup at 00:00 VN holds that day and not the day before', async () => {
    const before = await post(day('2026-11-05', [16], { outletId: 1 }));
    const on = await post(day('2026-11-06', [16], { outletId: 1 }));
    expect(names(before, 16)).toEqual(['Quận 7:2']);
    expect(names(on, 16)).toEqual([]);
  });

  it('a window across a month end and a year-long window do not throw and count correctly', async () => {
    orders.push(order({ id: 20, outletId: 3, items: [{ productId: 11, quantity: 1 }], pickupPlanAt: new Date('2026-11-30T03:00:00Z'), returnPlanAt: new Date('2026-12-02T03:00:00Z') }));
    const month = await post({ startDate: '2026-11-29T17:00:00.000Z', endDate: '2026-12-01T16:59:59.999Z', products: [{ productId: 11, quantity: 1 }], outletId: 1 });
    expect(names(month, 11)).toEqual(['Quận 7:4', 'Thủ Đức:4']);
    const year = await post({ startDate: '2025-12-31T17:00:00.000Z', endDate: '2026-12-31T16:59:59.999Z', products: [{ productId: 11, quantity: 1 }], outletId: 1 });
    // B holds 2 + 1 (cancelled / sale ignored), C holds 4 (+ the soft-deleted one is ignored)
    expect(names(year, 11)).toEqual(['Quận 7:2']);
  });

  it('SALE: no days needed; open sale orders of the other branch are taken off', async () => {
    const future = new Date(Date.now() + 10 * 86400000);
    const past = new Date(Date.now() - 10 * 86400000);
    orders = [
      order({ id: 30, outletId: 3, orderType: 'SALE', status: 'RESERVED', items: [{ productId: 11, quantity: 2 }], pickupPlanAt: past }),
      order({ id: 31, outletId: 3, orderType: 'SALE', status: 'PICKUPED', items: [{ productId: 11, quantity: 1 }], pickupPlanAt: future }),
      order({ id: 32, outletId: 3, orderType: 'SALE', status: 'PICKUPED', items: [{ productId: 11, quantity: 1 }], pickupPlanAt: past }),
    ];
    const res = await post({ orderType: 'SALE', products: [{ productId: 11, quantity: 1 }], outletId: 1 });
    expect(res.status).toBe(200);
    expect(names(res, 11)).toEqual(['Thủ Đức:4', 'Quận 7:2']);
  });
});

describe('same answer as POST /api/products/batch-availability', () => {
  // For branch B (3) and C (5), the units "other-outlets" lists must equal `effectivelyAvailable` of batch-availability
  const windows: any[] = [
    { date: '2026-11-03' },
    { date: '2026-11-05' },
    { date: '2026-11-06' },
    { date: '2026-11-08' },
    { startDate: '2026-11-02T17:00:00.000Z', endDate: '2026-11-05T16:59:59.999Z' },
    { startDate: '2026-11-03T17:00:00.000Z', endDate: '2026-11-05T16:59:59.999Z' },
    { startDate: '2025-12-31T17:00:00.000Z', endDate: '2026-12-31T16:59:59.999Z' },
  ];

  it.each(windows.map((w, i) => [i, w]))('window %s', async (_i, w) => {
    const ids = [11, 12, 15, 16];
    const other = await post({ ...w, products: ids.map((productId) => ({ productId, quantity: 1 })), outletId: 1 });
    expect(other.status).toBe(200);
    for (const outletId of [3, 5]) {
      const b = await batch({ ...w, products: ids.map((productId) => ({ productId, quantity: 1 })), outletId });
      expect(b.status).toBe(200);
      for (const productId of ids) {
        const row = stocks.find((s) => s.productId === productId && s.outletId === outletId);
        const eff = b.body.data.results.find((r: any) => r.productId === productId)?.availabilityByOutlet?.[0]?.effectivelyAvailable;
        const listed = !!row && row.isListed;
        const mine = (other.body.data.results.find((r: any) => r.productId === productId)?.outlets || []).find((o: any) => o.outletId === outletId)?.available;
        if (!row || !listed || !eff) {
          expect(mine).toBeUndefined();
        } else {
          expect(mine).toBe(eff);
        }
      }
    }
  });
});
