/**
 * #567 phase 1 — POST /api/auth/register stores the registering device's zone on the new shop.
 * Lenient on purpose (installed apps cannot be updated): a valid `timezone` is stored; missing (old apps),
 * empty, unknown or not a string → Asia/Ho_Chi_Minh, and the register never answers 400 for this field.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockTx: any = {
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
  prisma: { $transaction: jest.fn(async (fn: any) => fn(mockTx)) },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  // demo data seeding is non-critical: make it fail fast without a database
  prisma: new Proxy({}, { get: () => ({ create: async () => { throw new Error('no db'); }, updateMany: async () => undefined }) }),
  createEmailVerification: jest.fn(async () => ({ token: 't' })),
  getLocalizedRegistrationDefaults: () => ({ outletName: 'Main', outletDescription: '', categoryName: 'General', categoryDescription: '' }),
  getSampleCopy: () => ({}),
  ONBOARDING_SAMPLE_MARKER: '[sample]',
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

describe('POST /api/auth/register timezone (#567)', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['the device zone Asia/Tokyo', { timezone: 'Asia/Tokyo' }, 'Asia/Tokyo'],
    ['the device zone America/New_York', { timezone: 'America/New_York' }, 'America/New_York'],
    ['a phone in Vietnam', { timezone: 'Asia/Ho_Chi_Minh' }, 'Asia/Ho_Chi_Minh'],
    ['no timezone (old apps)', {}, 'Asia/Ho_Chi_Minh'],
    ['an unknown zone', { timezone: 'Mars/Base' }, 'Asia/Ho_Chi_Minh'],
    ['an empty zone', { timezone: '' }, 'Asia/Ho_Chi_Minh'],
    ['a number', { timezone: 7 }, 'Asia/Ho_Chi_Minh'],
    ['null', { timezone: null }, 'Asia/Ho_Chi_Minh'],
  ])('%s → shop stored on %s, 201', async (_label, extra, stored) => {
    const res: any = await register(req({ ...BODY, ...extra }));
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION');
    expect(mockTx.merchant.create).toHaveBeenCalledTimes(1);
    expect(mockTx.merchant.create.mock.calls[0][0].data.timezone).toBe(stored);
  });

  it('the register response shape is unchanged', async () => {
    const res: any = await register(req({ ...BODY, timezone: 'Asia/Tokyo' }));
    expect(Object.keys(res.body.data.user.merchant).sort()).toEqual(['businessTags', 'businessType', 'id', 'name', 'pricingType']);
  });
});
