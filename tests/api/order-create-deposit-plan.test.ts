/**
 * #1199 — POST /api/orders with `paymentPlan`: only a client that declared `installments`, in a STAGED shop, on a RENT
 * order gets a deposit plan; every other create is exactly as before. "Collect stage 1 now" runs in the create transaction.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

let merchantRow: any;
const createdPayments: any[] = [];
const txState = { depositAmount: 0 };
const mockDb: any = {
  outlets: {
    findById: jest.fn(async (id: number) => ({ id, merchantId: 2, isActive: true, name: 'Main' })),
    findDefaultForMerchant: jest.fn(async () => ({ id: 3 })),
  },
  // The real `db.merchants.findById` selects no `settings` column: the stages must come from a read that asks for it
  merchants: { findById: jest.fn(async () => { const { settings: _omit, ...row } = merchantRow; return row; }) },
  products: {
    findById: jest.fn(async (id: number) => ({ id, name: 'Dress', pricingType: 'FIXED', pricingOptions: [], merchantId: 2, merchant: { id: 2 } })),
  },
  orders: {
    createOnce: jest.fn(async (_guard: any, data: any, options?: any) => {
      const order: any = {
        id: 500, orderNumber: data.orderNumber, orderType: data.orderType, status: data.status, outletId: 3,
        totalAmount: data.totalAmount, depositAmount: data.depositAmount, depositPlan: data.depositPlan ?? null,
        createdAt: new Date('2026-10-25T03:00:00Z'), pickupPlanAt: data.pickupPlanAt, returnPlanAt: data.returnPlanAt,
        orderItems: [], payments: [],
      };
      const tx: any = {
        payment: { create: jest.fn(async ({ data: row }: any) => { createdPayments.push(row); return { id: 1, ...row }; }) },
        order: {
          findUnique: jest.fn(async () => ({ depositPlan: order.depositPlan, pickedUpAt: null, depositAmount: txState.depositAmount })),
          update: jest.fn(async ({ data: next }: any) => { txState.depositAmount = next.depositAmount; }),
        },
      };
      tx.payment.findMany = jest.fn(async () => createdPayments.map((p) => ({ ...p })));
      if (options?.afterInsert) await options.afterInsert(tx, order);
      return { order, replay: false };
    }),
    delete: jest.fn(),
  },
  prisma: {
    merchant: { findUnique: jest.fn(async () => ({ currency: merchantRow?.currency, timezone: merchantRow?.timezone, settings: merchantRow?.settings ?? null })) },
    $transaction: jest.fn(async (fn: any) => fn({ order: { findUnique: async () => null } })),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockDb.prisma }));

jest.mock('@rentalshop/utils', () => ({
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
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e?.stack || e) }, statusCode: 500 }),
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

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
const staff = { user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, email: 's@x' }, userScope: { merchantId: 2, outletId: 3 } };

const stagedShop = (extra: any = {}) => ({
  id: 2, name: 'Shop', pricingConfig: null, currency: 'VND', timezone: 'Asia/Ho_Chi_Minh',
  settings: { payment: { depositMode: 'STAGED', cancellationPolicy: 'Huỷ mất cọc giữ chỗ', templates: [], ...extra } },
});

function rentBody(extra: any = {}) {
  return {
    orderType: 'RENT', outletId: 3,
    orderItems: [{ productId: 11, quantity: 1, unitPrice: 12_000_000, totalPrice: 12_000_000 }],
    totalAmount: 12_000_000, depositAmount: 500_000,
    pickupPlanAt: '2026-11-14T03:00:00Z', returnPlanAt: '2026-11-17T03:00:00Z',
    ...extra,
  };
}
function post(body: any, capabilities: string | null = 'installments'): any {
  return {
    url: 'http://localhost/api/orders',
    headers: { get: (k: string) => (k.toLowerCase() === 'x-client-capabilities' ? capabilities : k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}
const stored = () => mockDb.orders.createOnce.mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  merchantRow = stagedShop();
  createdPayments.length = 0;
  txState.depositAmount = 0;
});

describe('POST /api/orders with a deposit plan (#1199)', () => {
  it('STAGED shop + capable client: the default template becomes the plan, depositAmount starts at 0, policy is snapshotted', async () => {
    const res: any = await POST(post(rentBody({ paymentPlan: {} })));
    expect(res.status).toBe(200);
    expect(stored().depositPlan).toEqual({
      v: 1,
      policy: 'Huỷ mất cọc giữ chỗ',
      items: [{ key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } }],
    });
    expect(stored().depositAmount).toBe(0); // the 500.000 the old cart computed is ignored
    expect(res.body.data.installments.map((s: any) => [s.key, s.amount])).toEqual([['i1', 3_600_000], ['rest', 8_400_000]]);
    expect(res.body.data.hasDepositPlan).toBe(true);
    expect(res.body.data.depositPlanPolicy).toBe('Huỷ mất cọc giữ chỗ');
  });

  it('MERCHANT sends its own stages (30 / 40 / rest)', async () => {
    const items = [
      { label: 'Cọc giữ chỗ', value: 30, dueRule: { kind: 'ON_CREATE' } },
      { label: 'Cọc lần 2', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
    ];
    const res: any = await POST(post(rentBody({ paymentPlan: { items } })));
    expect(res.body.data.installments.map((s: any) => [s.key, s.amount, s.dueDateKey])).toEqual([
      ['i1', 3_600_000, '2026-10-25'], ['i2', 4_800_000, '2026-11-13'], ['rest', 3_600_000, '2026-11-14'],
    ]);
  });

  it('staff cannot choose stages: the sent items are ignored and the default template is used', async () => {
    ctx = staff;
    const items = [{ label: 'Tự chế', value: 90, dueRule: { kind: 'ON_CREATE' } }];
    await POST(post(rentBody({ paymentPlan: { items } })));
    expect(stored().depositPlan.items).toHaveLength(1);
    expect(stored().depositPlan.items[0].value).toBe(30);
  });

  it('"collect stage 1 now" writes the Payment inside the create transaction and depositAmount follows', async () => {
    const res: any = await POST(post(rentBody({ paymentPlan: { collectFirstNow: { method: 'CASH', reference: 'create-ref-0001' } } })));
    expect(res.status).toBe(200);
    expect(createdPayments).toHaveLength(1);
    expect(createdPayments[0]).toMatchObject({
      orderId: 500, amount: 3_600_000, notes: 'INSTALLMENT', installmentKey: 'i1', status: 'COMPLETED', reference: 'create-ref-0001', type: 'ORDER_PAYMENT',
    });
    expect(txState.depositAmount).toBe(3_600_000);
    expect(res.body.data.depositAmount).toBe(3_600_000);
    expect(res.body.data.installments[0]).toMatchObject({ key: 'i1', status: 'PAID', paidAmount: 3_600_000 });
  });

  it('stages over 100% of the total are 400 INSTALLMENT_EXCEEDS_TOTAL', async () => {
    const items = [{ label: 'Một', value: 60, amountOverride: 13_000_000, dueRule: { kind: 'ON_CREATE' } }];
    const res: any = await POST(post(rentBody({ paymentPlan: { items } })));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSTALLMENT_EXCEEDS_TOTAL');
    expect(mockDb.orders.createOnce).not.toHaveBeenCalled();
  });

  it('loyalty points on a plan order are refused', async () => {
    const res: any = await POST(post(rentBody({ paymentPlan: {}, loyaltyRedeem: { points: 10 } })));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSTALLMENT_LOYALTY_UNSUPPORTED');
  });
});

describe('every other create is unchanged', () => {
  it('ONE_TIME shop ignores paymentPlan: no plan, client depositAmount kept, no stage fields in the response', async () => {
    merchantRow = { ...stagedShop(), settings: null };
    const res: any = await POST(post(rentBody({ paymentPlan: {} })));
    expect(stored().depositPlan).toBeUndefined();
    expect(stored().depositAmount).toBe(500_000);
    expect(res.body.data.hasDepositPlan).toBe(false);
  });

  it('a client without the capability (every installed app) gets no plan even in a STAGED shop, and no new response fields', async () => {
    const res: any = await POST(post(rentBody({ paymentPlan: {} }), null));
    expect(stored().depositPlan).toBeUndefined();
    expect(stored().depositAmount).toBe(500_000);
    expect(res.body.data).not.toHaveProperty('installments');
    expect(res.body.data).not.toHaveProperty('hasDepositPlan');
    expect(res.body.data).not.toHaveProperty('depositPlan');
  });

  it('a SALE never gets a plan; a capable create without paymentPlan gets none either', async () => {
    await POST(post(rentBody({ orderType: 'SALE', paymentPlan: {} })));
    expect(stored().depositPlan).toBeUndefined();
    mockDb.orders.createOnce.mockClear();
    await POST(post(rentBody()));
    expect(stored().depositPlan).toBeUndefined();
    expect(stored().depositAmount).toBe(500_000);
  });
});
