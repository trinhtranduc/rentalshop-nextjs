/**
 * #1199 staged deposits, the stage routes: collect (idempotent, race, roles), void, edit plan.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: (roles: string[]) => (handler: any) => (request: any) =>
    roles.includes(ctx.user.role)
      ? handler(request, ctx)
      : { body: { success: false, code: 'INSUFFICIENT_PERMISSIONS' }, status: 403 },
}));

const state: { current: any } = { current: null };
const mockDb: any = {
  orders: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
};
const mockPrismaHolder: { prisma: any } = { prisma: null };
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  get prisma() {
    return mockPrismaHolder.prisma;
  },
}));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (details: any) => ({ success: false, code: 'VALIDATION_ERROR', details }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));
const mockLogCustom = jest.fn(() => Promise.resolve());
jest.mock('@rentalshop/utils/server', () => ({ createAuditHelper: () => ({ logCustom: mockLogCustom }) }));

import { POST as collect } from '../../apps/api/app/api/orders/[orderId]/installments/[key]/collect/route';
import { POST as voidStage } from '../../apps/api/app/api/orders/[orderId]/installments/[key]/void/route';
import { PUT as editPlan } from '../../apps/api/app/api/orders/[orderId]/deposit-plan/route';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const as = (role: string, scope: any = { merchantId: 2 }) => ({ user: { id: 7, role, email: 'u@x' }, userScope: scope });
const req = (body: any): any => ({ json: async () => body, headers: { get: () => null } });
const params = (key?: string) => ({ params: { orderId: '10', ...(key ? { key } : {}) } }) as any;
const body = (amount: number, extra: any = {}) => ({ amount, method: 'CASH', reference: `ref-${Math.random().toString(36).slice(2, 12)}`, ...extra });

function setup(payments: any[] = [], order: any = planOrder(), shop: any = {}) {
  const fake = createFakeState(order, payments);
  const { prisma } = createFakePrisma(fake, shop);
  mockPrismaHolder.prisma = prisma;
  state.current = fake;
  mockDb.orders.findById.mockImplementation(async (id: number) => fake.orders.get(id) ?? null);
  mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
  return fake;
}

beforeEach(() => {
  jest.clearAllMocks();
  ctx = as('MERCHANT');
});

describe('collect a stage', () => {
  it('creates one INSTALLMENT payment, recomputes depositAmount and returns the stages', async () => {
    const fake = setup();
    const res: any = await collect(req(body(3_600_000, { reference: 'abc-12345-first' })), params('i1'));
    expect(res.status).toBe(201);
    expect(fake.payments).toHaveLength(1);
    expect(fake.payments[0]).toMatchObject({ notes: 'INSTALLMENT', installmentKey: 'i1', status: 'COMPLETED', amount: 3_600_000, type: 'ORDER_PAYMENT', merchantId: 2 });
    expect(fake.orders.get(10).depositAmount).toBe(3_600_000);
    expect(res.body.data.depositAmount).toBe(3_600_000);
    expect(res.body.data.installments.map((s: any) => [s.key, s.amount, s.status === 'PAID'])).toEqual([
      ['i1', 3_600_000, true],
      ['i2', 4_800_000, false],
      ['rest', 3_600_000, false],
    ]);
    expect(mockLogCustom).toHaveBeenCalledTimes(1);
  });

  it('is idempotent by reference: the second call returns the first payment and writes nothing', async () => {
    const fake = setup();
    const payload = body(3_600_000, { reference: 'same-reference-1' });
    await collect(req(payload), params('i1'));
    const again: any = await collect(req(payload), params('i1'));
    expect(again.status).toBe(200);
    expect(again.body.code).toBe('ORDER_PAYMENT_ALREADY_PROCESSED');
    expect(fake.payments).toHaveLength(1);
    expect(fake.orders.get(10).depositAmount).toBe(3_600_000);
    expect(mockLogCustom).toHaveBeenCalledTimes(1);
  });

  it('a different reference on a collected stage is 409 INSTALLMENT_ALREADY_PAID', async () => {
    setup([stagePayment('i1', 3_600_000)]);
    const res: any = await collect(req(body(3_600_000)), params('i1'));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSTALLMENT_ALREADY_PAID');
  });

  it('two requests racing for one stage: exactly one COMPLETED row, the other gets 409 (unique index)', async () => {
    const fake = setup();
    const [a, b]: any[] = await Promise.all([
      collect(req(body(3_600_000)), params('i1')),
      collect(req(body(3_600_000)), params('i1')),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(fake.payments.filter((p) => p.status === 'COMPLETED' && p.installmentKey === 'i1')).toHaveLength(1);
  });

  it('more than the stage is 400 INSTALLMENT_OVERPAID; less is allowed and the rest absorbs it', async () => {
    const fake = setup();
    const over: any = await collect(req(body(3_600_001)), params('i1'));
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('INSTALLMENT_OVERPAID');
    const part: any = await collect(req(body(3_000_000)), params('i1'));
    expect(part.status).toBe(201);
    expect(part.body.data.installments[0]).toMatchObject({ status: 'PARTIAL', amount: 3_000_000, plannedAmount: 3_600_000 });
    expect(part.body.data.installments[2].amount).toBe(4_200_000);
    expect(fake.orders.get(10).depositAmount).toBe(3_000_000);
  });

  it('unknown stage 404, order without a plan 400, cancelled order 400', async () => {
    setup();
    expect(((await collect(req(body(1000)), params('i9'))) as any).body.code).toBe('INSTALLMENT_NOT_FOUND');
    setup([], planOrder({ depositPlan: null }));
    expect(((await collect(req(body(1000)), params('i1'))) as any).body.code).toBe('INSTALLMENT_NO_PLAN');
    setup([], planOrder({ status: 'CANCELLED' }));
    expect(((await collect(req(body(1000)), params('i1'))) as any).body.code).toBe('INVALID_ORDER_STATUS');
  });

  it('collectedOn is stored as noon of that Vietnam day; a future day is refused', async () => {
    const fake = setup();
    const res: any = await collect(req(body(3_600_000, { collectedOn: '2026-10-24' })), params('i1'));
    expect(res.status).toBe(201);
    expect(fake.payments[0].processedAt.toISOString()).toBe('2026-10-24T05:00:00.000Z');
    expect(JSON.parse(fake.payments[0].metadata).collectedOn).toBe('2026-10-24');
    const future: any = await collect(req(body(3_600_000, { collectedOn: '2999-01-01' })), params('i2'));
    expect(future.status).toBe(400);
  });

  describe('roles', () => {
    it.each(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s collects cash in its own outlet', async (role) => {
      setup();
      ctx = as(role, { merchantId: 2, outletId: 1 });
      const res: any = await collect(req(body(3_600_000)), params('i1'));
      expect(res.status).toBe(201);
    });

    it('staff cannot use a method other than cash / transfer, nor back-date', async () => {
      const fake = setup();
      ctx = as('OUTLET_STAFF', { merchantId: 2, outletId: 1 });
      const check: any = await collect(req(body(3_600_000, { method: 'CHECK' })), params('i1'));
      expect(check.status).toBe(403);
      expect(check.body.code).toBe('INSTALLMENT_FORBIDDEN_ROLE');
      const old: any = await collect(req(body(3_600_000, { collectedOn: '2026-10-20' })), params('i1'));
      expect(old.status).toBe(403);
      expect(fake.payments).toHaveLength(0);
    });

    it('another shop and another outlet are 403 ACCESS_DENIED', async () => {
      setup();
      ctx = as('MERCHANT', { merchantId: 99 });
      expect(((await collect(req(body(1000)), params('i1'))) as any).status).toBe(403);
      ctx = as('OUTLET_STAFF', { merchantId: 2, outletId: 5 });
      expect(((await collect(req(body(1000)), params('i1'))) as any).body.code).toBe('ACCESS_DENIED');
    });
  });
});

describe('void a stage', () => {
  it('MERCHANT voids: payment CANCELLED, depositAmount back, slot free to collect again, audit written', async () => {
    const fake = setup([stagePayment('i1', 3_600_000)], planOrder({ depositAmount: 3_600_000 }));
    const res: any = await voidStage(req({ note: 'Nhập nhầm' }), params('i1'));
    expect(res.status).toBe(200);
    expect(fake.payments[0].status).toBe('CANCELLED');
    expect(fake.orders.get(10).depositAmount).toBe(0);
    expect(JSON.parse(fake.payments[0].metadata)).toMatchObject({ voidedBy: 7, voidNote: 'Nhập nhầm' });
    expect(mockLogCustom).toHaveBeenCalledWith(expect.objectContaining({ newValues: { stage: 'i1', status: 'CANCELLED', note: 'Nhập nhầm' } }));
    const again: any = await collect(req(body(3_600_000)), params('i1'));
    expect(again.status).toBe(201);
  });

  it.each(['OUTLET_ADMIN', 'OUTLET_STAFF'])('%s cannot void', async (role) => {
    const fake = setup([stagePayment('i1', 3_600_000)]);
    ctx = as(role, { merchantId: 2, outletId: 1 });
    expect(((await voidStage(req({}), params('i1'))) as any).status).toBe(403);
    expect(fake.payments[0].status).toBe('COMPLETED');
  });

  it('nothing collected for that key is 404', async () => {
    setup();
    expect(((await voidStage(req({}), params('i1'))) as any).body.code).toBe('INSTALLMENT_NOT_FOUND');
  });
});

describe('edit the plan of one order', () => {
  const items = [
    { key: 'i1', label: 'Cọc giữ chỗ', value: 20, dueRule: { kind: 'ON_CREATE' } },
    { label: 'Lần 2', value: 50, dueDateKey: '2026-11-10' },
  ];

  it('MERCHANT edits percentages and dates; keys are assigned; later stages recompute', async () => {
    const fake = setup();
    const res: any = await editPlan(req({ items }), params());
    expect(res.status).toBe(200);
    expect(res.body.data.installments.map((s: any) => [s.key, s.amount, s.dueDateKey])).toEqual([
      ['i1', 2_400_000, '2026-10-25'],
      ['i2', 6_000_000, '2026-11-10'],
      ['rest', 3_600_000, '2026-11-14'],
    ]);
    expect(fake.orders.get(10).depositPlan.items.map((i: any) => i.key)).toEqual(['i1', 'i2']);
    expect(mockLogCustom).toHaveBeenCalledTimes(1);
  });

  it('OUTLET_ADMIN may edit; staff may not', async () => {
    setup();
    ctx = as('OUTLET_ADMIN', { merchantId: 2, outletId: 1 });
    expect(((await editPlan(req({ items }), params())) as any).status).toBe(200);
    ctx = as('OUTLET_STAFF', { merchantId: 2, outletId: 1 });
    expect(((await editPlan(req({ items }), params())) as any).status).toBe(403);
  });

  it('more than 100% is refused', async () => {
    setup();
    const res: any = await editPlan(req({ items: [{ ...items[0], value: 70 }, { ...items[1], value: 60 }] }), params());
    expect(res.status).toBe(400);
  });

  it('a stage that was collected cannot be dropped', async () => {
    setup([stagePayment('i1', 3_600_000)]);
    const res: any = await editPlan(req({ items: [{ key: 'i2', label: 'x', value: 40, dueRule: { kind: 'ON_CREATE' } }] }), params());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSTALLMENT_ALREADY_PAID');
  });

  it('an order without a plan or after hand-over is refused', async () => {
    setup([], planOrder({ depositPlan: null }));
    expect(((await editPlan(req({ items }), params())) as any).body.code).toBe('INSTALLMENT_NO_PLAN');
    setup([], planOrder({ status: 'PICKUPED' }));
    expect(((await editPlan(req({ items }), params())) as any).body.code).toBe('INVALID_ORDER_STATUS');
  });
});
