/**
 * Issue #410 — a rate-limited request answers 429 with the standard ResponseBuilder error body.
 * Before the fix, createRateLimiter sent { error, message, retryAfter } with no `success` and no
 * `code`, so iOS failed to decode it ("Không thể phân tích phản hồi từ máy chủ").
 * The limiter is shared by forgot-password, login, product search and customer search.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200, headers: new Headers(init?.headers || {}) }),
  },
}));

jest.mock('@rentalshop/database', () => ({
  db: { users: { findByEmail: jest.fn().mockResolvedValue(null) } },
  createPasswordResetToken: jest.fn(),
  resendVerificationToken: jest.fn(),
}));

jest.mock('@rentalshop/utils', () => {
  const rb = jest.requireActual('../../packages/utils/src/api/response-builder');
  return {
    ResponseBuilder: rb.ResponseBuilder,
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  };
});

// The real limiter, without the rest of the middleware package (auth, subscriptions).
jest.mock('@rentalshop/middleware', () =>
  jest.requireActual('../../packages/middleware/src/rate-limit/rate-limit')
);

import {
  authRateLimiter,
  passwordResetRateLimiter,
  searchRateLimiter,
} from '../../packages/middleware/src/rate-limit/rate-limit';
import { POST as forgotPassword } from '../../apps/api/app/api/auth/forgot-password/route';
import { POST as resendVerification } from '../../apps/api/app/api/auth/resend-verification/route';

const CODE = 'RATE_LIMIT_EXCEEDED';

function request(ip: string, body: any = { email: 'nobody@example.com' }): any {
  return {
    ip,
    headers: { get: (name: string) => (name === 'user-agent' ? 'jest' : null) },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

function expectStandard429(res: any) {
  expect(res).not.toBeNull();
  expect(res.status).toBe(429);
  expect(res.body.success).toBe(false);
  expect(res.body.code).toBe(CODE);
  expect(typeof res.body.message).toBe('string');
  expect(res.body.message.length).toBeGreaterThan(0);
  expect(res.body.message).not.toBe(CODE);
  const retryAfter = Number(res.headers.get('Retry-After'));
  expect(retryAfter).toBeGreaterThan(0);
}

describe('rate-limited requests use the standard error body (#410)', () => {
  it('POST /api/auth/forgot-password: 4th call in an hour is a standard 429', async () => {
    for (let i = 0; i < 3; i++) {
      const ok: any = await forgotPassword(request('198.51.100.1'));
      expect(ok.status).toBe(200);
    }
    const res: any = await forgotPassword(request('198.51.100.1'));
    expectStandard429(res);
    // additive: the old retryAfter field stays
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });

  it('passwordResetRateLimiter keeps 3 per hour and sends the standard body', () => {
    const req = request('198.51.100.2');
    for (let i = 0; i < 3; i++) expect(passwordResetRateLimiter(req)).toBeNull();
    const res: any = passwordResetRateLimiter(req);
    expectStandard429(res);
    expect(Number(res.headers.get('Retry-After'))).toBeLessThanOrEqual(3600);
  });

  it('authRateLimiter (login) keeps 10 per 15 minutes and sends the standard body', () => {
    const req = request('198.51.100.3');
    for (let i = 0; i < 10; i++) expect(authRateLimiter(req)).toBeNull();
    const res: any = authRateLimiter(req);
    expectStandard429(res);
    expect(Number(res.headers.get('Retry-After'))).toBeLessThanOrEqual(900);
  });

  it('searchRateLimiter (products, customers) keeps 100 per 30 s and sends the standard body', () => {
    const req = request('198.51.100.4');
    for (let i = 0; i < 100; i++) expect(searchRateLimiter(req)).toBeNull();
    const res: any = searchRateLimiter(req);
    expectStandard429(res);
    expect(Number(res.headers.get('Retry-After'))).toBeLessThanOrEqual(30);
  });

  it('POST /api/auth/resend-verification: 4th call per email is a standard 429 with readable text', async () => {
    const body = { email: 'resend-410@example.com' };
    for (let i = 0; i < 3; i++) {
      const ok: any = await resendVerification(request('198.51.100.5', body));
      expect(ok.status).toBe(200);
    }
    const res: any = await resendVerification(request('198.51.100.5', body));
    expectStandard429(res);
  });
});
