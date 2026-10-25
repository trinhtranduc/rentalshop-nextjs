/**
 * #1189 PUT /api/orders/:id with a day-block order (route over mocked db): an old app (no `block-pricing` header)
 * gets BLOCK lines priced by the server and keeps the stored table; a capable client is checked.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb = {
  merchants: { findById: jest.fn() },
  orders: { findById: jest.fn(), update: jest.fn(), findByIdDetail: jest.fn() },
  outlets: { findById: jest.fn() },
  products: { findById: jest.fn() },
  customers: { findById: jest.fn() },
};
const mockMerchantRow = { settings: null as unknown };
jest.mock('@rentalshop/database', () => ({
  db: Object.assign(mockDb, { prisma: { merchant: { findUnique: async () => mockMerchantRow } } }),
  prisma: { $transaction: jest.fn() },
}));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/legacy-plan-days'),
  ...jest.requireActual('../../packages/utils/src/core/block-pricing'),
  countRentalDays: jest.requireActual('../../packages/utils/src/core/rental-days').countRentalDays,
  ResponseBuilder: { error: (code: string) => ({ success: false, code, message: code, error: code }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: () => [],
  generateStagingKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
}));
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  createAuditHelper: () => ({ logUpdate: jest.fn(() => Promise.resolve()) }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  adjustRedeemOnOrderEdit: jest.fn(),
  calculateAmountDue: jest.fn().mockReturnValue(0),
  getLoyaltyProgram: jest.fn(),
  handleLoyaltyOnCancel: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';

const staff = { user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 's@x' }, userScope: { merchantId: 2, outletId: 1 } };
const snap = { version: 1, type: 'BLOCK', optionId: 31, tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000, days: 3, totalPrice: 120000 };
const blockLine = { id: 1, productId: 13, quantity: 1, unitPrice: 120000, totalPrice: 120000, deposit: 0, notes: null, rentalDays: 3, pricingType: 'BLOCK', pricingOptionId: 31, pricingSnapshot: snap };
const fixedLine = { id: 2, productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000, deposit: 0, notes: null, rentalDays: 1, pricingType: 'FIXED', pricingOptionId: null, pricingSnapshot: null };
const blockProduct = { id: 13, merchantId: 2, pricingOptions: [{ id: 31, type: 'BLOCK', price: 1, isActive: true, isDefault: true, blockTiers: [1, 1, 1], blockExtraMode: 'HOLD_LAST' }] };

function put(body: any, headers: Record<string, string> = {}): any {
  const h: Record<string, string> = { 'content-type': 'application/json', ...headers };
  return { url: 'http://localhost/api/orders/5', headers: { get: (k: string) => h[k.toLowerCase()] ?? null }, json: async () => body };
}

function givenOrder(order: any = {}) {
  const base = {
    id: 5, orderNumber: 'ORD-001-0005', outletId: 1, customerId: null, orderType: 'RENT', status: 'RESERVED',
    pickupPlanAt: new Date('2026-10-10T02:00:00.000Z'), returnPlanAt: new Date('2026-10-12T02:00:00.000Z'),
    totalAmount: 270000, discountType: null, discountValue: 0, discountAmount: 0, orderItems: [blockLine, fixedLine], ...order,
  };
  mockDb.orders.findById.mockResolvedValue(base);
  mockDb.orders.findByIdDetail.mockImplementation(async () => ({ ...base, outlet: { name: 'Outlet 1' }, payments: [] }));
}

describe('PUT /api/orders/:id with a day-block line (#1189)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staff;
    mockMerchantRow.settings = null;
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchantId: 2 }));
    mockDb.merchants.findById.mockResolvedValue({ id: 2, currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' });
    mockDb.orders.update.mockImplementation(async (_id: number, data: any) => ({ id: 5, ...data }));
    mockDb.products.findById.mockImplementation(async (id: number) => (id === 13 ? blockProduct : { id, merchantId: 2, pricingOptions: [] }));
  });

  it('old app echoing the order it received (BLOCK shown as FIXED): the stored table wins over the product table', async () => {
    givenOrder();
    const res: any = await PUT(put({
      totalAmount: 270000,
      orderItems: [{ productId: 13, quantity: 1, unitPrice: 120000, totalPrice: 120000, pricingType: 'FIXED' }, { productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000 }],
    }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data.totalAmount).toBe(270000);
    expect(data.orderItems[0]).toMatchObject({ totalPrice: 120000, pricingType: 'BLOCK', pricingOptionId: 31 });
    expect(data.orderItems[1].pricingSnapshot).toBeUndefined();
  });

  it('old app moving the return date by two days (lines not sent): lines and total repriced from the stored table', async () => {
    givenOrder();
    const res: any = await PUT(put({ returnPlanAt: '2026-10-14T02:00:00.000Z', totalAmount: 270000 }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data.orderItems[0]).toMatchObject({ unitPrice: 160000, totalPrice: 160000, rentalDays: 5 });
    expect(data.orderItems[0].pricingSnapshot).toMatchObject({ days: 5, extraDays: 2 });
    expect(data.orderItems[1]).toMatchObject({ totalPrice: 150000 });
    expect(data.totalAmount).toBe(310000);
  });

  it('old app sending only totalAmount and a percentage discount: total = lines - discount', async () => {
    givenOrder();
    await PUT(put({ totalAmount: 1, discountType: 'percentage', discountValue: 10, discountAmount: 1 }), { params: { orderId: '5' } });
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data).toMatchObject({ totalAmount: 243000, discountAmount: 27000 });
    expect(data.orderItems).toBeUndefined();
  });

  it('a status-only edit does not touch prices', async () => {
    givenOrder();
    await PUT(put({ status: 'PICKUPED' }), { params: { orderId: '5' } });
    const data = mockDb.orders.update.mock.calls[0][1];
    expect('totalAmount' in data && data.totalAmount !== undefined).toBe(false);
    expect(data.orderItems).toBeUndefined();
  });

  it('a snapshot sent by a client is never stored', async () => {
    givenOrder({ orderItems: [fixedLine] });
    await PUT(put({ orderItems: [{ productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000, pricingSnapshot: { type: 'BLOCK', tiers: [0] } }], totalAmount: 150000 }), { params: { orderId: '5' } });
    expect(mockDb.orders.update.mock.calls[0][1].orderItems[0].pricingSnapshot).toBeUndefined();
  });

  it('a capable client with a wrong line price: 400 BLOCK_PRICE_MISMATCH, nothing written', async () => {
    givenOrder();
    const res: any = await PUT(put({
      totalAmount: 1, orderItems: [{ productId: 13, quantity: 1, unitPrice: 1, totalPrice: 1, pricingType: 'BLOCK' }],
    }, { 'x-client-capabilities': 'block-pricing' }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BLOCK_PRICE_MISMATCH');
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('oldApps "block": an old app may still edit an existing block order but not add a new block line', async () => {
    mockMerchantRow.settings = { blockPricing: { oldApps: 'block' } };
    givenOrder({ orderItems: [fixedLine] });
    const res: any = await PUT(put({
      totalAmount: 0, orderItems: [{ productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000 }, { productId: 13, quantity: 1, unitPrice: 0, totalPrice: 0, pricingType: 'FIXED' }],
    }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'PRICING_TYPE_REQUIRES_UPDATE', error: '' });
    givenOrder();
    const ok: any = await PUT(put({ returnPlanAt: '2026-10-13T02:00:00.000Z', totalAmount: 1 }), { params: { orderId: '5' } });
    expect(ok.status).toBe(200);
  });

  it('a SALE order is never repriced', async () => {
    givenOrder({ orderType: 'SALE', orderItems: [fixedLine] });
    await PUT(put({ totalAmount: 99 }), { params: { orderId: '5' } });
    expect(mockDb.orders.update.mock.calls[0][1].totalAmount).toBe(99);
  });
});
