/**
 * #1539 — the password reset and the verification emails go out in the language of the user's shop
 * (`Merchant.language`): 'en' → English; empty, missing or no shop → Vietnamese, as before.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
    redirect: (url: string) => ({ redirect: url, status: 307 }),
  },
}));

const mockDb: any = { users: { findByEmail: jest.fn() } };
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  createPasswordResetToken: jest.fn(async () => ({ token: 'reset-token', expiresAt: new Date() })),
  resendVerificationToken: jest.fn(async () => ({ token: 'verify-token' })),
  createEmailVerification: jest.fn(async () => ({ token: 'verify-token' })),
  verifyEmailByToken: jest.fn(),
}));

const mockSendPasswordResetEmail = jest.fn(async (..._args: any[]) => ({ success: true }));
const mockSendVerificationEmail = jest.fn(async (..._args: any[]) => ({ success: true }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data?: any) => ({ success: true, code, data }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  sendVerificationEmail: (...args: any[]) => mockSendVerificationEmail(...args),
  clientSafeErrorText: (_e: unknown, fallback: string) => fallback,
}));
jest.mock('@rentalshop/auth/server', () => ({ generateToken: jest.fn() }));
jest.mock('@rentalshop/middleware', () => ({
  passwordResetRateLimiter: () => null,
  createRateLimiter: () => () => null,
}));

import { POST as forgotPassword } from '../../apps/api/app/api/auth/forgot-password/route';
import { POST as resendVerification } from '../../apps/api/app/api/auth/resend-verification/route';
import { resendVerification as resendFromVerifyRoute } from '../../apps/api/app/api/auth/verify-email/route';

const request = (body: any): any => ({
  ip: '1.2.3.4',
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
  json: async () => body,
});

const userWith = (merchant: any) => ({
  id: 5,
  email: 'owner@shop.com',
  firstName: 'Owner',
  lastName: '',
  isActive: true,
  emailVerified: false,
  merchantId: merchant ? 2 : null,
  merchant,
});

const SHOPS: Array<[string, any, 'vi' | 'en']> = [
  ['shop language en', { id: 2, name: 'Shop', language: 'en' }, 'en'],
  ['shop language vi', { id: 2, name: 'Shop', language: 'vi' }, 'vi'],
  ['shop language empty (before #1539)', { id: 2, name: 'Shop', language: null }, 'vi'],
  ['shop row without the column', { id: 2, name: 'Shop' }, 'vi'],
  ['no shop (admin user)', null, 'vi'],
];

describe('auth emails follow the shop language (#1539)', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(SHOPS)('forgot password — %s', async (_name, merchant, lang) => {
    mockDb.users.findByEmail.mockResolvedValue(userWith(merchant));
    await forgotPassword(request({ email: 'owner@shop.com' }));
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail.mock.calls[0][3]).toBe(lang);
  });

  it.each(SHOPS)('resend verification — %s', async (_name, merchant, lang) => {
    mockDb.users.findByEmail.mockResolvedValue(userWith(merchant));
    await resendVerification(request({ email: 'owner@shop.com' }));
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail.mock.calls[0][3]).toBe(lang);
  });

  it.each(SHOPS)('resend from the verify-email route — %s', async (_name, merchant, lang) => {
    mockDb.users.findByEmail.mockResolvedValue(userWith(merchant));
    await resendFromVerifyRoute(request({ email: 'owner@shop.com' }));
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail.mock.calls[0][3]).toBe(lang);
  });
});
