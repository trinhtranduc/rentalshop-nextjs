/**
 * Issue #661 — refresh tokens survived a password change or reset.
 * The three password routes only set passwordChangedAt, and the refresh-token flow signed a new
 * access token with the CURRENT passwordChangedAt, so a phone (or a stolen token) holding a refresh
 * token from before the change kept getting access.
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

const mockDb = {
  refreshTokens: { rotate: jest.fn(), revoke: jest.fn(), findSessionId: jest.fn() },
  users: { findById: jest.fn(), update: jest.fn() },
  sessions: { getSessionStatus: jest.fn(), invalidateUserSessionsExcept: jest.fn() },
  prisma: { user: { update: jest.fn() } },
};
const mockVerifyPasswordResetToken = jest.fn();
const mockMarkTokenAsUsed = jest.fn();

jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  verifyPasswordResetToken: mockVerifyPasswordResetToken,
  markTokenAsUsed: mockMarkTokenAsUsed,
}));

const mockCaller: { user: any; userScope: any } = { user: null, userScope: {} };
const mockAuth = {
  generateToken: jest.fn((payload: any) => `jwt:${payload.sessionId}`),
  generateRefreshableToken: jest.fn((payload: any) => `short:${payload.sessionId}`),
  verifyTokenSimple: jest.fn(),
  hashPassword: jest.fn(async (p: string) => `hashed:${p}`),
  withAuthRoles: () => (handler: any) => (request: any) =>
    handler(request, { user: mockCaller.user, userScope: mockCaller.userScope }),
  withAnyAuth: (handler: any) => (request: any) =>
    handler(request, { user: mockCaller.user, userScope: mockCaller.userScope }),
};
jest.mock('@rentalshop/auth/server', () => mockAuth);

jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    success: (code: string, data: any) => ({ success: true, code, data }),
    error: (code: string) => ({ success: false, code }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', e }),
  },
  handleApiError: (error: any) => ({ response: { success: false, error: String(error) }, statusCode: 500 }),
}));

jest.mock('@rentalshop/constants', () => ({
  API: { STATUS: { NOT_FOUND: 404, FORBIDDEN: 403 } },
  USER_ROLE: { ADMIN: 'ADMIN', MERCHANT: 'MERCHANT', OUTLET_ADMIN: 'OUTLET_ADMIN', OUTLET_STAFF: 'OUTLET_STAFF' },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(async () => true),
  hash: jest.fn(async (p: string) => `bcrypt:${p}`),
}));

// In-memory Prisma for the DB helper (real packages/database/src/sessions.ts runs against it)
const mockStore: { sessions: any[]; tokens: any[] } = { sessions: [], tokens: [] };

function mockMatches(row: any, where: any): boolean {
  return Object.entries(where || {}).every(([key, cond]: [string, any]) => {
    if (key === 'OR') return cond.some((w: any) => mockMatches(row, w));
    if (key === 'AND') return cond.every((w: any) => mockMatches(row, w));
    if (key === 'NOT') return ![].concat(cond).some((w: any) => mockMatches(row, w));
    const value = row[key];
    const same = (a: any, b: any) =>
      a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;
    if (cond === null) return value === null || value === undefined;
    if (cond instanceof Date || typeof cond !== 'object') return same(value, cond);
    // SQL semantics: `col <> x` and `col IN (...)` are never true for NULL
    if ('not' in cond) {
      if (cond.not === null) return value !== null && value !== undefined;
      return value !== null && value !== undefined && !same(value, cond.not);
    }
    if ('in' in cond) return value !== null && cond.in.some((v: any) => same(value, v));
    if ('notIn' in cond) return value !== null && !cond.notIn.some((v: any) => same(value, v));
    throw new Error(`fake prisma: unsupported filter on ${key}: ${JSON.stringify(cond)}`);
  });
}

function mockTable(name: 'sessions' | 'tokens') {
  return {
    updateMany: async ({ where, data }: any) => {
      const rows = mockStore[name].filter((r) => mockMatches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    update: async ({ where, data }: any) => {
      const row = mockStore[name].find((r) => mockMatches(r, where));
      Object.assign(row, data);
      return row;
    },
    findMany: async ({ where }: any) => mockStore[name].filter((r) => mockMatches(r, where)),
    findUnique: async ({ where }: any) => mockStore[name].find((r) => mockMatches(r, where)) ?? null,
    findFirst: async ({ where }: any) => mockStore[name].find((r) => mockMatches(r, where)) ?? null,
  };
}

const mockPrisma: any = { userSession: mockTable('sessions'), refreshToken: mockTable('tokens') };
mockPrisma.$transaction = async (arg: any) =>
  typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg);

jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { refreshWithRefreshToken } from '../../apps/api/lib/refresh-access-token';
import { POST as selfChangePassword } from '../../apps/api/app/api/auth/change-password/route';
import { POST as resetPassword } from '../../apps/api/app/api/auth/reset-password/route';
import { PATCH as setUserPassword } from '../../apps/api/app/api/users/[id]/change-password/route';

const sessionsModule = jest.requireActual('../../packages/database/src/sessions');

const changedAt = new Date('2026-10-05T03:00:00.000Z');
const userAfterChange = {
  id: 7, email: 'a@b.c', role: 'MERCHANT', merchantId: 3, outletId: null, isActive: true,
  password: 'old-hash', passwordChangedAt: changedAt,
};

function request(body: unknown): any {
  return { json: async () => body, headers: { get: () => null } };
}

/** The (userId, keepSessionId) the route asked the DB helper to log out. */
function invalidatedFor(): { userId: number; keep: string | null } {
  expect(mockDb.sessions.invalidateUserSessionsExcept).toHaveBeenCalledTimes(1);
  const [userId, keep] = mockDb.sessions.invalidateUserSessionsExcept.mock.calls[0];
  return { userId, keep: keep ?? null };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.refreshTokens.findSessionId.mockResolvedValue('session-a');
  mockDb.sessions.getSessionStatus.mockResolvedValue('active');
  mockDb.users.findById.mockResolvedValue(userAfterChange);
  mockDb.users.update.mockImplementation(async (id: number, data: any) => ({ id, ...data }));
  mockDb.prisma.user.update.mockResolvedValue({});
  mockDb.sessions.invalidateUserSessionsExcept.mockResolvedValue(undefined);
});

