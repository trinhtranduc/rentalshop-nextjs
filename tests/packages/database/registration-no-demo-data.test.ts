/**
 * #895 — registerUser / registerMerchantWithTrial (packages/database/src/registration.ts) create no demo data,
 * even where the old onboarding sample was on (dev, staging, ENABLE_ONBOARDING_SAMPLE=true).
 */
const writes = () => ({
  create: jest.fn(async ({ data }: any) => ({ id: 9, ...data })),
  findFirst: jest.fn(async () => null),
});
const mockSampleTables: any = { product: writes(), outletStock: writes(), customer: writes(), order: writes(), orderItem: writes() };
const mockTx: any = {
  ...mockSampleTables,
  merchant: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 2, ...data })) },
  outlet: { create: jest.fn(async ({ data }: any) => ({ id: 3, ...data })) },
  category: { create: jest.fn(async ({ data }: any) => ({ id: 4, ...data })) },
  user: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 5, ...data })) },
  plan: { findFirst: jest.fn(async () => ({ id: 1, name: 'Trial', trialDays: 14 })) },
  subscription: { create: jest.fn(async ({ data }: any) => ({ id: 6, ...data })) },
  loyaltyProgram: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 7, ...data })) },
  loyaltyTier: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({ id: 8 })) },
};
jest.mock('../../../packages/database/src/client', () => ({
  prisma: { $transaction: jest.fn(async (fn: any) => fn(mockTx)) },
}));
jest.mock('../../../packages/database/src/user', () => ({ createUser: jest.fn() }));
jest.mock('../../../packages/database/src/subscription', () => ({ createSubscription: jest.fn() }));
jest.mock('@rentalshop/auth/server', () => ({ hashPassword: jest.fn(async () => 'hashed') }));
jest.mock('@rentalshop/utils', () => ({ generateUniqueTenantKey: jest.fn(async () => 'shop') }));

import { registerUser } from '../../../packages/database/src/registration';

describe('registerUser creates no demo data (#895)', () => {
  const env = process.env.ENABLE_ONBOARDING_SAMPLE;
  beforeAll(() => { process.env.ENABLE_ONBOARDING_SAMPLE = 'true'; });
  afterAll(() => { if (env === undefined) delete process.env.ENABLE_ONBOARDING_SAMPLE; else process.env.ENABLE_ONBOARDING_SAMPLE = env; });

  it('a merchant sign-up creates the shop, default outlet, default category, user and trial, and no product, customer or order', async () => {
    const res = await registerUser({ email: 'owner@shop.vn', password: 'secret123', name: 'Owner Name', businessName: 'Shop', phone: '0900000000', role: 'MERCHANT' });
    expect(res.success).toBe(true);
    expect(mockTx.merchant.create).toHaveBeenCalledTimes(1);
    expect(mockTx.outlet.create.mock.calls[0][0].data.isDefault).toBe(true);
    expect(mockTx.category.create.mock.calls[0][0].data.isDefault).toBe(true);
    expect(mockTx.user.create).toHaveBeenCalledTimes(1);
    expect(mockTx.subscription.create).toHaveBeenCalledTimes(1);
    for (const table of Object.keys(mockSampleTables)) {
      expect({ table, creates: mockSampleTables[table].create.mock.calls.length }).toEqual({ table, creates: 0 });
    }
  });
});
