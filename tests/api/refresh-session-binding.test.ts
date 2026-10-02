/**
 * Issue #343 — a refresh token only refreshes the session it was issued for.
 * Before the fix, both refresh routes attached the user's newest active session, so a device
 * kicked by a newer login could refresh and take over the new device's session.
 */

const mockDb = {
  refreshTokens: { rotate: jest.fn(), revoke: jest.fn() },
  users: { findById: jest.fn() },
  sessions: { getSessionStatus: jest.fn(), getUserActiveSessions: jest.fn() },
};

jest.mock('@rentalshop/database', () => ({ db: mockDb }));

const mockAuth = {
  generateToken: jest.fn((payload: any) => `jwt:${payload.sessionId}`),
  verifyTokenSimple: jest.fn(),
};

jest.mock('@rentalshop/auth/server', () => mockAuth);

import { refreshWithAccessToken, refreshWithRefreshToken } from '../../apps/api/lib/refresh-access-token';

const activeUser = { id: 1, email: 'a@b.c', role: 'MERCHANT', merchantId: 3, outletId: null, isActive: true };

describe('refresh binds to the refresh token session (#343)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue(activeUser);
    mockDb.sessions.getUserActiveSessions.mockResolvedValue([{ sessionId: 'newest-other-device' }]);
  });

  it('issues a token for the session linked to the refresh token', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({ newToken: 'rt2', userId: 1, sessionId: 'session-a' });
    mockDb.sessions.getSessionStatus.mockResolvedValue('active');

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt1' });

    expect(result).toEqual(expect.objectContaining({ ok: true, token: 'jwt:session-a', refreshToken: 'rt2' }));
    expect(mockDb.sessions.getSessionStatus).toHaveBeenCalledWith('session-a');
  });

  it('returns SESSION_REPLACED and issues nothing when a newer login replaced the session', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({ newToken: 'rt2', userId: 1, sessionId: 'session-a' });
    mockDb.sessions.getSessionStatus.mockResolvedValue('replaced');

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt1' });

    expect(result).toEqual({ ok: false, code: 'SESSION_REPLACED', status: 401 });
    expect(mockAuth.generateToken).not.toHaveBeenCalled();
    expect(mockDb.refreshTokens.revoke).toHaveBeenCalledWith('rt2');
  });

  it('returns SESSION_EXPIRED when the linked session is gone', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({ newToken: 'rt2', userId: 1, sessionId: 'session-a' });
    mockDb.sessions.getSessionStatus.mockResolvedValue('expired');

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt1' });

    expect(result).toEqual({ ok: false, code: 'SESSION_EXPIRED', status: 401 });
    expect(mockAuth.generateToken).not.toHaveBeenCalled();
  });

  it('returns SESSION_EXPIRED for a refresh token with no linked session and never borrows another session', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue({ newToken: 'rt2', userId: 1, sessionId: null });

    const result: any = await refreshWithRefreshToken({ refreshToken: 'rt1' });

    expect(result).toEqual({ ok: false, code: 'SESSION_EXPIRED', status: 401 });
    expect(mockAuth.generateToken).not.toHaveBeenCalled();
  });

  it('returns REFRESH_TOKEN_INVALID for an unknown, revoked or expired refresh token', async () => {
    mockDb.refreshTokens.rotate.mockResolvedValue(null);

    const result: any = await refreshWithRefreshToken({ refreshToken: 'bad' });

    expect(result).toEqual({ ok: false, code: 'REFRESH_TOKEN_INVALID', status: 401 });
  });

  it('legacy refresh (Bearer access token) refuses a replaced session', async () => {
    mockAuth.verifyTokenSimple.mockResolvedValue({ id: 1, sessionId: 'session-a', passwordChangedAt: null, permissionsChangedAt: null });
    mockDb.sessions.getSessionStatus.mockResolvedValue('replaced');

    const result: any = await refreshWithAccessToken('access-token');

    expect(result).toEqual({ ok: false, code: 'SESSION_REPLACED', status: 401 });
    expect(mockAuth.generateToken).not.toHaveBeenCalled();
  });

  it('legacy refresh keeps the same session when it is active', async () => {
    mockAuth.verifyTokenSimple.mockResolvedValue({ id: 1, sessionId: 'session-a', passwordChangedAt: null, permissionsChangedAt: null });
    mockDb.sessions.getSessionStatus.mockResolvedValue('active');

    const result: any = await refreshWithAccessToken('access-token');

    expect(result).toEqual(expect.objectContaining({ ok: true, token: 'jwt:session-a' }));
  });
});
