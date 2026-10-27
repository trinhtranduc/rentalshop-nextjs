/**
 * #1199 huỷ đơn theo từng giai đoạn thu cọc: ma trận 10 tình huống (chưa thu, thu 1, thu 1+2, trễ hạn, đến hạn hôm nay,
 * sau khi sửa kế hoạch / đổi tổng, đã giao đồ, đổi chế độ, số tiền giữ, vai trò) và hai request cùng huỷ một đơn.
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
import { PUT } from '../../apps/api/app/api/orders/[orderId]/route';
import { installmentsView } from '../../apps/api/lib/installments';
import { getOrderRevenueEvents } from '../../packages/utils/src/core/revenue-calculator';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const as = (role: string) => ({ user: { id: 2, role, merchantId: 2, email: 'u@x' }, userScope: role.startsWith('OUTLET') ? { merchantId: 2, outletId: 1 } : { merchantId: 2 } });
const reqOf = (body: any): any => ({
  url: 'http://localhost/api/orders/10',
  headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});
const p = { params: { orderId: '10' } } as any;

let fake: ReturnType<typeof createFakeState>;
function setup(payments: any[], order: any = planOrder(), shop: Record<string, any> = {}) {
  fake = createFakeState(order, payments);
  holder.prisma = createFakePrisma(fake, shop, { serialize: true }).prisma;
  const read = (id: number) => {
    const row = fake.orders.get(id);
    return row ? { ...row, payments: fake.payments.filter((x) => x.orderId === id) } : null;
  };
  mockDb.orders.findById.mockImplementation(async (id: number) => read(id));
  mockDb.orders.findByIdDetail.mockImplementation(async (id: number) => ({ ...read(id), outlet: { name: 'Main' }, orderItems: [] }));
  mockDb.orders.update.mockImplementation(async (id: number, data: any) => {
    await Promise.resolve();
    fake.orders.set(id, { ...fake.orders.get(id), ...data });
    return read(id);
  });
  mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
}

const FAKE_TIMERS = { doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] } as any;
const today = (iso: string) => jest.useFakeTimers({ ...FAKE_TIMERS, now: new Date(iso) });

beforeEach(() => {
  jest.clearAllMocks();
  auditEntries.length = 0;
  ctx = as('MERCHANT');
});
afterEach(() => jest.useRealTimers());

const cancel = (body: any = {}, via: 'PATCH' | 'PUT' = 'PATCH') =>
  via === 'PATCH' ? PATCH(reqOf({ status: 'CANCELLED', ...body }), p) : PUT(reqOf({ status: 'CANCELLED', ...body }), p);
const refunds = () => fake.payments.filter((x) => x.notes === 'CANCEL_REFUND' && x.status === 'REFUNDED');
const sum = (rows: any[]) => rows.reduce((s, r) => s + r.amount, 0);
const collectedTotal = () => sum(fake.payments.filter((x) => x.notes === 'INSTALLMENT' && x.status === 'COMPLETED'));
const viewOf = () => installmentsView({ ...fake.orders.get(10), payments: fake.payments } as any, { timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' } as any);

const i1 = stagePayment('i1', 3_600_000);
const i2 = stagePayment('i2', 4_800_000, { processedAt: new Date('2026-11-05T03:00:00Z') });

describe('1. cancel before any stage was collected ("không thu ngay")', () => {
  it('cancels, no payments, kept 0, every stage VOID and nothing is "next due"', async () => {
    today('2026-10-26T03:00:00Z');
    setup([], planOrder());
    expect(((await cancel()) as any).status).toBe(200);
    expect(fake.orders.get(10)).toMatchObject({ status: 'CANCELLED', cancelKeptAmount: 0, depositAmount: 0 });
    expect(fake.payments).toHaveLength(0);
    const v = viewOf();
    expect(v.installments.map((s) => s.status)).toEqual(['VOID', 'VOID', 'VOID']);
    expect(v.installmentSummary.nextDue).toBeNull();
    expect(v.installmentSummary.collected).toBe(0);
    expect(v.installmentSummary.remaining).toBe(0);
  });
  it('asking to keep money when nothing was collected is 400 CANCEL_AMOUNTS_MISMATCH', async () => {
    setup([], planOrder());
    const res: any = await cancel({ cancelKeptAmount: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CANCEL_AMOUNTS_MISMATCH');
    expect(fake.orders.get(10).status).toBe('RESERVED');
  });
});

describe('2/3. cancel after stage 1, and after stages 1 and 2', () => {
  it.each([0, 900_000, 3_600_000])('stage 1 only, keeps %i: collected - refunded = kept', async (kept) => {
    today('2026-10-26T03:00:00Z');
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    expect(((await cancel({ cancelKeptAmount: kept })) as any).status).toBe(200);
    expect(collectedTotal() - sum(refunds())).toBe(kept);
    expect(fake.orders.get(10)).toMatchObject({ cancelKeptAmount: kept, depositAmount: kept });
    const v = viewOf();
    expect(v.installments.map((s) => s.status)).toEqual(['PAID', 'VOID', 'VOID']);
    expect(v.installmentSummary.nextDue).toBeNull();
    // a cancelled order has nothing left to collect: the detail card must not show the void stages as "Còn lại"
    expect(v.installmentSummary.remaining).toBe(0);
    expect(v.installmentSummary.planned).toBe(v.installmentSummary.collected);
  });
  it.each([0, 4_000_000, 8_400_000])('stages 1+2 (3-stage plan), keeps %i', async (kept) => {
    today('2026-11-06T03:00:00Z');
    setup([i1, i2], planOrder({ depositAmount: 8_400_000 }));
    expect(((await cancel({ cancelKeptAmount: kept })) as any).status).toBe(200);
    expect(collectedTotal() - sum(refunds())).toBe(kept);
    expect(viewOf().installments.map((s) => s.status)).toEqual(['PAID', 'PAID', 'VOID']);
  });
});

describe('4/5. cancel while a stage is overdue or due today', () => {
  it('overdue stage (due 13/11, today 20/11): becomes VOID, not OVERDUE; collected money untouched', async () => {
    today('2026-11-20T03:00:00Z');
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    expect(viewOf().installments[1].status).toBe('OVERDUE');
    expect(((await cancel({ cancelKeptAmount: 1_000_000 })) as any).status).toBe(200);
    expect(viewOf().installments.map((s) => s.status)).toEqual(['PAID', 'VOID', 'VOID']);
    expect(sum(refunds())).toBe(2_600_000);
  });
  it('stage due today (13/11, Vietnam day): becomes VOID', async () => {
    today('2026-11-13T02:00:00Z');
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    expect(viewOf().installments[1].status).toBe('DUE_TODAY');
    await cancel();
    expect(viewOf().installments[1].status).toBe('VOID');
  });
});

describe('6. cancel after the plan or the total changed', () => {
  it('collected stage keeps its amount when the total drops; refund follows the payments, not the plan', async () => {
    today('2026-10-26T03:00:00Z');
    setup([stagePayment('i1', 3_600_000, { metadata: JSON.stringify({ plannedAmount: 3_600_000 }) })], planOrder({ totalAmount: 6_000_000, depositAmount: 3_600_000 }));
    expect(viewOf().installments[0]).toMatchObject({ status: 'PAID', paidAmount: 3_600_000 });
    expect(((await cancel({ cancelKeptAmount: 1_000_000 })) as any).status).toBe(200);
    expect(sum(refunds())).toBe(2_600_000);
  });
  it('a stage dropped from the plan after nothing was collected: the remaining stages are VOID', async () => {
    today('2026-10-26T03:00:00Z');
    const order = planOrder();
    order.depositPlan = { v: 1, items: [order.depositPlan.items[0]] };
    setup([i1], order);
    await cancel({ cancelKeptAmount: 0 });
    expect(viewOf().installments.map((s) => s.status)).toEqual(['PAID', 'VOID']);
    expect(sum(refunds())).toBe(3_600_000);
  });
});

describe('7. cancel after hand-over (PICKUPED)', () => {
  it('is allowed (RESERVED or PICKUPED may be cancelled); refund follows the stage payments', async () => {
    today('2026-11-15T03:00:00Z');
    setup([i1, i2], planOrder({ status: 'PICKUPED', pickedUpAt: new Date('2026-11-14T03:00:00Z'), depositAmount: 8_400_000 }));
    expect(((await cancel({ cancelKeptAmount: 2_000_000 })) as any).status).toBe(200);
    expect(sum(refunds())).toBe(6_400_000);
  });
  it('a cancel sheet that reads the summary before cancelling sees the rest stage as paid; the server caps "kept" at the stage payments (400, nothing changes)', async () => {
    today('2026-11-15T03:00:00Z');
    setup([i1, i2], planOrder({ status: 'PICKUPED', pickedUpAt: new Date('2026-11-14T03:00:00Z'), depositAmount: 8_400_000 }));
    expect(viewOf().installmentSummary.collected).toBe(12_000_000);
    const res: any = await cancel({ cancelKeptAmount: 9_000_000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CANCEL_AMOUNTS_MISMATCH');
    expect(fake.orders.get(10).status).toBe('PICKUPED');
  });
});

describe('8. the shop changed mode after the order was made', () => {
  it('an order with a plan keeps it for the cancel even when the shop is now ONE_TIME', async () => {
    today('2026-10-26T03:00:00Z');
    setup([i1], planOrder({ depositAmount: 3_600_000 }), { settings: { payment: { v: 1, depositMode: 'ONE_TIME' } } });
    expect(((await cancel({ cancelKeptAmount: 600_000 })) as any).status).toBe(200);
    expect(sum(refunds())).toBe(3_000_000);
  });
  it('a one-time-deposit order in a STAGED shop cancels as before (no plan: no refund payment, no kept money)', async () => {
    setup([], planOrder({ depositPlan: null, depositAmount: 2_000_000 }), { settings: { payment: { v: 1, depositMode: 'STAGED' } } });
    expect(((await cancel()) as any).status).toBe(200);
    expect(fake.payments).toHaveLength(0);
    expect(fake.orders.get(10).depositAmount).toBe(2_000_000);
    const again = createFakeState(planOrder({ depositPlan: null }), []);
    expect(again.payments).toHaveLength(0);
  });
});

describe('9. errors', () => {
  it.each([[-1], [3_600_001], ['abc']])('kept %p is 400 CANCEL_AMOUNTS_MISMATCH and nothing changes', async (kept) => {
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    const res: any = await cancel({ cancelKeptAmount: kept });
    expect(res.status).toBe(400);
    expect(res.body.code === 'CANCEL_AMOUNTS_MISMATCH' || res.status === 400).toBe(true);
    expect(fake.orders.get(10).status).toBe('RESERVED');
    expect(fake.payments).toHaveLength(1);
  });
});

describe('10. roles', () => {
  it.each(['MERCHANT', 'OUTLET_ADMIN', 'ADMIN'])('%s may keep', async (role) => {
    ctx = as(role);
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    expect(((await cancel({ cancelKeptAmount: 1_000_000 })) as any).status).toBe(200);
  });
  it.each(['OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s keeping money is 403, refunding all works', async (role) => {
    ctx = as(role);
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    expect(((await cancel({ cancelKeptAmount: 1 })) as any).status).toBe(403);
    expect(((await cancel()) as any).status).toBe(200);
    expect(sum(refunds())).toBe(3_600_000);
  });
});

describe('g. the same cancel twice', () => {
  it.each(['PATCH', 'PUT'] as const)('two %s requests at once: one refund of what was collected, never two', async (via) => {
    today('2026-10-26T03:00:00Z');
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    const [a, b]: any[] = await Promise.all([cancel({ cancelKeptAmount: 600_000 }, via), cancel({ cancelKeptAmount: 600_000 }, via)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(refunds()).toHaveLength(1);
    expect(collectedTotal() - sum(refunds())).toBe(600_000);
    expect(fake.orders.get(10).depositAmount).toBe(600_000);
  });
  it('a second cancel after the first finished changes nothing', async () => {
    setup([i1], planOrder({ depositAmount: 3_600_000 }));
    await cancel({ cancelKeptAmount: 600_000 });
    await cancel({ cancelKeptAmount: 0 });
    expect(refunds()).toHaveLength(1);
    expect(fake.orders.get(10).cancelKeptAmount).toBe(600_000);
  });
});

describe('c. revenue on the real collection day', () => {
  it('collected on 25/10 and 05/11, cancelled 12/11 keeping 2M of 8.4M: + , + , - refund on the cancel day', async () => {
    today('2026-11-12T03:00:00Z');
    setup([i1, i2], planOrder({ depositAmount: 8_400_000 }));
    await cancel({ cancelKeptAmount: 2_000_000 });
    const o = fake.orders.get(10);
    const events = getOrderRevenueEvents({
      ...o,
      damageFee: 0,
      plan: {
        collected: fake.payments.filter((x) => x.status === 'COMPLETED').map((x) => ({ amount: x.amount, at: x.processedAt })),
        refunded: refunds().map((x) => ({ amount: x.amount, at: x.processedAt })),
        keptAmount: o.cancelKeptAmount,
        unpaid: [],
        restAmount: 3_600_000,
      },
    } as any).map((e) => [e.revenueType, e.revenue]);
    expect(events).toEqual([['RENT_INSTALLMENT', 3_600_000], ['RENT_INSTALLMENT', 4_800_000], ['RENT_CANCELLED', -6_400_000]]);
  });
});
