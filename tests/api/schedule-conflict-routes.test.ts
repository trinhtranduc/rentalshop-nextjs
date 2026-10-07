/**
 * #518 — order routes with "Cho tạo đơn khi trùng lịch".
 *
 * Setting OFF (Merchant.allowOverlappingOrders = false): a RENT create, a date / quantity / outlet edit,
 * or a reactivation that over-books some Vietnam civil day answers 409 ORDER_SCHEDULE_CONFLICT and
 * writes nothing. Setting ON (default, or column missing): every route behaves exactly as before and
 * runs none of the conflict queries. SALE orders are never checked.
 *
 * Replays the bodies installed iOS/Android builds send (POST /api/orders, PUT /api/orders/:id), so old
 * apps are covered too. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

// ---------------------------------------------------------------------------------------------
// Fixture: outlet 1 of merchant 2 has 1 unit of product 11 ("Áo dài đỏ") and 3 of product 12.
// ORD-1-0001 (RESERVED) holds product 11 on VN days 2026-09-12 … 2026-09-13.
// ---------------------------------------------------------------------------------------------
function vn(ymd: string, hour = 9): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 7));
}

const mockState: { allow: boolean | undefined; holders: any[]; stock: Record<number, number> } = {
  allow: undefined,
  holders: [],
  stock: {},
};

/** Prisma-like client the conflict check reads (db.prisma and the create transaction). */
const mockPrisma: any = {
  merchant: { findUnique: jest.fn(async () => ({ allowOverlappingOrders: mockState.allow })) },
  outletStock: {
    findMany: jest.fn(async ({ where }: any) =>
      where.productId.in
        .filter((id: number) => mockState.stock[id] !== undefined)
        .map((id: number) => ({ productId: id, stock: mockState.stock[id] }))
    ),
  },
  order: {
    findMany: jest.fn(async ({ where }: any) =>
      mockState.holders.filter(
        (o) =>
          o.outletId === where.outletId &&
          (!where.id || o.id !== where.id.not) &&
          o.pickupPlanAt < where.pickupPlanAt.lt &&
          o.returnPlanAt >= where.returnPlanAt.gte
      )
    ),
  },
  product: { findMany: jest.fn(async () => [{ id: 11, name: 'Áo dài đỏ' }, { id: 12, name: 'Vest' }]) },
  $transaction: jest.fn(async (fn: any) => fn({ order: { findUnique: async () => null } })),
};

const PRODUCTS: Record<number, any> = {
  11: { id: 11, name: 'Áo dài đỏ', pricingType: 'FIXED', pricingOptions: [] },
  12: { id: 12, name: 'Vest', pricingType: 'FIXED', pricingOptions: [] },
};

const mockDb: any = {
  outlets: { findById: jest.fn(async (id: number) => ({ id, merchantId: id === 7 ? 99 : 2 })) },
  merchants: { findById: jest.fn() },
  products: { findById: jest.fn(async (id: number) => PRODUCTS[id] || null) },
  customers: { findById: jest.fn() },
  orders: {
    create: jest.fn(async (data: any) => ({
      id: 500,
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      status: data.status,
      outletId: data.outlet.connect.id,
      totalAmount: data.totalAmount,
      pickupPlanAt: data.pickupPlanAt,
      returnPlanAt: data.returnPlanAt,
      orderItems: [],
      payments: [],
    })),
    // Same contract as packages/database/src/order-create-guard.ts: hook after the replay lookup, then insert
    createOnce: jest.fn(async (_guard: any, data: any, options?: any) => {
      if (options?.beforeInsert) {
        const blocked = await options.beforeInsert(mockPrisma);
        if (blocked != null) return { order: null, replay: false, blocked };
      }
      return { order: await mockDb.orders.create(data), replay: false };
    }),
    findById: jest.fn(),
    findByIdDetail: jest.fn(),
    update: jest.fn(async (id: number, data: any) => ({ id, orderNumber: 'ORD-1-0005', ...data })),
    restore: jest.fn(async (id: number) => ({ id, orderNumber: 'ORD-1-0005' })),
    delete: jest.fn(),
  },
  prisma: mockPrisma,
};
const mockRootPrisma: any = { auditLog: { findFirst: jest.fn() }, $transaction: jest.fn() };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockRootPrisma }));

