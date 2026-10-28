/**
 * #1199 P6 — POST /api/payments/process (the installed Android app) on an order with a deposit plan:
 * PICKUP collections still work (they are the `rest` stage), staff cannot refund money (collateral refunds, notes
 * RETURN_ADJUSTMENT, still work), and the notes that belong to the stage routes cannot be written here.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
}));
const holder: { prisma: any } = { prisma: null };
const mockDb: any = {
  orders: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
  payments: { findFirst: jest.fn(), create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  get prisma() {
    return holder.prisma;
  },
}));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));
jest.mock('@rentalshop/utils/server', () => ({ createAuditHelper: () => ({ logCustom: () => Promise.resolve() }) }));

import { POST } from '../../apps/api/app/api/payments/process/route';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const as = (role: string) => ({ user: { id: 9, role, email: 's@x' }, userScope: { merchantId: 2, outletId: role.startsWith('OUTLET') ? 1 : undefined } });
const req = (body: any): any => ({ json: async () => body, headers: { get: () => null } });
const body = (extra: any = {}) => ({ orderId: 10, amount: 100_000, method: 'CASH', reference: 'ref-abcdef-01', ...extra });
let fake: ReturnType<typeof createFakeState>;

beforeEach(() => {
  jest.clearAllMocks();
  fake = createFakeState(planOrder({ depositAmount: 3_600_000 }), [stagePayment('i1', 3_600_000)]);
  holder.prisma = createFakePrisma(fake).prisma;
  mockDb.orders.findById.mockImplementation(async () => ({ ...fake.orders.get(10), payments: fake.payments }));
  mockDb.outlets.findById.mockResolvedValue({ id: 1, merchantId: 2 });
  mockDb.payments.findFirst.mockResolvedValue(null);
  mockDb.payments.create.mockImplementation(async (data: any) => ({ id: 99, ...data }));
  ctx = as('OUTLET_STAFF');
});

it('PICKUP collection from the old Android app still works on a plan order', async () => {
  const res: any = await POST(req(body({ notes: 'PICKUP', amount: 8_400_000 })));
  expect(res.status).toBe(201);
  expect(fake.orders.get(10).depositAmount).toBe(3_600_000); // PICKUP is never part of the deposit
});

it.each(['OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s cannot refund money on a plan order, but can return collateral (RETURN_ADJUSTMENT)', async (role) => {
  ctx = as(role);
  const refused: any = await POST(req(body({ kind: 'REFUND', notes: 'refund' })));
  expect(refused.status).toBe(403);
  expect(refused.body.code).toBe('INSTALLMENT_FORBIDDEN_ROLE');
  expect(mockDb.payments.create).not.toHaveBeenCalled();
  const collateral: any = await POST(req(body({ kind: 'REFUND', notes: 'RETURN_ADJUSTMENT' })));
  expect(collateral.status).toBe(201);
});

it('MERCHANT can still refund on a plan order', async () => {
  ctx = as('MERCHANT');
  expect(((await POST(req(body({ kind: 'REFUND', notes: 'x' })))) as any).status).toBe(201);
});

it('staff refund on an order WITHOUT a plan is as before', async () => {
  fake.orders.set(10, { ...fake.orders.get(10), depositPlan: null });
  expect(((await POST(req(body({ kind: 'REFUND', notes: 'x' })))) as any).status).toBe(201);
});

it.each(['INSTALLMENT', 'CANCEL_REFUND'])('notes %s cannot be written through this route', async (notes) => {
  const res: any = await POST(req(body({ notes })));
  expect(res.status).toBe(400);
  expect(mockDb.payments.create).not.toHaveBeenCalled();
});
