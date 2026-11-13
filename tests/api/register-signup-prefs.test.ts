/**
 * #1539 — sign-up picks the country, the shop language (vi / en) and the currency (VND / USD).
 * The language drives the sample outlet/category copy, `Merchant.language` (emails) and the verification email.
 * Bodies without the new fields (installed apps, old tabs) keep the #1143 rules.
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
  // echoes the seed language so the test sees which one was used
  getLocalizedRegistrationDefaults: (name: string, locale: string) => ({
    outletName: `${name} [${locale}]`,
    outletDescription: '',
    categoryName: `General [${locale}]`,
    categoryDescription: '',
  }),
  resolveOnboardingLocaleFromContext: jest.requireActual('../../packages/database/src/onboarding-seed-i18n')
    .resolveOnboardingLocaleFromContext,
}));
const mockSendVerificationEmail = jest.fn(async (..._args: any[]) => ({ success: true }));
jest.mock('@rentalshop/utils', () => {
  const schemas = jest.requireActual('../../packages/utils/src/core/validation-schemas');
  return {
    registerSchema: schemas.registerSchema,
    merchantGoogleRegisterSchema: schemas.merchantGoogleRegisterSchema,
    sendVerificationEmail: (...args: any[]) => mockSendVerificationEmail(...args),
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

const created = () => {
  const merchant = mockTx.merchant.create.mock.calls[0][0].data;
  const outlet = mockTx.outlet.create.mock.calls[0][0].data;
  const category = mockTx.category.create.mock.calls[0][0].data;
  return {
    country: merchant.country,
    language: merchant.language,
    currency: merchant.currency,
    outletCountry: outlet.country,
    seed: [outlet.name, category.name],
  };
};

type Opts = { cookie?: string; acceptLanguage?: string };
type Expected = { language: 'vi' | 'en'; currency: 'VND' | 'USD'; seed: 'vi' | 'en' };

const CASES: Array<[string, any, Opts, Expected]> = [
  // the new form sends all three
  ['Vietnam, Tiếng Việt, VND', { country: 'Vietnam', language: 'vi', currency: 'VND', locale: 'vi' }, {}, { language: 'vi', currency: 'VND', seed: 'vi' }],
  ['United States, English, USD', { country: 'United States', language: 'en', currency: 'USD', locale: 'vi' }, {}, { language: 'en', currency: 'USD', seed: 'en' }],
  // the owner changed one of the defaults
  ['English but VND', { country: 'Vietnam', language: 'en', currency: 'VND', locale: 'vi' }, {}, { language: 'en', currency: 'VND', seed: 'en' }],
  ['Tiếng Việt but USD, page in English', { country: 'Japan', language: 'vi', currency: 'USD', locale: 'en' }, {}, { language: 'vi', currency: 'USD', seed: 'vi' }],
  // language without currency: the currency follows the language
  ['language en, no currency', { language: 'en' }, {}, { language: 'en', currency: 'USD', seed: 'en' }],
  ['language vi, no currency, page in English', { language: 'vi', locale: 'en' }, {}, { language: 'vi', currency: 'VND', seed: 'vi' }],
  // old tabs / installed apps: #1143 unchanged; the language follows the same rule as the currency
  ['old tab: locale vi', { locale: 'vi' }, {}, { language: 'vi', currency: 'VND', seed: 'vi' }],
  ['old tab: locale en', { locale: 'en' }, {}, { language: 'en', currency: 'USD', seed: 'en' }],
  ['old tab: locale ja', { locale: 'ja' }, {}, { language: 'en', currency: 'USD', seed: 'vi' }],
  ['old app: Accept-Language en only', {}, { acceptLanguage: 'en' }, { language: 'en', currency: 'USD', seed: 'en' }],
  ['old app: Accept-Language vi only', {}, { acceptLanguage: 'vi' }, { language: 'vi', currency: 'VND', seed: 'vi' }],
  ['no signal at all', {}, {}, { language: 'vi', currency: 'VND', seed: 'vi' }],
];

const seedOf = (lang: 'vi' | 'en') => [`Shop [${lang}]`, `General [${lang}]`];

describe('sign-up country, language and currency (#1539)', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client';
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findByEmail.mockReset().mockResolvedValueOnce(null).mockResolvedValue({ id: 5, email: 'owner@gmail.com' });
  });

  it.each(CASES)('POST /api/auth/register — %s', async (_name, extra, opts, expected) => {
    const res: any = await register(req({ ...BODY, ...extra }, opts));
    expect(res.status).toBe(201);
    const c = created();
    expect({ language: c.language, currency: c.currency, seed: c.seed }).toEqual({
      language: expected.language,
      currency: expected.currency,
      seed: seedOf(expected.seed),
    });
  });

  it.each(CASES)('POST /api/auth/register/merchant-google — %s', async (_name, extra, opts, expected) => {
    const res: any = await registerGoogle(req({ ...GOOGLE_BODY, ...extra }, opts));
    expect(res.status).toBe(200);
    const c = created();
    expect({ language: c.language, currency: c.currency, seed: c.seed }).toEqual({
      language: expected.language,
      currency: expected.currency,
      seed: seedOf(expected.seed),
    });
  });

  it('the country goes to the shop and its first outlet', async () => {
    await register(req({ ...BODY, country: 'United States', language: 'en', currency: 'USD' }));
    expect(created()).toMatchObject({ country: 'United States', outletCountry: 'United States' });
    jest.clearAllMocks();
    mockDb.users.findByEmail.mockReset().mockResolvedValueOnce(null).mockResolvedValue({ id: 5, email: 'owner@gmail.com' });
    await registerGoogle(req({ ...GOOGLE_BODY, country: 'Japan', language: 'en' }));
    expect(created()).toMatchObject({ country: 'Japan', outletCountry: 'Japan' });
  });

  it.each([
    ['en', { language: 'en' }],
    ['vi', { language: 'vi', locale: 'en' }],
    ['en', { locale: 'en' }],
    ['vi', {}],
  ])('the verification email is sent in %s', async (lang, extra) => {
    await register(req({ ...BODY, ...extra }));
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail.mock.calls[0][3]).toBe(lang);
  });

  it.each([
    ['language fr', { language: 'fr' }],
    ['language EN (upper case)', { language: 'EN' }],
    ['currency EUR', { currency: 'EUR' }],
    ['currency vnd (lower case)', { currency: 'vnd' }],
  ])('400 and no shop for %s', async (_name, extra) => {
    const res: any = await register(req({ ...BODY, ...extra }));
    expect(res.status).toBe(400);
    expect(mockTx.merchant.create).not.toHaveBeenCalled();
    const resGoogle: any = await registerGoogle(req({ ...GOOGLE_BODY, ...extra }));
    expect(resGoogle.status).toBe(400);
    expect(mockTx.merchant.create).not.toHaveBeenCalled();
  });
});
