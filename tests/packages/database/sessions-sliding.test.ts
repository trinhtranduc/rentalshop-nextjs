/**
 * Issue #343 — session status, sliding expiry for mobile, and refresh-token revocation on login.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const mockTx = {
  userSession: { updateMany: jest.fn(), create: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn(async (fn: any) => fn(mockTx)),
  userSession: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
};

jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { createUserSession, getSessionStatus } from '../../../packages/database/src/sessions';

const NOW = new Date('2026-10-02T03:00:00.000Z');

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    userId: 1,
    sessionId: 'session-abc',
    isActive: true,
    createdAt: new Date(NOW.getTime() - 10 * DAY_MS),
    expiresAt: new Date(NOW.getTime() + 20 * DAY_MS),
    absoluteExpiresAt: new Date(NOW.getTime() + 80 * DAY_MS),
    idleTimeoutDays: 30,
    invalidatedAt: null,
    ...overrides,
  };
}

describe('sessions (#343)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    mockTx.userSession.create.mockImplementation(async ({ data }: any) => ({ id: 9, ...data }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createUserSession', () => {
    it('mobile: 30-day idle expiry and 90-day absolute cap', async () => {
      await createUserSession(1, 'ip', 'ua', 30, { absoluteDays: 90 });
      const data = mockTx.userSession.create.mock.calls[0][0].data;
      expect(data.expiresAt.getTime()).toBe(NOW.getTime() + 30 * DAY_MS);
      expect(data.absoluteExpiresAt.getTime()).toBe(NOW.getTime() + 90 * DAY_MS);
      expect(data.idleTimeoutDays).toBe(30);
    });

    it('web: 7-day session with no sliding fields', async () => {
      await createUserSession(1, 'ip', 'ua', 7);
      const data = mockTx.userSession.create.mock.calls[0][0].data;
      expect(data.expiresAt.getTime()).toBe(NOW.getTime() + 7 * DAY_MS);
      expect(data.absoluteExpiresAt ?? null).toBeNull();
      expect(data.idleTimeoutDays ?? null).toBeNull();
    });

    it('revokes every refresh token of the user in the same transaction', async () => {
      await createUserSession(1, 'ip', 'ua', 30, { absoluteDays: 90 });
      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1, isRevoked: false }),
          data: expect.objectContaining({ isRevoked: true }),
        })
      );
    });
  });

  describe('getSessionStatus', () => {
    it('active session returns active', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(session({ expiresAt: new Date(NOW.getTime() + 29.5 * DAY_MS) }));
      await expect(getSessionStatus('session-abc')).resolves.toBe('active');
    });

    it('unknown session returns expired', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);
      await expect(getSessionStatus('nope')).resolves.toBe('expired');
    });

    it('session deactivated by a newer login returns replaced', async () => {
      const invalidatedAt = new Date(NOW.getTime() - DAY_MS);
      mockPrisma.userSession.findUnique.mockResolvedValue(session({ isActive: false, invalidatedAt }));
      mockPrisma.userSession.findFirst.mockResolvedValue({ id: 8, createdAt: new Date(invalidatedAt.getTime() + 20) });
      await expect(getSessionStatus('session-abc')).resolves.toBe('replaced');
    });

    it('logged-out session (no newer login at that moment) returns expired', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(session({ isActive: false, invalidatedAt: new Date(NOW.getTime() - DAY_MS) }));
      mockPrisma.userSession.findFirst.mockResolvedValue(null);
      await expect(getSessionStatus('session-abc')).resolves.toBe('expired');
    });

    it('timed-out session returns expired and is deactivated', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(session({ expiresAt: new Date(NOW.getTime() - 1000) }));
      await expect(getSessionStatus('session-abc')).resolves.toBe('expired');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
      );
    });

    it('session past its absolute cap returns expired', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(
        session({ expiresAt: new Date(NOW.getTime() + DAY_MS), absoluteExpiresAt: new Date(NOW.getTime() - 1000) })
      );
      await expect(getSessionStatus('session-abc')).resolves.toBe('expired');
    });

    it('slides a mobile session to now + 30 days when it would move by more than a day', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(session());
      await expect(getSessionStatus('session-abc')).resolves.toBe('active');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { expiresAt: new Date(NOW.getTime() + 30 * DAY_MS) },
      });
    });

    it('never slides past the absolute cap', async () => {
      const cap = new Date(NOW.getTime() + 5 * DAY_MS);
      mockPrisma.userSession.findUnique.mockResolvedValue(
        session({ expiresAt: new Date(NOW.getTime() + 2 * DAY_MS), absoluteExpiresAt: cap })
      );
      await getSessionStatus('session-abc');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { expiresAt: cap } });
    });

    it('writes at most once a day', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(session({ expiresAt: new Date(NOW.getTime() + 29.5 * DAY_MS) }));
      await getSessionStatus('session-abc');
      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });

    it('does not slide a web session', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(
        session({ expiresAt: new Date(NOW.getTime() + DAY_MS), absoluteExpiresAt: null, idleTimeoutDays: null })
      );
      await expect(getSessionStatus('session-abc')).resolves.toBe('active');
      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });
  });
});
