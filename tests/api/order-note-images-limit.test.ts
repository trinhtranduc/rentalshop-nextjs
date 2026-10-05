/**
 * #435 — at most 5 photos per order note field (general, pickup, return, damage).
 * Installed apps send at most 3, so their requests must keep passing.
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
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';
import { bodyExceedsNoteImageLimit } from '../../apps/api/lib/image-compression';

const staffOutlet1 = {
  user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, email: 's@x' },
  userScope: { merchantId: 2, outletId: 1 },
};

const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://cdn.example/orders/n${i}.jpg`);
const file = () => ({ name: 'p.jpg', type: 'image/jpeg', size: 1000, arrayBuffer: async () => new ArrayBuffer(8) });

function putJson(body: any): any {
  return {
    url: 'http://localhost/api/orders/5',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

function putMultipart(fields: Record<string, any[]>): any {
  return {
    url: 'http://localhost/api/orders/5',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'multipart/form-data; boundary=x' : null) },
    formData: async () => ({
      get: (k: string) => (k === 'data' ? JSON.stringify({ notes: 'x' }) : null),
      getAll: (k: string) => fields[k] ?? [],
    }),
  };
}

function givenOrder(order: any = {}) {
  const base = {
    id: 5, orderNumber: 'ORD-001-0005', outletId: 1, customerId: null, totalAmount: 100000,
    orderType: 'RENT', status: 'RESERVED', orderItems: [], ...order,
  };
  mockDb.orders.findById.mockResolvedValue(base);
  mockDb.orders.findByIdDetail.mockImplementation(async () => ({ ...base, outlet: { name: 'Outlet 1' }, orderItems: [], payments: [] }));
}

describe('bodyExceedsNoteImageLimit (#435)', () => {
  it.each([
    [{ notesImages: urls(5) }, false],
    [{ notesImages: urls(6) }, true],
    [{ damageNotesImages: urls(6) }, true],
    [{ pickupNotesImages: urls(3), returnNotesImages: urls(3) }, false],
    [{ notesImages: 'not-an-array' }, false],
    [null, false],
  ])('%j → %s', (body, expected) => {
    expect(bodyExceedsNoteImageLimit(body)).toBe(expected);
  });
});

describe('PUT /api/orders/:id note photo limit (#435)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = staffOutlet1;
    mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
    mockDb.orders.update.mockImplementation(async (_id: number, data: any) => ({ id: 5, ...data }));
  });

  it('installed apps: JSON with 3 photos still saves', async () => {
    givenOrder();
    const res: any = await PUT(putJson({ notesImages: urls(3) }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalled();
  });

  it('JSON with 5 photos saves', async () => {
    givenOrder();
    const res: any = await PUT(putJson({ pickupNotesImages: urls(5) }), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
  });

  it('JSON with 6 photos is rejected with IMAGE_VALIDATION_FAILED and writes nothing', async () => {
    givenOrder();
    const res: any = await PUT(putJson({ returnNotesImages: urls(6) }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'IMAGE_VALIDATION_FAILED' }));
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('multipart: 3 saved + 3 new files is rejected before any upload', async () => {
    givenOrder({ notesImages: urls(3) });
    const { uploadToS3 } = jest.requireMock('@rentalshop/utils/server');
    const res: any = await PUT(putMultipart({ notesImages: [file(), file(), file()] }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('IMAGE_VALIDATION_FAILED');
    expect(uploadToS3).not.toHaveBeenCalled();
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('multipart: 4 saved damage photos + 2 new is rejected', async () => {
    givenOrder({ damageNotesImages: urls(4) });
    const res: any = await PUT(putMultipart({ damageNotesImages: [file(), file()] }), { params: { orderId: '5' } });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('IMAGE_VALIDATION_FAILED');
  });
});
