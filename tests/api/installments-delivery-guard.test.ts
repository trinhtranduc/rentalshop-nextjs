/**
 * #1199 — hand-over (status → PICKUPED) is blocked while an explicit deposit stage is unpaid; the `rest` stage never
 * blocks. Same answer for PATCH .../status and PUT (how the installed apps send status). The Android app shows `error`
 * before `message`, so `error` is empty and the Vietnamese sentence is in `message`.
 * Also: PUT never lets an old app overwrite depositAmount of a plan order, and the plan columns stay hidden from old clients.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const holder: { prisma: any } = { prisma: null };
const mockDb: any = {
  orders: { findById: jest.fn(), update: jest.fn(), findByIdDetail: jest.fn() },
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
  ResponseBuilder: { error: (code: string) => ({ success: false, code, message: code, error: code }) },
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
  createAuditHelper: () => ({ logUpdate: () => Promise.resolve(), logCustom: () => Promise.resolve() }),
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
import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';
import { POST as revert } from '../../apps/api/app/api/orders/[orderId]/revert/route';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const merchant = { user: { id: 2, role: 'MERCHANT', merchantId: 2, email: 'm@x' }, userScope: { merchantId: 2 } };
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
  ctx = merchant;
});

const bothPaid = [stagePayment('i1', 3_600_000), stagePayment('i2', 4_800_000)];

describe.each([
  ['PATCH status', (body: any) => PATCH(reqOf(body), p)],
  ['PUT', (body: any) => PUT(reqOf(body), p)],
])('hand-over guard via %s', (_name, call) => {
  it('unpaid explicit stages: 400 INSTALLMENT_UNPAID_AT_PICKUP, Vietnamese message, empty error, nothing written', async () => {
    setup([stagePayment('i1', 3_600_000)]);
    const res: any = await call({ status: 'PICKUPED' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: 'INSTALLMENT_UNPAID_AT_PICKUP',
      message: 'Đơn còn giai đoạn cọc chưa thu. Vui lòng thu trên web hoặc cập nhật ứng dụng.',
      error: '',
    });
    expect(res.body.data.unpaid.map((s: any) => s.key)).toEqual(['i2']);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('all explicit stages collected: hand-over works although `rest` is unpaid', async () => {
    setup(bothPaid, planOrder({ depositAmount: 8_400_000 }));
    const res: any = await call({ status: 'PICKUPED' });
    expect(res.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalled();
  });

  it('an order without a plan is never blocked', async () => {
    setup([], planOrder({ depositPlan: null, depositAmount: 500_000 }));
    expect(((await call({ status: 'PICKUPED' })) as any).status).toBe(200);
  });

  it('other status moves (cancel) are not blocked by the stages', async () => {
    setup([]);
    expect(((await call({ status: 'CANCELLED' })) as any).status).toBe(200);
  });
});

describe('PATCH status: hand-over time', () => {
  it('a hand-over time that is not a date is refused (it decides which stage payments count as "before delivery")', async () => {
    setup(bothPaid);
    const res: any = await PATCH(reqOf({ status: 'PICKUPED', pickedUpAt: 'not-a-date' }), p);
    expect(res.status).toBe(400);
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('depositAmount is recomputed after hand-over: a stage taken after the hand-over time is not "deposit"', async () => {
    setup(
      [stagePayment('i1', 3_600_000, { processedAt: new Date('2026-10-25T03:00:00Z') }), stagePayment('i2', 4_800_000, { processedAt: new Date('2026-11-14T08:00:00Z') })],
      planOrder({ depositAmount: 8_400_000 })
    );
    const res: any = await PATCH(reqOf({ status: 'PICKUPED', pickedUpAt: '2026-11-14T03:00:00Z' }), p);
    expect(res.status).toBe(200);
    expect(fake.orders.get(10).depositAmount).toBe(3_600_000);
  });
});

describe('PUT from an old app on a plan order', () => {
  it('ignores the depositAmount it sends and returns the correct one', async () => {
    setup([stagePayment('i1', 3_600_000)], planOrder({ depositAmount: 3_600_000 }));
    const res: any = await PUT(reqOf({ depositAmount: 0, notes: 'x' }), p);
    expect(res.status).toBe(200);
    expect(mockDb.orders.update.mock.calls[0][1]).not.toHaveProperty('depositAmount');
    expect(res.body.data.depositAmount).toBe(3_600_000);
  });

  it('an old app extending after hand-over (totalAmount up) is not refused', async () => {
    setup(bothPaid, planOrder({ status: 'PICKUPED', pickedUpAt: new Date('2026-11-14T03:00:00Z'), pickupTotalAmount: 12_000_000, depositAmount: 8_400_000 }));
    const res: any = await PUT(reqOf({ totalAmount: 12_600_000 }), p);
    expect(res.status).toBe(200);
  });

  it('a total below what was collected is 409 INSTALLMENT_OVERPAID before hand-over', async () => {
    setup(bothPaid, planOrder({ depositAmount: 8_400_000 }));
    const res: any = await PUT(reqOf({ totalAmount: 5_000_000 }), p);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSTALLMENT_OVERPAID');
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('a lower total recomputes unpaid stages (no refusal)', async () => {
    setup([stagePayment('i1', 3_600_000)], planOrder({ depositAmount: 3_600_000 }));
    expect(((await PUT(reqOf({ totalAmount: 10_000_000 }), p)) as any).status).toBe(200);
  });
});

describe('plan columns for old and new clients', () => {
  it('PUT response: no plan fields for an old client; stages for a capable one', async () => {
    setup([stagePayment('i1', 3_600_000)], planOrder({ depositAmount: 3_600_000 }));
    const old: any = await PUT(reqOf({ notes: 'x' }), p);
    expect(old.body.data).not.toHaveProperty('installments');
    expect(old.body.data).not.toHaveProperty('depositPlan');
    holder.prisma = createFakePrisma(fake).prisma;
    const capable: any = await PUT(reqOf({ notes: 'x' }, 'installments'), p);
    expect(capable.body.data.installments.map((s: any) => s.key)).toEqual(['i1', 'i2', 'rest']);
    expect(capable.body.data.installmentSummary.collected).toBe(3_600_000);
  });

  it('PATCH response drops depositPlan / cancelKeptAmount / cancelledAt for an old client', async () => {
    setup(bothPaid, planOrder({ cancelKeptAmount: null, cancelledAt: null }));
    const res: any = await PATCH(reqOf({ status: 'PICKUPED' }), p);
    expect(res.body.data).not.toHaveProperty('depositPlan');
    expect(res.body.data).not.toHaveProperty('cancelKeptAmount');
    expect(res.body.data).not.toHaveProperty('cancelledAt');
  });
});

describe('revert on a plan order (P8)', () => {
  it('restores notes but never the money columns, the plan or the cancelled state', async () => {
    setup([stagePayment('i1', 3_600_000)], planOrder({ depositAmount: 3_600_000 }));
    const prismaWithAudit = holder.prisma;
    prismaWithAudit.auditLog = {
      findFirst: jest.fn(async () => ({
        id: 1, action: 'UPDATE',
        details: JSON.stringify({ oldValues: { notes: 'cũ', depositAmount: 0, totalAmount: 1000, status: 'CANCELLED', depositPlan: null } }),
      })),
    };
    const res: any = await revert(reqOf({ auditLogId: 1 }), p);
    expect(res.status).toBe(200);
    const written = mockDb.orders.update.mock.calls[0][1];
    expect(written).toEqual({ notes: 'cũ' });
    expect(fake.orders.get(10).depositAmount).toBe(3_600_000);
  });
});