describe('refresh-token flow after a password change (#661)', () => {
  it('rejects a refresh token issued before passwordChangedAt with 401 SESSION_EXPIRED and revokes it', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({
      newToken: 'rt2', userId: 7, sessionId: 'session-a', issuedAt: new Date('2026-10-01T00:00:00.000Z'),
    });

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt-before-change' });

    expect(result).toEqual({ ok: false, code: 'SESSION_EXPIRED', status: 401 });
    expect(mockAuth.generateRefreshableToken).not.toHaveBeenCalled();
    // rotate already revoked rt-before-change; the token it minted must not survive either
    expect(mockDb.refreshTokens.revoke).toHaveBeenCalledWith('rt2');
  });

  it('still refreshes a token issued after the change (normal refresh unchanged)', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({
      newToken: 'rt2', userId: 7, sessionId: 'session-a', issuedAt: new Date('2026-10-06T00:00:00.000Z'),
    });

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt-after-change' });

    expect(result).toEqual(expect.objectContaining({ ok: true, token: 'short:session-a', refreshToken: 'rt2' }));
    expect(mockDb.refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('still refreshes a token issued at the same instant as the change (kept session)', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({
      newToken: 'rt2', userId: 7, sessionId: 'session-a', issuedAt: new Date(changedAt),
    });

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt-kept' });

    expect(result.ok).toBe(true);
  });
});

