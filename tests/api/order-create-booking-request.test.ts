/**
 * #1124 Đặt đơn online — POST /api/orders with the optional `bookingRequestId`: the request must be PENDING, not
 * expired and of the same shop; it is marked CONFIRMED (orderId, customerId, decidedBy) in the create transaction.
 * A second confirm, an expired or another shop's request is refused and creates no order. Without the field the
 * route behaves exactly as before (installed apps never send it). Harness: order-create-duplicate.test.ts.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  // the real check reads custom merchant roles from the DB; here the default role table decides
  hasPermission: async (user: any, permission: string) =>
    (require('../../packages/auth/src/permissions').ROLE_PERMISSIONS[user.role] || []).includes(permission),
}));

// ---------------------------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------------------------
type Row = Record<string, any>;
const mockStore: { orders: Row[]; keys: Row[]; nextOrderId: number; nextKeyId: number; keyTable: boolean } = {
  orders: [],
  keys: [],
  nextOrderId: 500,
  nextKeyId: 1,
  keyTable: true,
};

const mockTick = () => new Promise((resolve) => setImmediate(resolve));

function mockMatches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([field, cond]) => {
    const value = row[field];
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (cond && typeof cond === 'object') {
      if ('gte' in cond && !(value >= cond.gte)) return false;
      if ('not' in cond && value === cond.not) return false;
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('notIn' in cond && cond.notIn.includes(value)) return false;
      return true;
    }
    if (cond === null) return value === null || value === undefined;
    return value === cond;
  });
}

const mockOrderDelegate = {
  create: jest.fn(async ({ data }: any) => {
    await mockTick(); // the INSERT round trip — lets a concurrent request run in between
    const row: Row = {
      id: mockStore.nextOrderId++,
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      status: data.status,
      outletId: data.outlet.connect.id,
      customerId: data.customer?.connect?.id ?? null,
      createdById: data.createdBy.connect.id,
      totalAmount: data.totalAmount,
      pickupPlanAt: data.pickupPlanAt ?? null,
      returnPlanAt: data.returnPlanAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      orderItems: (data.orderItems?.create || []).map((item: any, i: number) => ({ id: i + 1, ...item })),
      payments: [],
    };
    mockStore.orders.push(row);
    return row;
  }),
  findMany: jest.fn(async ({ where, take }: any = {}) => {
    await mockTick();
    const rows = mockStore.orders
      .filter((o) => mockMatches(o, where))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return take ? rows.slice(0, take) : rows;
  }),
  findFirst: jest.fn(async ({ where }: any = {}) => {
    await mockTick();
    return mockStore.orders.find((o) => mockMatches(o, where)) || null;
  }),
  findUnique: jest.fn(async ({ where }: any = {}) => mockStore.orders.find((o) => mockMatches(o, where)) || null),
};

const mockKeyDelegate = {
  findUnique: jest.fn(async ({ where }: any) => {
    if (!mockStore.keyTable) throw new Error('relation "OrderCreateKey" does not exist');
    await mockTick();
    const { userId, key } = where.userId_key;
    return mockStore.keys.find((k) => k.userId === userId && k.key === key) || null;
  }),
  upsert: jest.fn(async ({ where, create, update }: any) => {
    if (!mockStore.keyTable) throw new Error('relation "OrderCreateKey" does not exist');
    const { userId, key } = where.userId_key;
    const existing = mockStore.keys.find((k) => k.userId === userId && k.key === key);
    if (existing) return Object.assign(existing, update);
    const row = { id: mockStore.nextKeyId++, createdAt: new Date(), ...create };
    mockStore.keys.push(row);
    return row;
  }),
};

// #1124 booking requests the route checks before and marks inside the create transaction
const mockBookings: Row[] = [];
const mockBookingDelegate = {
  findUnique: jest.fn(async ({ where }: any) => mockBookings.find((b) => b.id === where.id) ?? null),
  updateMany: jest.fn(async ({ where, data }: any) => {
    const rows = mockBookings.filter((b) =>
      b.id === where.id && b.status === where.status && (where.orderId !== null || b.orderId == null) &&
      (!where.expiresAt?.gt || b.expiresAt > where.expiresAt.gt));
    rows.forEach((b) => Object.assign(b, data));
    return { count: rows.length };
  }),
};

// Advisory locks: key → promise that resolves when the holding transaction ends
const mockLocks = new Map<string, Promise<void>>();

function mockClient(held: Array<() => void> | null): any {
  return {
    order: mockOrderDelegate,
    orderCreateKey: mockKeyDelegate,
    bookingRequest: mockBookingDelegate,
    $executeRaw: jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join('?');
      if (!/pg_advisory_xact_lock/.test(sql)) return 0; // SAVEPOINT / ROLLBACK TO SAVEPOINT etc.
      if (!held) throw new Error('pg_advisory_xact_lock outside a transaction is a no-op');
      const lockKey = values.join(':');
      while (mockLocks.has(lockKey)) await mockLocks.get(lockKey);
      let release!: () => void;
      mockLocks.set(lockKey, new Promise<void>((resolve) => (release = resolve)));
      held.push(() => {
        mockLocks.delete(lockKey);
        release();
      });
      return 1;
    }),
    $queryRaw: jest.fn(async () => []),
  };
}

const mockPrisma: any = {
  ...mockClient(null),
  $transaction: jest.fn(async (fn: any) => {
    const held: Array<() => void> = [];
    try {
      return await fn(mockClient(held));
    } finally {
      held.forEach((release) => release());
    }
  }),
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));

const mockUpdateStock = jest.fn(async () => undefined);
const mockDb: any = {
  get orders() {
    // The real order helpers (create / guarded create) over the fake Prisma client
    return jest.requireActual('../../packages/database/src/order').simplifiedOrders;
  },
  outlets: {
    findById: jest.fn(async (id: number) => ({ id, merchantId: 2, name: 'Main', isActive: true, isDefault: true })),
    findDefaultForMerchant: jest.fn(async () => ({ id: 3, merchantId: 2 })),
  },
  merchants: { findById: jest.fn(async (id: number) => ({ id, name: 'Shop', pricingConfig: null })) },
  customers: { findById: jest.fn(async (id: number) => ({ id, merchantId: 2, firstName: 'Lan', lastName: 'Ng' })) },
  products: {
    findById: jest.fn(async (id: number) => ({
      id, name: `P${id}`, pricingType: 'FIXED', pricingOptions: [], merchantId: 2, merchant: { id: 2 },
    })),
  },
  get prisma() {
    return mockPrisma;
  },
};
jest.mock('@rentalshop/database', () => ({
  get db() {
    return mockDb;
  },
  get prisma() {
    return mockPrisma;
  },
  updateOutletStockForOrder: mockUpdateStock,
}));

jest.mock('@rentalshop/utils', () => ({
  // #577: the order routes call normalizeLegacyPlanDays; the real helper, straight from source
  ...jest.requireActual('../../packages/utils/src/core/legacy-plan-days'),
  orderCreateSchema: { safeParse: (body: any) => ({ success: true, data: { depositAmount: 0, ...body } }) },
  ordersQuerySchema: { safeParse: () => ({ success: false }) },
  orderUpdateSchema: { safeParse: () => ({ success: false }) },
  PricingResolver: { resolvePricingType: () => 'FIXED' },
  resolveSelectedOption: () => null,
  calculateDurationInUnit: () => ({ duration: 1 }),
  countRentalDays: () => 1,
  getDurationUnitLabel: () => '',
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
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
  createAuditHelper: () => ({ logCreate: () => Promise.resolve() }),
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

import { POST } from '../../apps/api/app/api/orders/route';

const staff = {
  user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, email: 's@x' },
  userScope: { merchantId: 2, outletId: 3 },
};

/** The RENT body iOS sends from the cart: customer, one dress, plan dates */
function rentBody(extra: any = {}) {
  return {
    orderType: 'RENT',
    outletId: 3,
    customerId: 77,
    orderItems: [{ productId: 11, quantity: 1, unitPrice: 200000, totalPrice: 200000 }],
    totalAmount: 200000,
    pickupPlanAt: '2026-10-10T02:00:00.000Z',
    returnPlanAt: '2026-10-12T02:00:00.000Z',
    ...extra,
  };
}

