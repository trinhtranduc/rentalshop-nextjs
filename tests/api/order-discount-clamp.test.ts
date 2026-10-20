/**
 * #1070 (owner chose "cách A"): a discount above the order lines is clamped by the server instead of rejected.
 * Installed apps send `discountAmount` unclamped (iOS Cart.swift, Android CartStore.kt) and a total already clamped
 * to 0; the API keeps accepting those requests and stores a discount no larger than Σ line totalPrice.
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
  orders: { findById: jest.fn(), update: jest.fn(), findByIdDetail: jest.fn() },
  outlets: { findById: jest.fn() },
  products: { findById: jest.fn() },
  customers: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { $transaction: jest.fn() } }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/legacy-plan-days'),
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

import { clampOrderDiscount } from '../../apps/api/lib/order-discount';
import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';

describe('clampOrderDiscount (#1070)', () => {
  it('lowers an amount discount above the lines to the lines (value and amount)', () => {
    expect(clampOrderDiscount({ discountType: 'amount', discountValue: 500000, discountAmount: 500000 }, 300000))
      .toEqual({ discountValue: 300000, discountAmount: 300000, clamped: true });
  });

  it('lowers a percentage above 100 to 100 and its amount to the lines', () => {
    expect(clampOrderDiscount({ discountType: 'percentage', discountValue: 150, discountAmount: 450000 }, 300000))
      .toEqual({ discountValue: 100, discountAmount: 300000, clamped: true });
  });

  it('keeps a discount equal to or below the lines', () => {
    expect(clampOrderDiscount({ discountType: 'amount', discountValue: 300000, discountAmount: 300000 }, 300000))
      .toEqual({ discountValue: 300000, discountAmount: 300000, clamped: false });
    expect(clampOrderDiscount({ discountType: 'percentage', discountValue: 20, discountAmount: 60000 }, 300000))
      .toEqual({ discountValue: 20, discountAmount: 60000, clamped: false });
  });

  it('leaves fields the client did not send undefined', () => {
    expect(clampOrderDiscount({ discountAmount: 900 }, 500)).toEqual({ discountValue: undefined, discountAmount: 500, clamped: true });
    expect(clampOrderDiscount({}, 500)).toEqual({ discountValue: undefined, discountAmount: undefined, clamped: false });
  });

  it('a missing type is an amount discount (Android/iOS default)', () => {
    expect(clampOrderDiscount({ discountValue: 900, discountAmount: 900 }, 500).discountValue).toBe(500);
  });

  it('lines summing to 0 clamp any discount to 0', () => {
    expect(clampOrderDiscount({ discountType: 'amount', discountValue: 10, discountAmount: 10 }, 0))
      .toEqual({ discountValue: 0, discountAmount: 0, clamped: true });
  });
});

const staffOutlet1 = {
  user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 's@x' },
  userScope: { merchantId: 2, outletId: 1 },
};

function put(body: any): any {
  return {
    url: 'http://localhost/api/orders/5',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const existingItems = [
  { id: 1, productId: 11, quantity: 1, unitPrice: 200000, totalPrice: 200000, pricingType: 'FIXED' },
  { id: 2, productId: 12, quantity: 1, unitPrice: 100000, totalPrice: 100000, pricingType: 'FIXED' },
];

function givenOrder(order: any = {}) {
  const base = {
    id: 5, orderNumber: 'ORD-001-0005', outletId: 1, customerId: null, orderType: 'RENT', status: 'RESERVED',
    totalAmount: 300000, discountType: null, discountValue: 0, discountAmount: 0, orderItems: existingItems, ...order,
  };
  mockDb.orders.findById.mockResolvedValue(base);
  mockDb.orders.findByIdDetail.mockImplementation(async () => ({ ...base, outlet: { name: 'Outlet 1' }, payments: [] }));
}

describe('PUT /api/orders/:id clamps a discount above the lines (#1070)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staffOutlet1;
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchantId: 2 }));
    mockDb.orders.update.mockImplementation(async (_id: number, data: any) => ({ id: 5, ...data }));
  });

  it('old iOS edit: amount discount above the existing lines → 200, stored discount = lines, total as sent', async () => {
    givenOrder();
    const res: any = await PUT(
      put({ totalAmount: 0, discountType: 'amount', discountValue: 500000, discountAmount: 500000 }),
      { params: { orderId: '5' } }
    );
    expect(res.status).toBe(200);
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data).toEqual(expect.objectContaining({ discountValue: 300000, discountAmount: 300000, totalAmount: 0 }));
  });

  it('uses the lines sent in the same edit', async () => {
    givenOrder();
    const res: any = await PUT(
      put({
        totalAmount: 0, discountType: 'amount', discountValue: 250000, discountAmount: 250000,
        orderItems: [{ productId: 11, quantity: 1, unitPrice: 200000, totalPrice: 200000 }],
      }),
      { params: { orderId: '5' } }
    );
    expect(res.status).toBe(200);
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data.discountAmount).toBe(200000);
    expect(data.discountValue).toBe(200000);
  });

  it('percentage above 100 → 100', async () => {
    givenOrder();
    const res: any = await PUT(
      put({ totalAmount: 0, discountType: 'percentage', discountValue: 120, discountAmount: 360000 }),
      { params: { orderId: '5' } }
    );
    expect(res.status).toBe(200);
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data).toEqual(expect.objectContaining({ discountValue: 100, discountAmount: 300000 }));
  });

  it('a discount within the lines is stored as sent', async () => {
    givenOrder();
    await PUT(put({ totalAmount: 250000, discountType: 'amount', discountValue: 50000, discountAmount: 50000 }), { params: { orderId: '5' } });
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data).toEqual(expect.objectContaining({ discountValue: 50000, discountAmount: 50000, totalAmount: 250000 }));
  });

  it('a status-only edit does not add discount fields', async () => {
    givenOrder();
    await PUT(put({ status: 'PICKUPED' }), { params: { orderId: '5' } });
    const data = mockDb.orders.update.mock.calls[0][1];
    expect('discountAmount' in data).toBe(false);
    expect('discountValue' in data).toBe(false);
  });
});