const passthrough = { safeParse: (body: any) => ({ success: true, data: { depositAmount: 0, ...body } }) };
jest.mock('@rentalshop/utils', () => ({
  orderCreateSchema: passthrough,
  orderUpdateSchema: passthrough,
  ordersQuerySchema: { safeParse: () => ({ success: false }) },
  PricingResolver: { resolvePricingType: () => 'FIXED' },
  resolveSelectedOption: () => null,
  calculateDurationInUnit: () => ({ duration: 1 }),
  countRentalDays: () => 1,
  getDurationUnitLabel: () => '',
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: `msg:${code}`, error: `msg:${code}` }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: () => [],
  generateStagingKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  getUtcRangeForDateKeys: jest.fn(),
  toDateKeyInTimeZone: jest.fn(),
  PerformanceMonitor: {},
}));
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  checkPlanLimitIfNeeded: jest.fn().mockResolvedValue(null),
  createAuditHelper: () => ({
    logCreate: () => Promise.resolve(),
    logUpdate: () => Promise.resolve(),
    logCustom: () => Promise.resolve(),
  }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  adjustRedeemOnOrderEdit: jest.fn(),
  calculateAmountDue: jest.fn().mockReturnValue(0),
  getLoyaltyProgram: jest.fn(),
  handleLoyaltyOnCancel: jest.fn(),
  handleLoyaltyOnOrderCreate: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/analytics-days', () => ({ readAnalyticsTimeZone: jest.fn() }));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { POST as createOrder, PUT as legacyUpdateOrder } from '../../apps/api/app/api/orders/route';
import { PUT as updateOrder } from '../../apps/api/app/api/orders/[orderId]/route';
import { POST as revertOrder } from '../../apps/api/app/api/orders/[orderId]/revert/route';
import { POST as restoreOrder } from '../../apps/api/app/api/orders/[orderId]/restore/route';

const staff = {
  user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 's@x' },
  userScope: { merchantId: 2, outletId: 1 },
};
const owner = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };

