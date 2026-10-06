/**
 * #519 — what new audit rows carry: the audit helper stores order totals and product prices/stock/images,
 * does not log Date/array noise, never stores costPrice; the status and payment routes record a row.
 */
// Audit logging is on in production/development; jest runs with NODE_ENV=test, so turn it on here.
process.env.AUDIT_LOGGING_ENABLED = 'true';
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const created: any[] = [];
const mockPrisma: any = {
  user: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
  merchant: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
  outlet: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
  auditLog: { create: jest.fn(async ({ data }: any) => { created.push(data); return data; }) },
  $transaction: jest.fn(),
};
const mockDb = {
  orders: { findById: jest.fn(), update: jest.fn() },
  outlets: { findById: jest.fn() },
  payments: { findFirst: jest.fn(), create: jest.fn() },
};
jest.mock('@rentalshop/database', () => {
  const { AuditLogger } = jest.requireActual('../../packages/database/src/audit');
  return { AuditLogger, db: mockDb, prisma: mockPrisma };
});
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data?: any) => ({ success: true, code, message: code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  normalizeStartDate: (d: Date) => d,
  normalizeEndDate: (d: Date) => d,
}));
// The routes get the real helper (packages/utils/src/core/audit-helper) through this mock
jest.mock('@rentalshop/utils/server', () => jest.requireActual('../../packages/utils/src/core/audit-helper'));
jest.mock('@rentalshop/loyalty', () => ({
  handleLoyaltyOnCancel: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
  processEarnOnStatusChange: jest.fn(),
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { createAuditHelper } from '../../packages/utils/src/core/audit-helper';
import { buildOrderAuditSnapshot, buildProductAuditSnapshot, buildChangeEntry } from '../../apps/api/lib/change-timeline';
import { PATCH as patchStatus } from '../../apps/api/app/api/orders/[orderId]/status/route';
import { POST as processPayment } from '../../apps/api/app/api/payments/process/route';

const context = { userId: '9', userEmail: 'lan@shop.vn', userRole: 'OUTLET_STAFF', merchantId: '2', outletId: '1' };
const details = (i = 0) => JSON.parse(created[i].details);

const baseOrder = {
  id: 5,
  orderNumber: 'ORD-001-000005',
  orderType: 'RENT',
  status: 'RESERVED',
  outletId: 1,
  totalAmount: 1000000,
  depositAmount: 0,
  securityDeposit: 0,
  pickupPlanAt: new Date('2026-10-02T17:00:00.000Z'),
  returnPlanAt: new Date('2026-10-04T17:00:00.000Z'),
  pickedUpAt: null,
  returnedAt: null,
  notes: null,
  notesImages: [],
  orderItems: [{ productId: 10, quantity: 1, unitPrice: 300000, pricingType: 'FIXED', product: { id: 10, name: 'Áo dài lụa đỏ' } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  created.length = 0;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('audit helper stores what the change history needs (#519)', () => {
  it('Order totalAmount is stored as a number, customerId stays redacted', async () => {
    await createAuditHelper(mockPrisma).logUpdate({
      entityType: 'Order',
      entityId: '5',
      oldValues: { ...buildOrderAuditSnapshot(baseOrder), customerId: 77 },
      newValues: { ...buildOrderAuditSnapshot({ ...baseOrder, totalAmount: 1300000 }), customerId: 77 },
      context,
    });
    expect(created).toHaveLength(1);
    const d = details();
    expect(d.oldValues.totalAmount).toBe(1000000);
    expect(d.newValues.totalAmount).toBe(1300000);
    expect(d.newValues.customerId).toBe('[REDACTED]');
    expect(d.changes).toEqual({ totalAmount: { old: 1000000, new: 1300000 } });
    expect(created[0].outletId).toBe(1);
  });

  it('equal Dates and equal arrays are not a change: no row is written', async () => {
    await createAuditHelper(mockPrisma).logUpdate({
      entityType: 'Order',
      entityId: '5',
      oldValues: { pickupPlanAt: new Date('2026-10-02T17:00:00.000Z'), items: [{ productId: 10, quantity: 1 }] },
      newValues: { pickupPlanAt: new Date('2026-10-02T17:00:00.000Z'), items: [{ productId: 10, quantity: 1 }] },
      context,
    });
    expect(created).toHaveLength(0);
  });

  it('Product rows keep prices, options, stock and images, never costPrice', async () => {
    const product = {
      name: 'Áo dài', rentPrice: 350000, salePrice: 0, deposit: 500000, costPrice: 120000, pricingType: 'FIXED', isActive: true,
      images: ['a'], category: { id: 1, name: 'Áo' }, barcode: 'B1',
      pricingOptions: [{ type: 'DAILY', price: 150000, isActive: true }],
      outletStock: [{ outletId: 1, stock: 3, outlet: { name: 'Chi nhánh chính' } }],
    };
    await createAuditHelper(mockPrisma).logUpdate({
      entityType: 'Product',
      entityId: '10',
      oldValues: { ...buildProductAuditSnapshot(product), costPrice: 120000 },
      newValues: { ...buildProductAuditSnapshot({ ...product, outletStock: [{ outletId: 1, stock: 4, outlet: { name: 'Chi nhánh chính' } }] }), costPrice: 130000 },
      context,
    });
    const d = details();
    expect(Object.keys(d.newValues).sort()).toEqual(
      ['barcode', 'category', 'deposit', 'images', 'isActive', 'name', 'outletStock', 'pricingOptions', 'pricingType', 'rentPrice', 'salePrice']
    );
    expect(created[0].details).not.toContain('120000');
    expect(created[0].details).not.toContain('130000');
    const entry = buildChangeEntry({ id: 1, action: 'UPDATE', createdAt: new Date(), details: created[0].details }, 'Product');
    expect(entry.kind).toBe('PRODUCT_STOCK');
  });

  it('logCustom keeps newValues (payment rows)', async () => {
    await createAuditHelper(mockPrisma).logCustom({
      action: 'CUSTOM', entityType: 'Order', entityId: '5', description: 'x', context,
      newValues: { payment: { kind: 'COLLECT', amount: 300000, method: 'CASH' } },
    });
    expect(details().newValues).toEqual({ payment: { kind: 'COLLECT', amount: 300000, method: 'CASH' } });
  });

  it('a failing audit write never throws', async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('db down'));
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      createAuditHelper(mockPrisma).logUpdate({ entityType: 'Order', entityId: '5', oldValues: { status: 'A' }, newValues: { status: 'B' }, context })
    ).resolves.toBeUndefined();
    err.mockRestore();
  });
});

const staff = { user: { id: 9, role: 'OUTLET_STAFF', email: 'lan@shop.vn', merchantId: 2, outletId: 1 }, userScope: { merchantId: 2, outletId: 1 } };
const headers = { get: (k: string) => (k === 'user-agent' ? 'AnyRent/1.0' : null) };

describe('routes record a row (#519)', () => {
  it('PATCH /orders/:id/status RESERVED → PICKUPED records "Giao đồ"', async () => {
    ctx = staff;
    mockDb.orders.findById
      .mockResolvedValueOnce({ ...baseOrder })
      .mockResolvedValueOnce({ ...baseOrder, status: 'PICKUPED', pickedUpAt: new Date('2026-10-06T08:10:00Z') });
    mockDb.orders.update.mockResolvedValue({ ...baseOrder, status: 'PICKUPED' });
    mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });

    const res: any = await patchStatus(
      { json: async () => ({ status: 'PICKUPED' }), headers, url: 'http://x/api/orders/5/status' } as any,
      { params: { orderId: '5' } }
    );
    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect(created[0].entityType).toBe('Order');
    expect(created[0].entityId).toBe('5');
    const entry = buildChangeEntry({ id: 1, action: created[0].action, createdAt: new Date(), details: created[0].details }, 'Order');
    expect(entry.kind).toBe('ORDER_PICKED_UP');
    expect(entry.changes).toEqual([{ field: 'status', from: 'RESERVED', to: 'PICKUPED' }]);
  });

  it('a rejected status change records nothing', async () => {
    ctx = staff;
    mockDb.orders.findById.mockResolvedValueOnce({ ...baseOrder, status: 'RETURNED' });
    const res: any = await patchStatus(
      { json: async () => ({ status: 'RESERVED' }), headers, url: 'http://x/api/orders/5/status' } as any,
      { params: { orderId: '5' } }
    );
    expect(res.status).toBe(400);
    expect(created).toHaveLength(0);
  });

  it('POST /payments/process records the payment on the order; response unchanged', async () => {
    ctx = staff;
    mockDb.orders.findById.mockResolvedValue({ ...baseOrder });
    mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
    mockDb.payments.findFirst.mockResolvedValue(null);
    mockDb.payments.create.mockImplementation(async (data: any) => ({ id: 1, ...data }));
    const res: any = await processPayment(
      { json: async () => ({ orderId: 5, amount: 300000, method: 'CASH', reference: 'ref-12345678' }), headers, url: 'http://x' } as any
    );
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('ORDER_PAYMENT_PROCESSED');
    expect(Object.keys(res.body.data)).toEqual(['payment']);
    expect(created).toHaveLength(1);
    const entry = buildChangeEntry({ id: 1, action: created[0].action, createdAt: new Date(), details: created[0].details }, 'Order');
    expect(entry.kind).toBe('ORDER_PAYMENT');
    expect(entry.changes[0]).toEqual({ field: 'paymentCollected', from: null, to: 300000 });
  });

  it('a payment replay (same reference) records nothing new', async () => {
    ctx = staff;
    mockDb.orders.findById.mockResolvedValue({ ...baseOrder });
    mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
    mockDb.payments.findFirst.mockResolvedValue({ id: 1 });
    await processPayment({ json: async () => ({ orderId: 5, amount: 1, method: 'CASH', reference: 'ref-12345678' }), headers, url: 'http://x' } as any);
    expect(created).toHaveLength(0);
  });
});
