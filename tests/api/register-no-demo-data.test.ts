/**
 * #895 — a new account gets no demo data: POST /api/auth/register creates the merchant, default outlet,
 * default category, user and trial subscription, and no product, outlet stock, customer or order.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const writes = () => ({ create: jest.fn(async ({ data }: any) => ({ id: 9, ...data })), updateMany: jest.fn(async () => ({ count: 0 })) });
const mockSampleTables: any = {
  product: writes(),
  outletStock: writes(),
  customer: writes(),
  order: writes(),
  orderItem: writes(),
};
const mockTx: any = {
  ...mockSampleTables,
  merchant: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 2, ...data })) },
  outlet: { create: jest.fn(async ({ data }: any) => ({ id: 3, ...data })) },
  category: { create: jest.fn(async ({ data }: any) => ({ id: 4, ...data })) },
  user: { create: jest.fn(async ({ data }: any) => ({ id: 5, ...data })) },
  plan: { findFirst: jest.fn(async () => ({ id: 1, name: 'Trial', trialDays: 14 })) },
  subscription: { create: jest.fn(async ({ data }: any) => ({ id: 6, ...data })) },
};
const mockDb: any = {
  users: { findByEmail: jest.fn(async () => null) },
  merchants: { checkDuplicate: jest.fn(async () => null) },
  prisma: { $transaction: jest.fn(async (fn: any) => fn(mockTx)), ...mockSampleTables },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  prisma: mockSampleTables,
  createEmailVerification: jest.fn(async () => ({ token: 't' })),
  getLocalizedRegistrationDefaults: () => ({ outletName: 'Main', outletDescription: '', categoryName: 'General', categoryDescription: '' }),
  resolveOnboardingLocaleFromContext: () => 'vi',
}));
jest.mock('@rentalshop/utils', () => ({
  registerSchema: jest.requireActual('../../packages/utils/src/core/validation-schemas').registerSchema,
  sendVerificationEmail: jest.fn(async () => ({ success: true })),
  generateUniqueTenantKey: jest.fn(async () => 'shop'),
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 400 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));
jest.mock('@rentalshop/auth/server', () => ({ hashPassword: jest.fn(async () => 'hashed') }));

import { POST as register } from '../../apps/api/app/api/auth/register/route';

const BODY = {
  email: 'owner@shop.vn',
  password: 'secret123',
  name: 'Owner Name',
  businessName: 'Shop',
  phone: '0900000000',
  role: 'MERCHANT',
};
const req = (body: any): any => ({
  json: async () => body,
  cookies: { get: () => undefined },
  headers: { get: () => null },
});

describe('POST /api/auth/register creates no demo data (#895)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the shop, default outlet, default category, user and trial', async () => {
    const res: any = await register(req(BODY));
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION');
    expect(mockTx.merchant.create).toHaveBeenCalledTimes(1);
    expect(mockTx.outlet.create).toHaveBeenCalledTimes(1);
    expect(mockTx.outlet.create.mock.calls[0][0].data.isDefault).toBe(true);
    expect(mockTx.category.create).toHaveBeenCalledTimes(1);
    expect(mockTx.category.create.mock.calls[0][0].data.isDefault).toBe(true);
    expect(mockTx.user.create).toHaveBeenCalledTimes(1);
    expect(mockTx.subscription.create).toHaveBeenCalledTimes(1);
    expect(mockTx.subscription.create.mock.calls[0][0].data.trialEnd).toBeInstanceOf(Date);
  });

  it.each(['product', 'outletStock', 'customer', 'order', 'orderItem'])('creates no %s', async (table) => {
    await register(req(BODY));
    expect(mockSampleTables[table].create).not.toHaveBeenCalled();
    expect(mockSampleTables[table].updateMany).not.toHaveBeenCalled();
  });
});
