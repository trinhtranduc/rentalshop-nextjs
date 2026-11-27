/**
 * #1688 an order RENT that was already returned (RETURNED) can be cancelled, by MERCHANT / OUTLET_ADMIN only (never OUTLET_STAFF /
 * OUTLET_INVENTORY), through PATCH /status and PUT. Money follows the cancel rule of today: no new money logic (a plain order only changes
 * status; a deposit-plan order records its refund as before). Then the cancelled order can be deleted (DELETE, #1199 rule unchanged).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const auditEntries: any[] = [];
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const holder: { prisma: any } = { prisma: null };
const mockDb: any = {
  orders: { findById: jest.fn(), update: jest.fn(), findByIdDetail: jest.fn(), softDelete: jest.fn() },
  outlets: { findById: jest.fn() },
  get prisma() {
    return holder.prisma;
  },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  get prisma() {
    return holder.prisma;
  },
}));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/legacy-plan-days'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e?.stack || e) }, statusCode: 500 }),
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
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve(), logDelete: () => Promise.resolve(), logCustom: (entry: any) => { auditEntries.push(entry); return Promise.resolve(); } }),
}));
jest.mock('@rentalshop/loyalty', () => ({
  adjustRedeemOnOrderEdit: jest.fn(),
  calculateAmountDue: jest.fn().mockReturnValue(0),
  getLoyaltyProgram: jest.fn(),
  handleLoyaltyOnCancel: jest.fn(),
  merchantHasLoyaltyFeature: jest.fn().mockResolvedValue(false),
  processEarnOnStatusChange: jest.fn(),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  ...jest.requireActual('../../apps/api/lib/image-compression'),
  compressImageTo1MB: jest.fn(),
}));
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletOrderEvent: jest.fn() }));

import { PATCH } from '../../apps/api/app/api/orders/[orderId]/status/route';
import { PUT, DELETE } from '../../apps/api/app/api/orders/[orderId]/route';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const as = (role: string) => ({ user: { id: 2, role, merchantId: 2, email: 'u@x' }, userScope: role.startsWith('OUTLET') ? { merchantId: 2, outletId: 1 } : { merchantId: 2 } });
const reqOf = (body: any, capabilities: string | null = null): any => ({
  url: 'http://localhost/api/orders/10',
  headers: { get: (k: string) => (k.toLowerCase() === 'x-client-capabilities' ? capabilities : k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});
const p = { params: { orderId: '10' } } as any;

let fake: ReturnType<typeof createFakeState>;
function setup(payments: any[], order: any = planOrder()) {
  fake = createFakeState(order, payments);
  holder.prisma = createFakePrisma(fake).prisma;
  const read = (id: number) => {
    const row = fake.orders.get(id);
    return row ? { ...row, payments: fake.payments.filter((x) => x.orderId === id) } : null;
  };
  mockDb.orders.findById.mockImplementation(async (id: number) => read(id));
  mockDb.orders.findByIdDetail.mockImplementation(async (id: number) => ({ ...read(id), outlet: { name: 'Main' }, orderItems: [] }));
  mockDb.orders.update.mockImplementation(async (id: number, data: any) => {
    fake.orders.set(id, { ...fake.orders.get(id), ...data });
    return read(id);
  });
  mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
}

beforeEach(() => {
  jest.clearAllMocks();
  auditEntries.length = 0;
  ctx = as('MERCHANT');
});

const collected = [stagePayment('i1', 3_600_000)];
const refundRows = () => fake.payments.filter((x) => x.notes === 'CANCEL_REFUND');
const returnedPlain = (extra: Record<string, any> = {}) => planOrder({ status: 'RETURNED', depositPlan: null, depositAmount: 500_000, ...extra });

describe.each([
  ['PATCH status', (body: any) => PATCH(reqOf({ status: 'CANCELLED', ...body }), p)],
  ['PUT', (body: any) => PUT(reqOf({ status: 'CANCELLED', ...body }), p)],
])('cancel a returned rental via %s (#1688)', (_name, call) => {
  it('MERCHANT: a plain returned rental becomes CANCELLED, no refund row is written (as cancelling today)', async () => {
    setup([], returnedPlain());
    const res: any = await call({});
    expect(res.status).toBe(200);
    expect(fake.orders.get(10).status).toBe('CANCELLED');
    expect(refundRows()).toHaveLength(0);
    expect(mockDb.orders.update).toHaveBeenCalledTimes(1);
  });

  it('OUTLET_ADMIN of the same outlet can too', async () => {
    ctx = as('OUTLET_ADMIN');
    setup([], returnedPlain());
    const res: any = await call({});
    expect(res.status).toBe(200);
    expect(fake.orders.get(10).status).toBe('CANCELLED');
  });

  it.each(['OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s cannot: 403 INSUFFICIENT_PERMISSIONS and nothing is written', async (role) => {
    ctx = as(role);
    setup([], returnedPlain());
    const res: any = await call({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockDb.orders.update).not.toHaveBeenCalled();
    expect(fake.orders.get(10).status).toBe('RETURNED');
  });

  it('OUTLET_STAFF still cancels a rental that is not returned yet (unchanged)', async () => {
    ctx = as('OUTLET_STAFF');
    setup([], planOrder({ status: 'PICKUPED', depositPlan: null }));
    const res: any = await call({});
    expect(res.status).toBe(200);
    expect(fake.orders.get(10).status).toBe('CANCELLED');
  });

  it('a returned rental with a deposit plan: the refund of what was collected is recorded as for any cancel', async () => {
    setup(collected, planOrder({ status: 'RETURNED', depositAmount: 3_600_000 }));
    const res: any = await call({});
    expect(res.status).toBe(200);
    const [refund] = refundRows();
    expect(refund).toMatchObject({ amount: 3_600_000, status: 'REFUNDED' });
  });
});

describe('RETURNED stays closed for every other change, and the cancelled order can be deleted (#1688)', () => {
  it.each(['RESERVED', 'PICKUPED'])('RETURNED → %s is still 400 INVALID_ORDER_STATUS', async (to) => {
    setup([], returnedPlain());
    const res: any = await PATCH(reqOf({ status: to }), p);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ORDER_STATUS');
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('after the cancel the MERCHANT can delete it; the OUTLET_STAFF cannot', async () => {
    setup([], returnedPlain());
    await PATCH(reqOf({ status: 'CANCELLED' }), p);
    ctx = as('OUTLET_STAFF');
    const denied: any = await DELETE(reqOf({}), p);
    expect(denied.status).toBe(403);
    ctx = as('MERCHANT');
    const done: any = await DELETE(reqOf({}), p);
    expect(done.status).toBe(200);
    expect(mockDb.orders.softDelete).toHaveBeenCalledWith(10);
  });
});