function req(body: any, url = 'http://localhost/api/orders'): any {
  return {
    url,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

/** The RENT body installed apps send (iOS/Android create): ISO instants, per-line prices. */
function rentBody(pickup: Date, ret: Date, lines: Array<[number, number]> = [[11, 1]], extra: any = {}) {
  return {
    orderType: 'RENT',
    outletId: 1,
    customerId: undefined,
    pickupPlanAt: pickup.toISOString(),
    returnPlanAt: ret.toISOString(),
    orderItems: lines.map(([productId, quantity]) => ({ productId, quantity, unitPrice: 100000, totalPrice: 100000 * quantity })),
    totalAmount: 100000,
    ...extra,
  };
}

/** An existing order as db.orders.findById returns it. */
function existingRent(extra: any = {}) {
  return {
    id: 5,
    orderNumber: 'ORD-1-0005',
    orderType: 'RENT',
    status: 'RESERVED',
    outletId: 1,
    customerId: null,
    totalAmount: 100000,
    pickupPlanAt: vn('2026-09-08'),
    returnPlanAt: vn('2026-09-09'),
    orderItems: [{ id: 1, productId: 11, quantity: 1, product: { id: 11, name: 'Áo dài đỏ' } }],
    ...extra,
  };
}

function givenExisting(order: any) {
  mockDb.orders.findById.mockResolvedValue(order);
  mockDb.orders.findByIdDetail.mockResolvedValue({ ...order, outlet: { name: 'Outlet 1' }, orderItems: [], payments: [] });
}

function givenShop(allow: boolean | undefined) {
  mockState.allow = allow;
  mockDb.merchants.findById.mockResolvedValue(
    allow === undefined ? { id: 2, name: 'Shop', pricingConfig: null } : { id: 2, name: 'Shop', pricingConfig: null, allowOverlappingOrders: allow }
  );
}

const conflictQueries = () =>
  mockPrisma.order.findMany.mock.calls.length + mockPrisma.outletStock.findMany.mock.calls.length;

beforeEach(() => {
  jest.clearAllMocks();
  ctx = staff;
  mockState.stock = { 11: 1, 12: 3 };
  mockState.holders = [
    {
      id: 1,
      orderNumber: 'ORD-1-0001',
      outletId: 1,
      orderType: 'RENT',
      status: 'RESERVED',
      deletedAt: null,
      pickupPlanAt: vn('2026-09-12'),
      returnPlanAt: vn('2026-09-13', 18),
      orderItems: [{ productId: 11, quantity: 1 }],
    },
  ];
});

describe('POST /api/orders (#518)', () => {
  it.each([
    ['setting ON', true],
    ['column missing (older row / not migrated)', undefined],
  ])('%s: an over-booking RENT is created exactly as before, with no conflict query', async (_label, allow) => {
    givenShop(allow as boolean | undefined);
    const res: any = await createOrder(req(rentBody(vn('2026-09-13'), vn('2026-09-14'))));
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('ORDER_CREATED_SUCCESS');
    expect(mockDb.orders.createOnce).toHaveBeenCalledTimes(1);
    expect(mockDb.orders.createOnce.mock.calls[0]).toHaveLength(2); // same call as before #518
    expect(conflictQueries()).toBe(0);
  });

  it('setting OFF: a RENT that over-books a VN day → 409 with the conflict data, nothing inserted', async () => {
    givenShop(false);
    const res: any = await createOrder(req(rentBody(vn('2026-09-13'), vn('2026-09-14'), [[11, 1], [12, 1]])));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      code: 'ORDER_SCHEDULE_CONFLICT',
      message: 'msg:ORDER_SCHEDULE_CONFLICT',
      error: 'msg:ORDER_SCHEDULE_CONFLICT',
      data: {
        conflicts: [
          { productId: 11, productName: 'Áo dài đỏ', requested: 1, available: 0, days: ['2026-09-13'], orderNumbers: ['ORD-1-0001'] },
        ],
      },
    });
    expect(mockDb.orders.create).not.toHaveBeenCalled();
    // Scoped to the order's outlet and to active rentals only
    expect(mockPrisma.order.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ outletId: 1, orderType: 'RENT', status: { in: ['RESERVED', 'PICKUPED'] }, deletedAt: null })
    );
  });

  it('setting OFF: a RENT on free days (or within stock) is created', async () => {
    givenShop(false);
    const free: any = await createOrder(req(rentBody(vn('2026-09-10'), vn('2026-09-11', 20))));
    expect(free.status).toBe(200);
    const withinStock: any = await createOrder(req(rentBody(vn('2026-09-12'), vn('2026-09-13'), [[12, 3]])));
    expect(withinStock.status).toBe(200);
    expect(mockDb.orders.create).toHaveBeenCalledTimes(2);
  });

  it('setting OFF: SALE orders are never checked', async () => {
    givenShop(false);
    const res: any = await createOrder(
      req({ orderType: 'SALE', outletId: 1, orderItems: [{ productId: 11, quantity: 5, unitPrice: 1, totalPrice: 5 }], totalAmount: 5 })
    );
    expect(res.status).toBe(200);
    expect(conflictQueries()).toBe(0);
    expect(mockDb.orders.createOnce.mock.calls[0]).toHaveLength(2);
  });

  it('setting OFF: a rental without dates is not checked (nothing to place on a day)', async () => {
    givenShop(false);
    const body = rentBody(vn('2026-09-13'), vn('2026-09-14'));
    delete (body as any).pickupPlanAt;
    delete (body as any).returnPlanAt;
    const res: any = await createOrder(req(body));
    expect(res.status).toBe(200);
    expect(conflictQueries()).toBe(0);
  });
});

