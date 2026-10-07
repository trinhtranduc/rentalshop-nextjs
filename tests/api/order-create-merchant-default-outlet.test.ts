/**
 * #398 — POST /api/orders from a MERCHANT login that has no outletId (how iOS and Android create orders
 * for a shop owner). The body has no `outletId`; the API must use the merchant's default outlet, else its
 * only active outlet, else answer 400 OUTLET_REQUIRED. Explicit outlets and outlet roles are unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

// Outlets of the e2e-like fixture. Merchant 2 owns outlets 1 and 3; merchant 99 owns outlet 7.
type OutletRow = { id: number; merchantId: number; isDefault: boolean; isActive: boolean; name: string };
let outlets: OutletRow[] = [];

const mockDb: any = {
  outlets: {
    findById: jest.fn(async (id: number) => outlets.find((o) => o.id === id) || null),
    // Same contract as packages/database/src/outlet.ts findDefaultForMerchant, over the fixture rows
    findDefaultForMerchant: jest.fn(async (merchantId: number) => {
      const active = outlets.filter((o) => o.merchantId === merchantId && o.isActive);
      return active.find((o) => o.isDefault) || (active.length === 1 ? active[0] : null);
    }),
  },
  merchants: { findById: jest.fn(async (id: number) => ({ id, name: 'Shop', pricingConfig: null })) },
  products: {
    findById: jest.fn(async (id: number) => ({
      id, name: 'Dress', pricingType: 'FIXED', pricingOptions: [], merchantId: 2, merchant: { id: 2 },
    })),
  },
  orders: {
    create: jest.fn(async (data: any) => ({
      id: 500,
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      status: data.status,
      outletId: data.outlet.connect.id,
      totalAmount: data.totalAmount,
      orderItems: [],
      payments: [],
    })),
    // #341: the route creates through the duplicate guard; here it always inserts via `create`
    createOnce: jest.fn(async (_guard: any, data: any) => ({ order: await mockDb.orders.create(data), replay: false })),
    delete: jest.fn(),
  },
  prisma: {
    $transaction: jest.fn(async (fn: any) => fn({ order: { findUnique: async () => null } })),
    // Availability routes: stop right after the outlet is chosen, recording which outlet was used
    outletStock: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => { throw new Error('stop'); }) },
    product: { findMany: jest.fn(async () => [{ id: 11, name: 'Dress', merchantId: 2 }]) },
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

// Stand-in for the zod orderCreateSchema: `z.coerce.number().int().positive()` turns a missing outletId into NaN
const orderCreateSchema = {
  safeParse: (body: any) => {
    const outletId = Number(body.outletId);
    if (!Number.isInteger(outletId) || outletId <= 0) {
      return {
        success: false,
        error: { flatten: () => ({ formErrors: [], fieldErrors: { outletId: ['Expected number, received nan'] } }) },
      };
    }
    return { success: true, data: { depositAmount: 0, ...body, outletId } };
  },
};
jest.mock('@rentalshop/utils', () => ({
  orderCreateSchema,
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

// The real lookup in packages/database/src/outlet.ts, over a mocked Prisma client
const mockPrisma: any = { outlet: { findFirst: jest.fn(), findMany: jest.fn() } };
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { POST } from '../../apps/api/app/api/orders/route';
import { simplifiedOutlets } from '../../packages/database/src/outlet';
import { GET as productAvailability } from '../../apps/api/app/api/products/[id]/availability/route';
import { GET as availabilityCalendar } from '../../apps/api/app/api/products/[id]/availability-calendar/route';
import { GET as availabilityByDate } from '../../apps/api/app/api/products/availability/route';
import { POST as batchAvailability } from '../../apps/api/app/api/products/batch-availability/route';

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin3 = {
  user: { id: 8, role: 'OUTLET_ADMIN', merchantId: 2, outletId: 3, email: 'a@x' },
  userScope: { merchantId: 2, outletId: 3 },
};
const staff3 = {
  user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, email: 's@x' },
  userScope: { merchantId: 2, outletId: 3 },
};
const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} };

/** The SALE body iOS and Android send for a merchant login: no outletId key */
function saleBody(extra: any = {}) {
  return {
    orderType: 'SALE',
    orderItems: [{ productId: 11, quantity: 1, unitPrice: 100000, totalPrice: 100000 }],
    totalAmount: 100000,
    ...extra,
  };
}

