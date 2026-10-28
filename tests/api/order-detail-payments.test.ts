/**
 * #1200 — GET /api/orders/:id: payments[] carries paymentMethod / paymentDate for every client (installed iOS
 * builds require them), and an INSTALLMENT row is shown only to a client that sends X-Client-Capabilities: installments.
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
  // #1199: a client with `installments` also gets the stages, which need the shop currency / time zone
  prisma: { merchant: { findUnique: jest.fn().mockResolvedValue({ currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', settings: null }) } },
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
const at = new Date('2026-10-12T03:00:00.000Z');
const pay = (id: number, notes: string | null, amount = 100000) => ({
  id, amount, method: 'CASH', status: 'COMPLETED', reference: null, notes, processedAt: at, createdAt: at, updatedAt: at,
});
const detail = () => ({
  id: 10, orderNumber: '123456', outletId: 1, orderType: 'RENT', status: 'RESERVED',
  createdAt: at, updatedAt: at, pickupPlanAt: null, returnPlanAt: null, pickedUpAt: null, returnedAt: null, orderItems: [],
  payments: [pay(1, 'PICKUP', 300000), pay(2, 'INSTALLMENT', 200000)],
  itemCount: 0, paymentCount: 2, totalPaid: 500000,
});
const get = (capabilities?: string) => GET(
  { url: 'http://x/api/orders/10', headers: { get: (n: string) => (n.toLowerCase() === 'x-client-capabilities' ? (capabilities ?? null) : null) } } as any,
  { params: { orderId: '10' } }
) as any;

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant2;
  mockDb.orders.findByIdDetail.mockImplementation(async () => detail());
  mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
});

describe('GET /api/orders/:id payments[] (#1200)', () => {
  it('old client (no header): alias keys on every row, INSTALLMENT row hidden, totals follow', async () => {
    const data = (await get()).body.data;
    expect(data.payments.map((p: any) => p.id)).toEqual([1]);
    expect(data.payments[0]).toEqual(expect.objectContaining({
      id: 1, method: 'CASH', processedAt: at, status: 'COMPLETED', notes: 'PICKUP', amount: 300000,
      paymentMethod: 'CASH', paymentDate: '2026-10-12T03:00:00.000Z',
    }));
    expect(data.paymentCount).toBe(1);
    expect(data.totalPaid).toBe(300000);
  });

  it('client with `installments`: both rows, both with alias keys', async () => {
    const data = (await get('installments')).body.data;
    expect(data.payments.map((p: any) => p.id)).toEqual([1, 2]);
    expect(data.payments.every((p: any) => p.paymentMethod === 'CASH' && typeof p.paymentDate === 'string')).toBe(true);
    expect(data.paymentCount).toBe(2);
    expect(data.totalPaid).toBe(500000);
  });

  it('order fields other than payments are unchanged', async () => {
    const data = (await get()).body.data;
    expect(data.orderNumber).toBe('123456');
    expect(data.itemCount).toBe(0);
    expect(data.createdAt).toBe('2026-10-12T03:00:00.000Z');
  });
});