describe('PUT /api/orders/:id (#518) — the edit route iOS and Android use', () => {
  const put = (body: any) => updateOrder(req(body, 'http://localhost/api/orders/5'), { params: { orderId: '5' } });

  it('setting OFF: moving the dates onto a held day → 409, no write', async () => {
    givenShop(false);
    givenExisting(existingRent());
    const res: any = await put({ pickupPlanAt: vn('2026-09-12').toISOString(), returnPlanAt: vn('2026-09-12').toISOString() });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ORDER_SCHEDULE_CONFLICT');
    expect(res.body.data.conflicts[0]).toEqual(
      expect.objectContaining({ productId: 11, days: ['2026-09-12'], orderNumbers: ['ORD-1-0001'] })
    );
    expect(mockDb.orders.update).not.toHaveBeenCalled();
    expect(mockPrisma.order.findMany.mock.calls[0][0].where.id).toEqual({ not: 5 }); // never conflicts with itself
  });

  it('setting OFF: raising a quantity past the stock on a held day → 409', async () => {
    givenShop(false);
    givenExisting(existingRent({ pickupPlanAt: vn('2026-09-13'), returnPlanAt: vn('2026-09-13'), orderItems: [{ productId: 12, quantity: 1 }] }));
    mockState.holders.push({ ...mockState.holders[0], id: 2, orderNumber: 'ORD-1-0002', orderItems: [{ productId: 12, quantity: 2 }] });
    const sameDates = { pickupPlanAt: vn('2026-09-13').toISOString(), returnPlanAt: vn('2026-09-13').toISOString() };
    const ok: any = await put({ ...sameDates, orderItems: [{ productId: 12, quantity: 1, unitPrice: 1, totalPrice: 1 }] });
    expect(ok.status).toBe(200);
    expect(conflictQueries()).toBe(0); // same quantity → nothing to check
    const res: any = await put({ ...sameDates, orderItems: [{ productId: 12, quantity: 2, unitPrice: 1, totalPrice: 2 }] });
    expect(res.status).toBe(409);
    expect(res.body.data.conflicts[0]).toEqual(expect.objectContaining({ productId: 12, requested: 2, available: 1 }));
  });

  it('setting OFF: a notes edit that re-sends the same dates and items saves, with no conflict query', async () => {
    givenShop(false);
    // The order is already double-booked (created while the setting was ON); editing notes must still work
    givenExisting(existingRent({ pickupPlanAt: vn('2026-09-12'), returnPlanAt: vn('2026-09-13') }));
    const res: any = await put({
      notes: 'giao trước 9h',
      pickupPlanAt: vn('2026-09-12').toISOString(),
      returnPlanAt: vn('2026-09-13').toISOString(),
      orderItems: [{ productId: 11, quantity: 1, unitPrice: 1, totalPrice: 1 }],
      status: 'RESERVED',
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.merchant.findUnique).not.toHaveBeenCalled();
    expect(conflictQueries()).toBe(0);
  });

  it('setting OFF: status changes the apps send (RESERVED → PICKUPED → RETURNED, cancel) need no check', async () => {
    givenShop(false);
    for (const [from, to] of [['RESERVED', 'PICKUPED'], ['PICKUPED', 'RETURNED'], ['RESERVED', 'CANCELLED']]) {
      givenExisting(existingRent({ status: from, pickupPlanAt: vn('2026-09-12'), returnPlanAt: vn('2026-09-13') }));
      const res: any = await put({ status: to });
      expect(res.status).toBe(200);
    }
    expect(mockPrisma.merchant.findUnique).not.toHaveBeenCalled();
    expect(conflictQueries()).toBe(0);
  });

  it('setting ON: the same date edit saves exactly as before; only the setting is read', async () => {
    givenShop(true);
    givenExisting(existingRent());
    const res: any = await put({ pickupPlanAt: vn('2026-09-12').toISOString(), returnPlanAt: vn('2026-09-12').toISOString() });
    expect(res.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalledWith(5, expect.objectContaining({ pickupPlanAt: vn('2026-09-12').toISOString() }));
    expect(mockPrisma.merchant.findUnique).toHaveBeenCalledTimes(1);
    expect(conflictQueries()).toBe(0);
  });

  it('setting OFF: SALE edits are never checked', async () => {
    givenShop(false);
    givenExisting(existingRent({ orderType: 'SALE', status: 'COMPLETED' }));
    const res: any = await put({ pickupPlanAt: vn('2026-09-12').toISOString(), returnPlanAt: vn('2026-09-12').toISOString() });
    expect(res.status).toBe(200);
    expect(mockPrisma.merchant.findUnique).not.toHaveBeenCalled();
  });
});

describe('PUT /api/orders?id= (legacy) (#518)', () => {
  const put = (body: any) => legacyUpdateOrder(req(body, 'http://localhost/api/orders?id=5'));

  it('setting OFF: new dates onto a held day → explicit 409 (not the route catch-all 500)', async () => {
    givenShop(false);
    givenExisting(existingRent());
    const res: any = await put({ pickupPlanAt: vn('2026-09-13').toISOString(), returnPlanAt: vn('2026-09-14').toISOString() });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ORDER_SCHEDULE_CONFLICT');
    expect(res.body.data.conflicts[0].days).toEqual(['2026-09-13']);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('setting OFF: reactivating a cancelled rental onto a held day → 409', async () => {
    givenShop(false);
    givenExisting(existingRent({ status: 'CANCELLED', pickupPlanAt: vn('2026-09-13'), returnPlanAt: vn('2026-09-13') }));
    const res: any = await put({ status: 'RESERVED' });
    expect(res.status).toBe(409);
  });

  it('setting ON: unchanged behaviour', async () => {
    givenShop(true);
    givenExisting(existingRent());
    const res: any = await put({ pickupPlanAt: vn('2026-09-13').toISOString(), returnPlanAt: vn('2026-09-14').toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('ORDER_UPDATED_SUCCESS');
    expect(conflictQueries()).toBe(0);
  });
});

describe('reactivation: revert and restore (#518)', () => {
  const params = { params: { orderId: '5' } };

  function givenAuditLog(oldValues: any) {
    mockRootPrisma.auditLog.findFirst.mockResolvedValue({ id: 77, action: 'UPDATE', details: JSON.stringify({ oldValues }) });
  }

  it('setting OFF: reverting a cancelled rental back to RESERVED on a held day → 409', async () => {
    ctx = owner;
    givenShop(false);
    givenExisting(existingRent({ status: 'CANCELLED' }));
    givenAuditLog({ status: 'RESERVED', pickupPlanAt: vn('2026-09-13').toISOString(), returnPlanAt: vn('2026-09-13').toISOString() });
    const res: any = await revertOrder(req({ auditLogId: 77 }, 'http://localhost/api/orders/5/revert'), params);
    expect(res.status).toBe(409);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('setting ON: the same revert works as before', async () => {
    ctx = owner;
    givenShop(true);
    givenExisting(existingRent({ status: 'CANCELLED' }));
    givenAuditLog({ status: 'RESERVED', pickupPlanAt: vn('2026-09-13').toISOString(), returnPlanAt: vn('2026-09-13').toISOString() });
    const res: any = await revertOrder(req({ auditLogId: 77 }, 'http://localhost/api/orders/5/revert'), params);
    expect(res.status).toBe(200);
    expect(conflictQueries()).toBe(0);
  });

  it('setting OFF: restoring a soft-deleted active rental onto a held day → 409; ON → restored', async () => {
    ctx = owner;
    givenShop(false);
    givenExisting(existingRent({ deletedAt: new Date(), pickupPlanAt: vn('2026-09-13'), returnPlanAt: vn('2026-09-13') }));
    const blocked: any = await restoreOrder(req({}, 'http://localhost/api/orders/5/restore'), params);
    expect(blocked.status).toBe(409);
    expect(mockDb.orders.restore).not.toHaveBeenCalled();

    givenShop(true);
    const ok: any = await restoreOrder(req({}, 'http://localhost/api/orders/5/restore'), params);
    expect(ok.status).toBe(200);
    expect(mockDb.orders.restore).toHaveBeenCalledWith(5);
  });
});
