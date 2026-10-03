/**
 * #361 — PUT /api/orders/:id with `status` (how iOS and Android change status).
 * Replays the installed apps' requests: they must keep working; invalid changes and other merchants are rejected.
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
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { $transaction: jest.fn() } }));
jest.mock('@rentalshop/utils', () => ({
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
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve() }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  adjustRedeemOnOrderEdit: jest.fn(),
  calculateAmountDue: jest.fn().mockReturnValue(0),
  getLoyaltyProgram: jest.fn(),
  handleLoyaltyOnCancel: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
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

function givenOrder(order: any) {
  const base = { id: 5, orderNumber: 'ORD-001-0005', outletId: 1, customerId: null, totalAmount: 100000, orderItems: [], ...order };
  mockDb.orders.findById.mockResolvedValue(base);
  mockDb.orders.findByIdDetail.mockImplementation(async () => ({ ...base, outlet: { name: 'Outlet 1' }, orderItems: [], payments: [] }));
}

describe('PUT /api/orders/:id status changes (#361)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staffOutlet1;
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchantId: id === 7 ? 99 : 2 }));
    mockDb.orders.update.mockImplementation(async (_id: number, data: any) => ({ id: 5, ...data }));
  });

  it.each([
    ['RENT', 'RESERVED', 'PICKUPED'],
    ['RENT', 'PICKUPED', 'RETURNED'],
    ['RENT', 'RESERVED', 'CANCELLED'],
    ['SALE', 'COMPLETED', 'CANCELLED'],
    ['RENT', 'RESERVED', 'RESERVED'],
  ])('installed apps: %s %s → %s still works', async (orderType, from, to) => {
    givenOrder({ orderType, status: from });
    const res: any = await PUT(put({ status: to }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalled();
  });

  it('rejects RETURNED → RESERVED with INVALID_ORDER_STATUS and writes nothing', async () => {
    givenOrder({ orderType: 'RENT', status: 'RETURNED' });
    const res: any = await PUT(put({ status: 'RESERVED' }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'INVALID_ORDER_STATUS' }));
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it("rejects a merchant who sends another merchant's order outlet", async () => {
    ctx = merchant;
    givenOrder({ orderType: 'RENT', status: 'RESERVED', outletId: 7 });
    const res: any = await PUT(put({ outletId: 7, notes: 'x' }), { params: { orderId: '5' } });
    expect(res.status).toBe(403);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });
});
