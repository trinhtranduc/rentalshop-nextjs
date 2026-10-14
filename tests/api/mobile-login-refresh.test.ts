/**
 * Issue #344 — mobile login issues a refresh token bound to the session it creates,
 * with a short access token. Web login stays unchanged.
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

const mockDb = {
  merchants: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
  sessions: { createUserSession: jest.fn() },
  refreshTokens: { create: jest.fn() },
};

jest.mock('@rentalshop/database', () => ({ db: mockDb, getDefaultBankAccount: jest.fn() }));

const mockAuthServer = {
  generateToken: jest.fn(() => 'web-7d'),
  generateMobileToken: jest.fn(() => 'mobile-90d'),
  generateRefreshableToken: jest.fn(() => 'mobile-1h'),
  getUserPermissions: jest.fn(async () => ['orders.view']),
};

jest.mock('@rentalshop/auth/server', () => mockAuthServer);
jest.mock('@rentalshop/auth', () => ({ ROLE_PERMISSIONS: { ADMIN: ['orders.view'] } }));
jest.mock('@rentalshop/utils', () => ({ ResponseBuilder: { error: (code: string) => ({ success: false, code }) } }));
jest.mock('@rentalshop/constants', () => ({
  USER_ROLE: { MERCHANT: 'MERCHANT' },
  // #824: login refuses users of a disabled outlet (real helper)
  isOutletRole: jest.requireActual('../../packages/constants/src/status').isOutletRole,
}));

import { buildAuthLoginSuccessResponse } from '../../apps/api/lib/build-auth-login-response';

const DAY_SESSION = { sessionId: 'session-new' };

const user: any = {
  id: 1,
  email: 'a@b.c',
  firstName: 'A',
  lastName: 'B',
  role: 'ADMIN',
  merchantId: null,
  outletId: null,
  passwordChangedAt: null,
  permissionsChangedAt: null,
};

function request(headers: Record<string, string>): any {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name: string) => lower[name.toLowerCase()] ?? null } };
}

describe('mobile login with refresh token (#344)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sessions.createUserSession.mockResolvedValue(DAY_SESSION);
    mockDb.refreshTokens.create.mockResolvedValue('refresh-abc');
  });

  it('creates a sliding mobile session and a refresh token bound to it, with a 1-hour access token', async () => {
    const res: any = await buildAuthLoginSuccessResponse(
      request({ 'X-Client-Platform': 'mobile', 'User-Agent': 'AnyRent-iOS/2.0' }),
      user,
      {},
      { issueRefreshToken: { deviceId: 'device-1' } }
    );

    expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'AnyRent-iOS/2.0', 30, { absoluteDays: 90, platform: 'mobile' });
    expect(mockDb.refreshTokens.create).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ sessionId: 'session-new', deviceId: 'device-1' })
    );
    expect(mockAuthServer.generateRefreshableToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, sessionId: 'session-new' })
    );
    expect(res.body.data.token).toBe('mobile-1h');
    expect(res.body.data.refreshToken).toBe('refresh-abc');
    expect(res.body.data.expiresIn).toBe('1h');
    expect(res.body.data.refreshExpiresIn).toBe('30d');
    expect(res.body.data.user.id).toBe(1);
  });

  it('issues a refresh-capable session even if the platform header is missing', async () => {
    await buildAuthLoginSuccessResponse(request({ 'User-Agent': 'curl/8' }), user, {}, { issueRefreshToken: {} });
    expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'curl/8', 30, { absoluteDays: 90, platform: 'mobile' });
  });

  it('store builds on /api/auth/login keep the 90-day token and get no refresh token', async () => {
    const res: any = await buildAuthLoginSuccessResponse(request({ 'X-Client-Platform': 'mobile' }), user, {});
    expect(res.body.data.token).toBe('mobile-90d');
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(mockDb.refreshTokens.create).not.toHaveBeenCalled();
  });

  it('web login is unchanged', async () => {
    const res: any = await buildAuthLoginSuccessResponse(request({ 'User-Agent': 'Mozilla/5.0 (Macintosh)' }), user, {});
    expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'Mozilla/5.0 (Macintosh)', 7, { platform: 'web' });
    expect(res.body.data.token).toBe('web-7d');
    expect(res.body.data.refreshToken).toBeUndefined();
  });

  describe('session platform (#660)', () => {
    it('web client (X-Client-Platform: web) opens a web session', async () => {
      await buildAuthLoginSuccessResponse(request({ 'X-Client-Platform': 'web', 'User-Agent': 'Mozilla/5.0' }), user, {});
      expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'Mozilla/5.0', 7, { platform: 'web' });
    });

    it('old Android build on /api/auth/login with only the okhttp User-Agent opens a phone session', async () => {
      const res: any = await buildAuthLoginSuccessResponse(request({ 'User-Agent': 'okhttp/4.12.0' }), user, {});
      expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'okhttp/4.12.0', 30, {
        absoluteDays: 90,
        platform: 'mobile',
      });
      expect(res.body.data.token).toBe('mobile-90d');
    });

    it('X-Client-Platform: ios counts as a phone: mobile session and 90-day token on /api/auth/login', async () => {
      const res: any = await buildAuthLoginSuccessResponse(request({ 'X-Client-Platform': 'ios' }), user, {});
      expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, undefined, 30, {
        absoluteDays: 90,
        platform: 'mobile',
      });
      expect(res.body.data.token).toBe('mobile-90d');
    });

    it('unknown client keeps today: web token and a session with no platform (replaces every session)', async () => {
      const res: any = await buildAuthLoginSuccessResponse(request({ 'User-Agent': 'curl/8' }), user, {});
      expect(mockDb.sessions.createUserSession).toHaveBeenCalledWith(1, undefined, 'curl/8', 7, { platform: null });
      expect(res.body.data.token).toBe('web-7d');
    });
  });
});
