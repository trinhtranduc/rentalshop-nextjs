/**
 * Issue #343 — authenticateRequest must tell apart why a request is rejected:
 * TOKEN_EXPIRED (JWT exp passed), INVALID_TOKEN (bad token),
 * SESSION_REPLACED (newer login elsewhere), SESSION_EXPIRED (logout, admin reset, timeout).
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

jest.mock('@rentalshop/utils/server', () => ({
  getSubscriptionError: jest.fn(),
}));

jest.mock('@rentalshop/utils', () => ({
  PlanLimitError: class PlanLimitError extends Error {},
}));

const mockDb = {
  users: { findById: jest.fn() },
  sessions: { getSessionStatus: jest.fn(), validateSession: jest.fn() },
};

jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  prisma: {},
}));

import * as jsonwebtoken from 'jsonwebtoken';
import { authenticateRequest } from '../../../packages/auth/src/core';

const SECRET = process.env.JWT_SECRET as string;

const basePayload = {
  userId: 1,
  email: 'admin@example.com',
  role: 'ADMIN',
  merchantId: null,
  outletId: null,
  sessionId: 'session-abc',
  passwordChangedAt: null,
  permissionsChangedAt: null,
};

function requestWith(token: string): any {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null),
    },
  };
}

function signValid(payload: object = basePayload) {
  return jsonwebtoken.sign(payload, SECRET, { expiresIn: '1h' });
}

function signExpired(payload: object = basePayload) {
  const now = Math.floor(Date.now() / 1000);
  return jsonwebtoken.sign({ ...payload, iat: now - 7200, exp: now - 60 }, SECRET);
}

describe('authenticateRequest 401 codes (#343)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 1, isActive: true, passwordChangedAt: null, permissionsChangedAt: null });
    mockDb.sessions.getSessionStatus.mockResolvedValue('active');
    mockDb.sessions.validateSession.mockResolvedValue(true);
  });

  it('returns TOKEN_EXPIRED when the JWT exp has passed', async () => {
    const result: any = await authenticateRequest(requestWith(signExpired()));
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(401);
    expect(result.response.body.code).toBe('TOKEN_EXPIRED');
  });

  it('returns INVALID_TOKEN for a malformed token', async () => {
    const result: any = await authenticateRequest(requestWith('not.a.jwt'));
    expect(result.response.status).toBe(401);
    expect(result.response.body.code).toBe('INVALID_TOKEN');
  });

  it('returns INVALID_TOKEN for a token signed with another secret', async () => {
    const forged = jsonwebtoken.sign(basePayload, 'some-other-secret', { expiresIn: '1h' });
    const result: any = await authenticateRequest(requestWith(forged));
    expect(result.response.body.code).toBe('INVALID_TOKEN');
  });

  it('returns SESSION_REPLACED when a newer login replaced the session', async () => {
    mockDb.sessions.getSessionStatus.mockResolvedValue('replaced');
    const result: any = await authenticateRequest(requestWith(signValid()));
    expect(result.response.status).toBe(401);
    expect(result.response.body.code).toBe('SESSION_REPLACED');
  });

  it('returns SESSION_EXPIRED when the session was logged out, reset or timed out', async () => {
    mockDb.sessions.getSessionStatus.mockResolvedValue('expired');
    const result: any = await authenticateRequest(requestWith(signValid()));
    expect(result.response.status).toBe(401);
    expect(result.response.body.code).toBe('SESSION_EXPIRED');
  });

  it('checks the session in the database on every request', async () => {
    const token = signValid();
    await authenticateRequest(requestWith(token));
    await authenticateRequest(requestWith(token));
    expect(mockDb.sessions.getSessionStatus).toHaveBeenCalledTimes(2);
    expect(mockDb.sessions.getSessionStatus).toHaveBeenCalledWith('session-abc');
  });

  it('accepts a valid token with an active session', async () => {
    const result: any = await authenticateRequest(requestWith(signValid()));
    expect(result.success).toBe(true);
    expect(result.user.id).toBe(1);
  });
});
