/**
 * #521 — GET /api/orders/:id must not return an order of another merchant.
 * Same shop (any outlet) and ADMIN keep reading as before, so installed apps are unaffected.
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
const mockLogUpdate = jest.fn((_params: any) => Promise.resolve());
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  createAuditHelper: () => ({ logUpdate: mockLogUpdate }),
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

import { GET } from '../../apps/api/app/api/orders/[orderId]/route';

const merchant2 = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
const staffOutlet1 = { user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 's@x' }, userScope: { merchantId: 2, outletId: 1 } };
const admin = { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} };

const order = (id: number, outletId: number) => ({
  id, orderNumber: `ORD-${outletId}-0001`, outletId, orderType: 'RENT', status: 'RESERVED',
  createdAt: new Date('2026-10-01T03:00:00Z'), updatedAt: new Date('2026-10-01T03:00:00Z'),
  pickupPlanAt: null, returnPlanAt: null, pickedUpAt: null, returnedAt: null, orderItems: [],
});
const outlets: Record<number, any> = { 1: { id: 1, merchantId: 2 }, 3: { id: 3, merchantId: 2 }, 7: { id: 7, merchantId: 99 } };
const get = (id: string) => GET({ url: `http://x/api/orders/${id}`, headers: { get: () => null } } as any, { params: { orderId: id } }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.orders.findByIdDetail.mockImplementation(async (id: number) => ({ 10: order(10, 1), 11: order(11, 3), 20: order(20, 7) } as any)[id] ?? null);
  mockDb.outlets.findById.mockImplementation(async (id: number) => outlets[id] ?? null);
});

describe('GET /api/orders/:id scope (#521)', () => {
  it('404 ORDER_NOT_FOUND for an order of another merchant', async () => {
    ctx = merchant2;
    const res = await get('20');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ORDER_NOT_FOUND');
    expect(res.body.data).toBeUndefined();
  });

  it('own shop: owner reads orders of every outlet, as before', async () => {
    ctx = merchant2;
    expect((await get('10')).body.data.id).toBe(10);
    expect((await get('11')).body.data.id).toBe(11);
  });

  it('outlet staff of the same shop keep reading (no new outlet restriction)', async () => {
    ctx = staffOutlet1;
    expect((await get('10')).status).toBe(200);
    expect((await get('11')).status).toBe(200);
  });

  it('ADMIN reads any order', async () => {
    ctx = admin;
    expect((await get('20')).status).toBe(200);
  });
});