describe('password routes log other sessions out (#661)', () => {
  it('self change-password keeps the caller session and logs out every other session', async () => {
    mockCaller.user = { id: 7, email: 'a@b.c', role: 'MERCHANT', sessionId: 'sess-caller' };
    mockCaller.userScope = { merchantId: 3 };

    const res: any = await selfChangePassword(request({ currentPassword: 'old', newPassword: 'new-pass' }));

    expect(res.status).toBe(200);
    expect(invalidatedFor()).toEqual({ userId: 7, keep: 'sess-caller' });
    const [, , at] = mockDb.sessions.invalidateUserSessionsExcept.mock.calls[0];
    expect(at).toEqual(mockDb.users.update.mock.calls[0][1].passwordChangedAt);
  });

  it('reset-password (forgot password) logs out every session of the user', async () => {
    mockVerifyPasswordResetToken.mockResolvedValue({ success: true, user: { id: 5, email: 'x@y.z' } });

    const res: any = await resetPassword(request({ token: 't', password: 'new-pass', confirmPassword: 'new-pass' }));

    expect(res.status).toBe(200);
    expect(invalidatedFor()).toEqual({ userId: 5, keep: null });
  });

  it('an admin setting another user password logs out every session of that user', async () => {
    mockCaller.user = { id: 1, email: 'admin@x', role: 'ADMIN', sessionId: 'sess-admin' };
    mockCaller.userScope = {};
    mockDb.users.findById.mockResolvedValue({ ...userAfterChange, id: 9 });

    const res: any = await setUserPassword(request({ newPassword: 'new-pass' }), { params: { id: '9' } });

    expect(res.status).toBe(200);
    expect(invalidatedFor()).toEqual({ userId: 9, keep: null });
  });

  it('a user setting their own password through users/[id] keeps their own session', async () => {
    mockCaller.user = { id: 7, email: 'a@b.c', role: 'MERCHANT', sessionId: 'sess-caller' };
    mockCaller.userScope = { merchantId: 3 };

    const res: any = await setUserPassword(request({ newPassword: 'new-pass' }), { params: { id: '7' } });

    expect(res.status).toBe(200);
    expect(invalidatedFor()).toEqual({ userId: 7, keep: 'sess-caller' });
  });
});

describe('db.sessions.invalidateUserSessionsExcept (#661)', () => {
  const longAgo = new Date('2026-09-01T00:00:00.000Z');
  const later = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  function seed() {
    mockStore.sessions = [
      { id: 1, userId: 7, sessionId: 'sess-caller', isActive: true, createdAt: longAgo, expiresAt: later, invalidatedAt: null },
      { id: 2, userId: 7, sessionId: 'sess-thief', isActive: true, createdAt: longAgo, expiresAt: later, invalidatedAt: null },
      { id: 3, userId: 8, sessionId: 'sess-other-user', isActive: true, createdAt: longAgo, expiresAt: later, invalidatedAt: null },
    ];
    mockStore.tokens = [
      { id: 1, userId: 7, sessionId: 'sess-caller', isRevoked: false, createdAt: longAgo },
      { id: 2, userId: 7, sessionId: 'sess-thief', isRevoked: false, createdAt: longAgo },
      { id: 3, userId: 7, sessionId: null, isRevoked: false, createdAt: longAgo },
      { id: 4, userId: 8, sessionId: 'sess-other-user', isRevoked: false, createdAt: longAgo },
    ];
  }

  it('keeps the given session, deactivates the rest as expired (not replaced) and revokes their tokens', async () => {
    seed();

    await sessionsModule.invalidateUserSessionsExcept(7, 'sess-caller', changedAt);

    const byId = (id: string) => mockStore.sessions.find((s) => s.sessionId === id);
    const token = (id: number) => mockStore.tokens.find((t) => t.id === id);
    expect(byId('sess-caller').isActive).toBe(true);
    expect(byId('sess-thief').isActive).toBe(false);
    expect(byId('sess-other-user').isActive).toBe(true);
    expect(token(1).isRevoked).toBe(false);
    expect(token(2).isRevoked).toBe(true);
    expect(token(3).isRevoked).toBe(true);
    expect(token(4).isRevoked).toBe(false);
    // the kept session's live token must pass the refresh check (createdAt >= passwordChangedAt)
    expect(token(1).createdAt.getTime()).toBeGreaterThanOrEqual(changedAt.getTime());

    expect(await sessionsModule.getSessionStatus('sess-thief')).toBe('expired');
    expect(await sessionsModule.getSessionStatus('sess-caller')).toBe('active');
  });

  it('without a session to keep, logs out every session of the user and revokes all their tokens', async () => {
    seed();

    await sessionsModule.invalidateUserSessionsExcept(7, undefined, changedAt);

    expect(mockStore.sessions.filter((s) => s.userId === 7).every((s) => !s.isActive)).toBe(true);
    expect(mockStore.tokens.filter((t) => t.userId === 7).every((t) => t.isRevoked)).toBe(true);
    expect(mockStore.tokens.find((t) => t.id === 4).isRevoked).toBe(false);
    expect(await sessionsModule.getSessionStatus('sess-caller')).toBe('expired');
  });
});
