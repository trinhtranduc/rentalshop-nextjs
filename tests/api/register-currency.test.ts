/**
 * #1143 — a new shop gets its currency once, at sign-up, from the sign-up language (vi → VND, any other → USD).
 * Before, the merchant kept the column default USD and only the web Settings auto-sync (removed) made it VND.
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
  prisma: {
    $transaction: jest.fn(async (fn: any) => fn(mockTx)),
    user: { findUnique: jest.fn(async () => null) },
  },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  createEmailVerification: jest.fn(async () => ({ token: 't' })),
  getLocalizedRegistrationDefaults: () => ({ outletName: 'Main', outletDescription: '', categoryName: 'General', categoryDescription: '' }),
  resolveOnboardingLocaleFromContext: jest.requireActual('../../packages/database/src/onboarding-seed-i18n')
    .resolveOnboardingLocaleFromContext,
}));
jest.mock('@rentalshop/utils', () => {
  const schemas = jest.requireActual('../../packages/utils/src/core/validation-schemas');
  return {
    registerSchema: schemas.registerSchema,
    merchantGoogleRegisterSchema: schemas.merchantGoogleRegisterSchema,
    sendVerificationEmail: jest.fn(async () => ({ success: true })),
    generateUniqueTenantKey: jest.fn(async () => 'shop'),
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 400 }),
    ResponseBuilder: {
      error: (code: string) => ({ success: false, code }),
      success: (code: string, data: any) => ({ success: true, code, data }),
    },
  };
});
jest.mock('@rentalshop/utils/server', () => ({ buildSimpleCorsHeaders: () => ({}) }));
jest.mock('@rentalshop/auth/server', () => ({ hashPassword: jest.fn(async () => 'hashed') }));
jest.mock('../../apps/api/lib/verify-google-id-token', () => ({
  verifyGoogleIdToken: jest.fn(async () => ({ email: 'owner@gmail.com', sub: 'g-1', given_name: 'Owner' })),
}));
jest.mock('../../apps/api/lib/build-auth-login-response', () => ({
  buildAuthLoginSuccessResponse: jest.fn(async () => ({ body: { success: true }, status: 200 })),
}));

import { POST as register } from '../../apps/api/app/api/auth/register/route';
import { POST as registerGoogle } from '../../apps/api/app/api/auth/register/merchant-google/route';

const BODY = {
  email: 'owner@shop.vn',
  password: 'secret123',
  name: 'Owner Name',
  businessName: 'Shop',
  phone: '0900000000',
  role: 'MERCHANT',
};
const GOOGLE_BODY = { idToken: 'x'.repeat(30), businessName: 'Shop', phone: '0900000000' };

const req = (body: any, opts: { cookie?: string; acceptLanguage?: string } = {}): any => ({
  json: async () => body,
  cookies: { get: (name: string) => (name === 'NEXT_LOCALE' && opts.cookie ? { value: opts.cookie } : undefined) },
  headers: { get: (name: string) => (name.toLowerCase() === 'accept-language' ? opts.acceptLanguage ?? null : null) },
});

const createdCurrency = () => mockTx.merchant.create.mock.calls[0][0].data.currency;

describe('sign-up sets the shop currency from the sign-up language (#1143)', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client';
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findByEmail.mockReset().mockResolvedValueOnce(null).mockResolvedValue({ id: 5, email: 'owner@gmail.com' });
  });

  const cases: Array<[string, any, { cookie?: string; acceptLanguage?: string }, 'VND' | 'USD']> = [
    ['body locale vi', { locale: 'vi' }, {}, 'VND'],
    ['body locale en', { locale: 'en' }, {}, 'USD'],
    ['body locale ja (any other language)', { locale: 'ja' }, {}, 'USD'],
    ['NEXT_LOCALE cookie ko, no body locale', {}, { cookie: 'ko' }, 'USD'],
    ['old app: Accept-Language vi only', {}, { acceptLanguage: 'vi' }, 'VND'],
    ['old app: Accept-Language en only', {}, { acceptLanguage: 'en' }, 'USD'],
    ['no language signal at all', {}, {}, 'VND'],
  ];

  it.each(cases)('POST /api/auth/register — %s', async (_name, extra, opts, expected) => {
    const res: any = await register(req({ ...BODY, ...extra }, opts));
    expect(res.status).toBe(201);
    expect(mockTx.merchant.create).toHaveBeenCalledTimes(1);
    expect(createdCurrency()).toBe(expected);
  });

  it.each(cases)('POST /api/auth/register/merchant-google — %s', async (_name, extra, opts, expected) => {
    const res: any = await registerGoogle(req({ ...GOOGLE_BODY, ...extra }, opts));
    expect(res.status).toBe(200);
    expect(mockTx.merchant.create).toHaveBeenCalledTimes(1);
    expect(createdCurrency()).toBe(expected);
  });
});
