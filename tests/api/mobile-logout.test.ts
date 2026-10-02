/**
 * Issue #344 — /api/mobile/auth/logout is a public route (no JWT check in middleware).
 * It must only end the session bound to the refresh token it receives, and must ignore
 * a client-supplied x-user-id header (which let anyone sign out any user).
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

const mockDb = {
  refreshTokens: { revoke: jest.fn(), findSessionId: jest.fn() },
  sessions: { invalidateSession: jest.fn(), invalidateAllUserSessions: jest.fn() },
};

jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: { success: (code: string, data: any) => ({ success: true, code, data }) },
  handleApiError: () => ({ response: { success: false }, statusCode: 500 }),
}));
jest.mock('@rentalshop/utils/server', () => ({ buildSimpleCorsHeaders: () => ({}) }));

import { POST } from '../../apps/api/app/api/mobile/auth/logout/route';

function request(body: unknown, headers: Record<string, string> = {}): any {
  return {
    json: async () => body,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  };
}

describe('POST /api/mobile/auth/logout (#344)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignores x-user-id and never signs out other sessions of a user', async () => {
    await POST(request({}, { 'x-user-id': '42' }));
    expect(mockDb.sessions.invalidateAllUserSessions).not.toHaveBeenCalled();
    expect(mockDb.sessions.invalidateSession).not.toHaveBeenCalled();
  });

  it('ends only the session bound to the refresh token and revokes the token', async () => {
    mockDb.refreshTokens.findSessionId.mockResolvedValue('session-a');
    const res: any = await POST(request({ refreshToken: 'rt1' }, { 'x-user-id': '42' }));
    expect(mockDb.refreshTokens.revoke).toHaveBeenCalledWith('rt1');
    expect(mockDb.sessions.invalidateSession).toHaveBeenCalledWith('session-a');
    expect(mockDb.sessions.invalidateAllUserSessions).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