function post(body: any): any {
  return {
    url: 'http://localhost/api/orders',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const createdOnOutlet = () => mockDb.orders.create.mock.calls[0]?.[0]?.outlet?.connect?.id;

describe('POST /api/orders — merchant without an outlet (#398)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'Branch' },
      { id: 3, merchantId: 2, isDefault: true, isActive: true, name: 'Main' },
      { id: 7, merchantId: 99, isDefault: true, isActive: true, name: 'Other merchant' },
    ];
  });

  it("uses the merchant's active default outlet when the body has no outletId", async () => {
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, code: 'ORDER_CREATED_SUCCESS' }));
    expect(createdOnOutlet()).toBe(3);
    expect(res.body.data.outletId).toBe(3);
  });

  it('#435: 3 note photos still create; 6 in one field answer 400 IMAGE_VALIDATION_FAILED', async () => {
    const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://cdn.example/n${i}.jpg`);
    const ok: any = await POST(post(saleBody({ notesImages: urls(3) })));
    expect(ok.status).toBe(200);
    mockDb.orders.create.mockClear();
    const res: any = await POST(post(saleBody({ pickupNotesImages: urls(6) })));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('IMAGE_VALIDATION_FAILED');
    expect(mockDb.orders.create).not.toHaveBeenCalled();
  });

  it('treats outletId null / 0 / "" like a missing outletId', async () => {
    for (const outletId of [null, 0, '']) {
      mockDb.orders.create.mockClear();
      const res: any = await POST(post(saleBody({ outletId })));
      expect(res.status).toBe(200);
      expect(createdOnOutlet()).toBe(3);
    }
  });

  it('uses the only active outlet when there is no default', async () => {
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'Only' },
      { id: 4, merchantId: 2, isDefault: false, isActive: false, name: 'Closed' },
      { id: 7, merchantId: 99, isDefault: true, isActive: true, name: 'Other merchant' },
    ];
    const res: any = await POST(post(saleBody({ orderType: 'RENT' })));
    expect(res.status).toBe(200);
    expect(createdOnOutlet()).toBe(1);
  });

  it('answers 400 OUTLET_REQUIRED when there is no default and several active outlets', async () => {
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'A' },
      { id: 3, merchantId: 2, isDefault: false, isActive: true, name: 'B' },
    ];
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'OUTLET_REQUIRED' }));
    expect(mockDb.orders.create).not.toHaveBeenCalled();
  });

  it('never picks an inactive default outlet', async () => {
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'Open' },
      { id: 3, merchantId: 2, isDefault: true, isActive: false, name: 'Closed default' },
    ];
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(200);
    expect(createdOnOutlet()).toBe(1);
  });

  it('answers OUTLET_REQUIRED when the only default is inactive and several outlets remain', async () => {
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'A' },
      { id: 5, merchantId: 2, isDefault: false, isActive: true, name: 'B' },
      { id: 3, merchantId: 2, isDefault: true, isActive: false, name: 'Closed default' },
    ];
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
    expect(mockDb.orders.create).not.toHaveBeenCalled();
  });

  it('looks up the default outlet within the caller merchant only', async () => {
    await POST(post(saleBody()));
    expect(mockDb.outlets.findDefaultForMerchant).toHaveBeenCalledWith(2);
  });

  it('keeps an explicit outletId of the own merchant (no default lookup)', async () => {
    const res: any = await POST(post(saleBody({ outletId: 1 })));
    expect(res.status).toBe(200);
    expect(createdOnOutlet()).toBe(1);
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });

  it("still rejects an explicit outletId of another merchant with 403", async () => {
    const res: any = await POST(post(saleBody({ outletId: 7 })));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT');
    expect(mockDb.orders.create).not.toHaveBeenCalled();
  });

  it.each([
    ['OUTLET_ADMIN', outletAdmin3],
    ['OUTLET_STAFF', staff3],
  ])('%s without outletId still gets their own outlet', async (_role, who) => {
    ctx = who;
    outlets = outlets.map((o) => ({ ...o, isDefault: o.id === 1 }));
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(200);
    expect(createdOnOutlet()).toBe(3);
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });

  it('OUTLET_STAFF sending another outlet is still rejected with 403', async () => {
    ctx = staff3;
    const res: any = await POST(post(saleBody({ outletId: 1 })));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET');
  });

  it('ADMIN with an explicit outletId is unchanged', async () => {
    ctx = admin;
    const res: any = await POST(post(saleBody({ outletId: 7 })));
    expect(res.status).toBe(200);
    expect(createdOnOutlet()).toBe(7);
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });

  it('ADMIN without outletId keeps the validation error (no guessing across merchants)', async () => {
    ctx = admin;
    const res: any = await POST(post(saleBody()));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });
});