function post(body: any, idempotencyKey?: string): any {
  return {
    url: 'http://localhost/api/orders',
    headers: {
      get: (k: string) => {
        const name = k.toLowerCase();
        if (name === 'content-type') return 'application/json';
        if (name === 'idempotency-key') return idempotencyKey ?? null;
        return null;
      },
    },
    json: async () => JSON.parse(JSON.stringify(body)),
  };
}


const liveOrders = () => mockStore.orders.filter((o) => !o.deletedAt);
const HOUR = 3600 * 1000;

function booking(extra: any = {}) {
  const row = { id: 300 + mockBookings.length, merchantId: 2, outletId: 3, status: 'PENDING', orderId: null,
    expiresAt: new Date(Date.now() + 20 * HOUR), customerPhone: '0912345678', ...extra };
  mockBookings.push(row);
  return row;
}

describe('POST /api/orders with bookingRequestId (#1124)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staff;
    mockStore.orders = [];
    mockStore.keys = [];
    mockStore.nextOrderId = 500;
    mockStore.keyTable = true;
    mockLocks.clear();
    mockBookings.length = 0;
  });

  it('creates the order and marks the request CONFIRMED with the order, customer and who confirmed', async () => {
    const b = booking();
    const res: any = await POST(post(rentBody({ bookingRequestId: b.id })));
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('ORDER_CREATED_SUCCESS');
    expect(liveOrders()).toHaveLength(1);
    expect(b).toMatchObject({ status: 'CONFIRMED', orderId: liveOrders()[0].id, customerId: 77, decidedById: 9 });
    expect(b.decidedAt).toBeInstanceOf(Date);
  });

  it('a second confirm of the same request is refused (409 BOOKING_REQUEST_CLOSED) and creates no order', async () => {
    const b = booking();
    await POST(post(rentBody({ bookingRequestId: b.id })));
    const second: any = await POST(post(rentBody({ bookingRequestId: b.id, customerId: 78, totalAmount: 150000 })));
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('BOOKING_REQUEST_CLOSED');
    expect(liveOrders()).toHaveLength(1);
  });

  it('an expired, rejected or another shop’s request creates no order', async () => {
    const expired = booking({ expiresAt: new Date(Date.now() - 1) });
    const rejected = booking({ status: 'REJECTED' });
    const foreign = booking({ merchantId: 9 });
    expect(((await POST(post(rentBody({ bookingRequestId: expired.id })))) as any).status).toBe(409);
    expect(((await POST(post(rentBody({ bookingRequestId: rejected.id })))) as any).status).toBe(409);
    expect(((await POST(post(rentBody({ bookingRequestId: foreign.id })))) as any).status).toBe(404);
    expect(((await POST(post(rentBody({ bookingRequestId: 999 })))) as any).status).toBe(404);
    expect(liveOrders()).toHaveLength(0);
  });

  it('a request that closes between the check and the insert is refused (the throw rolls the real transaction back)', async () => {
    const b = booking();
    mockBookingDelegate.updateMany.mockImplementationOnce(async () => ({ count: 0 }));
    const res: any = await POST(post(rentBody({ bookingRequestId: b.id })));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_REQUEST_CLOSED');
  });

  it('Nhân viên kho (OUTLET_INVENTORY) may create orders but not confirm a booking request (403, no order)', async () => {
    const b = booking();
    ctx = { user: { id: 10, role: 'OUTLET_INVENTORY', merchantId: 2, outletId: 3, email: 'k@x' }, userScope: { merchantId: 2, outletId: 3 } };
    const res: any = await POST(post(rentBody({ bookingRequestId: b.id })));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(liveOrders()).toHaveLength(0);
    expect(b.status).toBe('PENDING');
    const plain: any = await POST(post(rentBody()));
    expect(plain.status).toBe(200);
  });

  it('without bookingRequestId nothing about booking requests is read or written (installed apps)', async () => {
    const res: any = await POST(post(rentBody()));
    expect(res.status).toBe(200);
    expect(mockBookingDelegate.findUnique).not.toHaveBeenCalled();
    expect(mockBookingDelegate.updateMany).not.toHaveBeenCalled();
  });
});
