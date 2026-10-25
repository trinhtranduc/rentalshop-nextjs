/**
 * #1199 PHẦN B — huỷ đơn có kế hoạch cọc: `cancelKeptAmount` / `cancelNote` (PATCH status và PUT), hoàn = đã thu − giữ,
 * app cũ không gửi số thì hoàn hết, nhân viên không giữ được tiền, đơn đã huỷ có giữ tiền không xoá được.
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

describe.each([
  ['PATCH status', (body: any) => PATCH(reqOf({ status: 'CANCELLED', ...body }), p)],
  ['PUT', (body: any) => PUT(reqOf({ status: 'CANCELLED', ...body }), p)],
])('cancel a plan order via %s', (_name, call) => {
  it('keeps part: refund payment for the rest, kept and cancelledAt stored, depositAmount follows', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    const res: any = await call({ cancelKeptAmount: 1_800_000, cancelNote: 'Khách huỷ muộn' });
    expect(res.status).toBe(200);
    const [refund] = refundRows();
    expect(refund).toMatchObject({ amount: 1_800_000, status: 'REFUNDED', notes: 'CANCEL_REFUND', description: 'Khách huỷ muộn', orderId: 10 });
    const order = fake.orders.get(10);
    expect(order.status).toBe('CANCELLED');
    expect(order.cancelKeptAmount).toBe(1_800_000);
    expect(order.cancelledAt).toBeInstanceOf(Date);
    expect(refund.processedAt).toEqual(order.cancelledAt);
    expect(order.depositAmount).toBe(1_800_000);
    expect(auditEntries.at(-1).description).toContain('kept 1800000, refunded 1800000');
  });

  it('keeps nothing (0): everything goes back', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    expect(((await call({ cancelKeptAmount: 0 })) as any).status).toBe(200);
    expect(refundRows().map((x) => x.amount)).toEqual([3_600_000]);
    expect(fake.orders.get(10)).toMatchObject({ cancelKeptAmount: 0, depositAmount: 0 });
  });

  it('keeps all: no refund payment', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    expect(((await call({ cancelKeptAmount: 3_600_000 })) as any).status).toBe(200);
    expect(refundRows()).toHaveLength(0);
    expect(fake.orders.get(10)).toMatchObject({ cancelKeptAmount: 3_600_000, depositAmount: 3_600_000 });
  });

  it('old app (no amounts): everything is refunded and the audit log says so', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    expect(((await call({})) as any).status).toBe(200);
    expect(refundRows().map((x) => x.amount)).toEqual([3_600_000]);
    expect(fake.orders.get(10).cancelKeptAmount).toBe(0);
    expect(auditEntries.at(-1).description).toContain('client sent no amounts: everything refunded');
  });

  it.each([[3_600_001], [-1]])('kept %p: 400 CANCEL_AMOUNTS_MISMATCH, nothing changes', async (kept) => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    const res: any = await call({ cancelKeptAmount: kept });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CANCEL_AMOUNTS_MISMATCH');
    expect(mockDb.orders.update).not.toHaveBeenCalled();
    expect(refundRows()).toHaveLength(0);
  });

  it('OUTLET_ADMIN may keep money; staff may not (403), but staff can cancel and refund everything', async () => {
    ctx = as('OUTLET_ADMIN');
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    expect(((await call({ cancelKeptAmount: 1_000_000 })) as any).status).toBe(200);

    for (const role of ['OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      mockDb.orders.update.mockClear();
      ctx = as(role);
      setup(collected, planOrder({ depositAmount: 3_600_000 }));
      const denied: any = await call({ cancelKeptAmount: 1 });
      expect(denied.status).toBe(403);
      expect(denied.body.code).toBe('INSTALLMENT_FORBIDDEN_ROLE');
      expect(mockDb.orders.update).not.toHaveBeenCalled();
      mockDb.orders.update.mockClear();
      setup(collected, planOrder({ depositAmount: 3_600_000 }));
      expect(((await call({})) as any).status).toBe(200);
      expect(refundRows().map((x) => x.amount)).toEqual([3_600_000]);
    }
  });

  it('a plan order with nothing collected: cancels, no refund payment, kept 0', async () => {
    setup([], planOrder());
    expect(((await call({ cancelKeptAmount: 0 })) as any).status).toBe(200);
    expect(refundRows()).toHaveLength(0);
    expect(fake.orders.get(10).cancelKeptAmount).toBe(0);
  });

  it('an order without a plan: kept must be 0 (nothing was collected in stages); a plain cancel is as before', async () => {
    setup([], planOrder({ depositPlan: null, depositAmount: 500_000 }));
    const bad: any = await call({ cancelKeptAmount: 100 });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('CANCEL_AMOUNTS_MISMATCH');
    setup([], planOrder({ depositPlan: null, depositAmount: 500_000 }));
    expect(((await call({})) as any).status).toBe(200);
    expect(fake.payments).toHaveLength(0);
    expect(fake.orders.get(10).depositAmount).toBe(500_000);
    expect(fake.orders.get(10).cancelKeptAmount).toBeUndefined();
  });

  it('the cancellation amounts never reach the update of other fields', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    await call({ cancelKeptAmount: 1_800_000, cancelNote: 'x' });
    const data = mockDb.orders.update.mock.calls[0][1];
    expect(data).not.toHaveProperty('cancelNote');
    expect(data).not.toHaveProperty('cancelKeptAmount');
  });
});

describe('a client with `installments` sees the result; an old one does not', () => {
  it('PATCH response: cancelKeptAmount and cancelledAt only for the capable client', async () => {
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    const capable: any = await PATCH(reqOf({ status: 'CANCELLED', cancelKeptAmount: 1_800_000 }, 'installments'), p);
    expect(capable.body.data.cancelKeptAmount).toBe(1_800_000);
    expect(typeof capable.body.data.cancelledAt).toBe('string');
    setup(collected, planOrder({ depositAmount: 3_600_000 }));
    const old: any = await PATCH(reqOf({ status: 'CANCELLED' }), p);
    expect(old.body.data).not.toHaveProperty('cancelKeptAmount');
    expect(old.body.data).not.toHaveProperty('cancelledAt');
  });
});

describe('deleting a cancelled order that kept money', () => {
  it('is refused with CANCELLED_ORDER_KEEPS_AMOUNT (also for ADMIN); without kept money it works', async () => {
    for (const role of ['MERCHANT', 'ADMIN']) {
      ctx = as(role);
      setup(collected, planOrder({ status: 'CANCELLED', cancelKeptAmount: 1_800_000 }));
      const res: any = await DELETE(reqOf({}), p);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CANCELLED_ORDER_KEEPS_AMOUNT');
      expect(mockDb.orders.softDelete).not.toHaveBeenCalled();
    }
    ctx = as('MERCHANT');
    setup(collected, planOrder({ status: 'CANCELLED', cancelKeptAmount: 0 }));
    const ok: any = await DELETE(reqOf({}), p);
    expect(ok.status).toBe(200);
    expect(mockDb.orders.softDelete).toHaveBeenCalled();
  });
});

describe('batch delete', () => {
  it('refuses when one of the cancelled orders kept money (nothing is deleted)', async () => {
    jest.resetModules();
    const findMany = jest.fn(async () => [
      { id: 1, orderNumber: '111111', status: 'CANCELLED', cancelKeptAmount: 0, outletId: 1, outlet: { merchantId: 2 } },
      { id: 2, orderNumber: '222222', status: 'CANCELLED', cancelKeptAmount: 500, outletId: 1, outlet: { merchantId: 2 } },
    ]);
    const transaction = jest.fn();
    jest.doMock('@rentalshop/database', () => ({ db: {}, prisma: { order: { findMany }, $transaction: transaction } }));
    jest.doMock('@rentalshop/utils', () => ({
      ResponseBuilder: { error: (code: string) => ({ success: false, code }), validationError: () => ({ success: false }) },
      handleApiError: () => ({ response: {}, statusCode: 500 }),
    }));
    const { POST } = require('../../apps/api/app/api/orders/batch-delete/route');
    ctx = as('MERCHANT');
    const res: any = await POST({ json: async () => ({ orderIds: [1, 2] }), headers: { get: () => null } });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CANCELLED_ORDER_KEEPS_AMOUNT');
    expect(res.body.data.keptOrderIds).toEqual([2]);
    expect(transaction).not.toHaveBeenCalled();
  });
});