describe('db.outlets.findDefaultForMerchant (#398)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the active default outlet of that merchant', async () => {
    mockPrisma.outlet.findFirst.mockResolvedValue({ id: 3, merchantId: 2 });
    const outlet = await simplifiedOutlets.findDefaultForMerchant(2);
    expect(outlet).toEqual({ id: 3, merchantId: 2 });
    expect(mockPrisma.outlet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: 2, isDefault: true, isActive: true } })
    );
    expect(mockPrisma.outlet.findMany).not.toHaveBeenCalled();
  });

  it('falls back to the only active outlet of that merchant', async () => {
    mockPrisma.outlet.findFirst.mockResolvedValue(null);
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1, merchantId: 2 }]);
    expect(await simplifiedOutlets.findDefaultForMerchant(2)).toEqual({ id: 1, merchantId: 2 });
    expect(mockPrisma.outlet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: 2, isActive: true }, take: 2 })
    );
  });

  it('returns null with several active outlets and no default', async () => {
    mockPrisma.outlet.findFirst.mockResolvedValue(null);
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    expect(await simplifiedOutlets.findDefaultForMerchant(2)).toBeNull();
  });

  it('returns null without a merchant id', async () => {
    expect(await simplifiedOutlets.findDefaultForMerchant(undefined as any)).toBeNull();
    expect(mockPrisma.outlet.findFirst).not.toHaveBeenCalled();
  });
});

/**
 * Same root cause on the availability routes the apps call before checkout: a merchant login sends no
 * outletId (iOS omits nil, Android has none), and the routes answered 400 OUTLET_REQUIRED.
 */
describe('availability routes — merchant without an outlet (#398)', () => {
  const get = (url: string): any => ({ url, headers: { get: () => null } });
  const postJson = (body: any): any => ({
    url: 'http://localhost/api/products/batch-availability',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  });
  const routes: Array<[string, (outletQuery: string) => Promise<any>, () => number | undefined]> = [
    [
      'GET /api/products/:id/availability',
      (q) => productAvailability(get(`http://localhost/api/products/11/availability?quantity=1${q}`), { params: { id: '11' } }),
      () => mockDb.prisma.outletStock.findFirst.mock.calls[0]?.[0]?.where?.outletId,
    ],
    [
      'GET /api/products/:id/availability-calendar',
      (q) => availabilityCalendar(get(`http://localhost/api/products/11/availability-calendar?from=2099-01-01&to=2099-01-31${q}`), { params: { id: '11' } }),
      () => mockDb.prisma.outletStock.findFirst.mock.calls[0]?.[0]?.where?.outletId,
    ],
    [
      'GET /api/products/availability',
      (q) => availabilityByDate(get(`http://localhost/api/products/availability?productId=11&date=2099-01-01${q}`)),
      () => mockDb.prisma.outletStock.findFirst.mock.calls[0]?.[0]?.where?.outletId,
    ],
    [
      'POST /api/products/batch-availability',
      (q) => batchAvailability(postJson({ products: [{ productId: 11, quantity: 1 }], orderType: 'SALE', ...(q ? { outletId: Number(q.split('=')[1]) } : {}) })),
      () => mockDb.prisma.outletStock.findMany.mock.calls[0]?.[0]?.where?.outletId,
    ],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    outlets = [
      { id: 1, merchantId: 2, isDefault: false, isActive: true, name: 'Branch' },
      { id: 3, merchantId: 2, isDefault: true, isActive: true, name: 'Main' },
    ];
  });

  it.each(routes)('%s uses the default outlet for a merchant without outletId', async (_name, call, usedOutlet) => {
    const res: any = await call('');
    expect(res.body?.code).not.toBe('OUTLET_REQUIRED');
    expect(mockDb.outlets.findDefaultForMerchant).toHaveBeenCalledWith(2);
    expect(usedOutlet()).toBe(3);
  });

  it.each(routes)('%s keeps OUTLET_REQUIRED when the merchant has several outlets and no default', async (_name, call) => {
    outlets = outlets.map((o) => ({ ...o, isDefault: false }));
    const res: any = await call('');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OUTLET_REQUIRED');
  });

  it.each(routes)('%s keeps an explicit outletId', async (_name, call, usedOutlet) => {
    await call('&outletId=1');
    expect(usedOutlet()).toBe(1);
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });

  it.each(routes)('%s: an OUTLET_STAFF still uses their own outlet', async (_name, call, usedOutlet) => {
    ctx = staff3;
    outlets = outlets.map((o) => ({ ...o, isDefault: o.id === 1 }));
    await call('');
    expect(usedOutlet()).toBe(3);
    expect(mockDb.outlets.findDefaultForMerchant).not.toHaveBeenCalled();
  });
});
