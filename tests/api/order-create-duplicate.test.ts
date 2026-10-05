/**
 * #341 — one Save / Confirm on iOS sometimes created two identical orders.
 *
 * POST /api/orders runs here against the real `packages/database/src/order.ts` over an in-memory Prisma
 * fake. The fake keeps orders in an array, waits a tick inside `order.create` (so two requests really
 * interleave), and honours `pg_advisory_xact_lock` like Postgres: a second transaction asking for the
 * same lock waits until the first transaction ends.
 *
 * Expected (owner decision 2026-10-05: only the Idempotency-Key dedupes; no time window):
 * - two concurrent creates with the same key → one order, both responses carry its id
 * - a retried create with the same key → same order
 * - no key (installed apps, web) → every request creates its own order, as before
 * - a new key, or the same key from another user → a new order
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

// Advisory locks: key → promise that resolves when the holding transaction ends
const mockLocks = new Map<string, Promise<void>>();

function mockClient(held: Array<() => void> | null): any {
  return {
    order: mockOrderDelegate,
    orderCreateKey: mockKeyDelegate,
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

describe('POST /api/orders — one confirm creates one order (#341)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staff;
    mockStore.orders = [];
    mockStore.keys = [];
    mockStore.nextOrderId = 500;
    mockStore.keyTable = true;
    mockLocks.clear();
  });

  it('no key (installed apps, web): two concurrent identical creates each create their own order, as before', async () => {
    const [a, b]: any[] = await Promise.all([POST(post(rentBody())), POST(post(rentBody()))]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.code).toBe('ORDER_CREATED_SUCCESS');
    expect(b.body.code).toBe('ORDER_CREATED_SUCCESS');
    expect(liveOrders()).toHaveLength(2);
    expect(b.body.data.id).not.toBe(a.body.data.id);
    expect(mockUpdateStock).toHaveBeenCalledTimes(2);
  });

  it('no key: a repeated identical create is a new order (no time window)', async () => {
    const first: any = await POST(post(rentBody()));
    const second: any = await POST(post(rentBody()));

    expect(second.status).toBe(200);
    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(liveOrders()).toHaveLength(2);
  });

  it('two concurrent creates with the same Idempotency-Key produce one order', async () => {
    const key = 'ios-7f3c2a10-5b9e-4c8d-9a61-0e2f4b7c1d33';
    const [a, b]: any[] = await Promise.all([POST(post(rentBody(), key)), POST(post(rentBody(), key))]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(liveOrders()).toHaveLength(1);
    expect(b.body.data.id).toBe(a.body.data.id);
    expect(b.body.data.orderNumber).toBe(a.body.data.orderNumber);
    // Stock is reserved once, for the one order
    expect(mockUpdateStock).toHaveBeenCalledTimes(1);
  });

  it('a retried create with the same key returns the existing order', async () => {
    const key = 'android-1b2c3d4e5f60718293a4b5c6d7e8f901';
    const first: any = await POST(post(rentBody(), key));
    const retry: any = await POST(post(rentBody(), key));

    expect(retry.status).toBe(200);
    expect(retry.body.code).toBe('ORDER_CREATED_SUCCESS');
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(liveOrders()).toHaveLength(1);
  });

  it('different keyed orders sent at the same time are all created', async () => {
    const [a, b, c]: any[] = await Promise.all([
      POST(post(rentBody(), 'key-order-a-000001')),
      POST(post(rentBody({ orderItems: [{ productId: 12, quantity: 1, unitPrice: 200000, totalPrice: 200000 }] }), 'key-order-b-000002')),
      POST(post(rentBody({ customerId: 78 }), 'key-order-c-000003')),
    ]);

    expect(liveOrders()).toHaveLength(3);
    expect(new Set([a.body.data.id, b.body.data.id, c.body.data.id]).size).toBe(3);
  });

  it('a new Idempotency-Key creates a new order even when the body is identical', async () => {
    const first: any = await POST(post(rentBody(), 'key-aaaaaaaaaaaaaaaa'));
    const second: any = await POST(post(rentBody(), 'key-bbbbbbbbbbbbbbbb'));

    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(liveOrders()).toHaveLength(2);
  });

  it('the same key from another user is a different create', async () => {
    const key = 'shared-key-0000000001';
    const first: any = await POST(post(rentBody(), key));
    ctx = {
      user: { id: 10, role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, email: 't@x' },
      userScope: { merchantId: 2, outletId: 3 },
    };
    const second: any = await POST(post(rentBody(), key));

    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(liveOrders()).toHaveLength(2);
  });

  it('a malformed key is ignored: the request creates an order as without a key', async () => {
    const first: any = await POST(post(rentBody(), 'short'));
    const second: any = await POST(post(rentBody(), 'short'));

    expect(first.status).toBe(200);
    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(liveOrders()).toHaveLength(2);
  });

  it('keyed creates still succeed when the key table is not migrated yet (no dedupe, no error)', async () => {
    mockStore.keyTable = false;
    const key = 'ios-00000000-0000-4000-8000-000000000001';
    const first: any = await POST(post(rentBody(), key));
    const retry: any = await POST(post(rentBody(), key));

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(liveOrders()).toHaveLength(2);
  });
});
