/**
 * #361 — PATCH /api/orders/:id/status (web): valid transitions only, and only on the caller's own orders.
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
  orders: { findById: jest.fn(), update: jest.fn() },
  outlets: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { $transaction: jest.fn() } }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: { error: (code: string) => ({ success: false, code, message: code, error: code }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));
// #519: the route now records the status move in the audit log
jest.mock('@rentalshop/utils/server', () => ({
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve() }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  handleLoyaltyOnCancel: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
  processEarnOnStatusChange: jest.fn(),
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PATCH } from '../../apps/api/app/api/orders/[orderId]/status/route';

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
const staffOutlet1 = { user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1 }, userScope: { merchantId: 2, outletId: 1 } };

function patch(body: any): any {
  return { json: async () => body, headers: { get: () => 'application/json' }, url: 'http://localhost/api/orders/5/status' };
}

function givenOrder(order: any) {
  mockDb.orders.findById.mockResolvedValue({ id: 5, orderNumber: 'ORD-001-0005', outletId: 1, ...order });
}

describe('PATCH /api/orders/:id/status (#361)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchantId: id === 7 ? 99 : 2 }));
    mockDb.orders.update.mockImplementation(async (_id: number, data: any) => ({ id: 5, outletId: 1, ...data }));
  });

  it('rejects RETURNED → RESERVED with INVALID_ORDER_STATUS and writes nothing', async () => {
    givenOrder({ orderType: 'RENT', status: 'RETURNED' });
    const res: any = await PATCH(patch({ status: 'RESERVED' }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'INVALID_ORDER_STATUS' }));
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('allows RESERVED → PICKUPED', async () => {
    givenOrder({ orderType: 'RENT', status: 'RESERVED' });
    const res: any = await PATCH(patch({ status: 'PICKUPED' }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalled();
  });

  it("rejects a merchant changing another merchant's order", async () => {
    givenOrder({ orderType: 'RENT', status: 'RESERVED', outletId: 7 });
    const res: any = await PATCH(patch({ status: 'CANCELLED' }), { params: { orderId: '5' } });
    expect(res.status).toBe(403);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('rejects outlet staff changing an order of another outlet', async () => {
    ctx = staffOutlet1;
    givenOrder({ orderType: 'RENT', status: 'RESERVED', outletId: 3 });
    const res: any = await PATCH(patch({ status: 'PICKUPED' }), { params: { orderId: '5' } });
    expect(res.status).toBe(403);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });
});
