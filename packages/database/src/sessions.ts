import { prisma } from './client';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

const DAY_MS = 24 * 60 * 60 * 1000;


export type SessionStatus = 'active' | 'replaced' | 'expired';

/**
 * Create a new session for a user and invalidate all previous sessions
 * This implements "single session" behavior - only the latest login is valid.
 * Every older refresh token of the user is revoked too, so only the new device can refresh.
 *
 * With `absoluteDays`, the session slides: each use moves expiresAt to now + expiryDays,
 * never past now + absoluteDays from login (see getSessionStatus).
 */
export async function createUserSession(
  userId: number,
  ipAddress?: string,
  userAgent?: string,
  expiryDays: number = 7,
  options?: { absoluteDays?: number }
) {
  const sessionId = generateSessionId();
  // One timestamp for both writes: an older session whose invalidatedAt equals a newer
  // session's createdAt was replaced by that login (see getSessionStatus).
  const loginAt = new Date();
  const now = loginAt.getTime();
  const expiresAt = new Date(now + expiryDays * DAY_MS);
  const sliding = options?.absoluteDays !== undefined;

  // Start a transaction to ensure atomicity
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Invalidate ALL previous sessions for this user
    await tx.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        invalidatedAt: loginAt,
      },
    });

    // 2. Revoke ALL refresh tokens so an older device cannot refresh into a new session
    await tx.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    // 3. Create new session
    const session = await tx.userSession.create({
      data: {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        createdAt: loginAt,
        expiresAt,
        absoluteExpiresAt: sliding ? new Date(now + options!.absoluteDays! * DAY_MS) : null,
        idleTimeoutDays: sliding ? expiryDays : null,
        isActive: true,
      },
    });

    return session;
  });
}

/**
 * Why a session can or cannot be used:
 * - active: usable; a sliding session's expiry is pushed forward (at most one write per day)
 * - replaced: deactivated because the same user logged in again (another device)
 * - expired: unknown, logged out, reset by an admin, or past its expiry
 */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  if (!sessionId) {
    return 'expired';
  }

  const session = await prisma.userSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return 'expired';
  }

  if (!session.isActive) {
    if (!session.invalidatedAt) {
      return 'expired';
    }
    // createUserSession stamps replaced sessions with the new session's createdAt
    const newerLogin = await prisma.userSession.findFirst({
      where: {
        userId: session.userId,
        id: { not: session.id },
        createdAt: session.invalidatedAt,
      },
      select: { id: true, createdAt: true },
    });
    return newerLogin ? 'replaced' : 'expired';
  }

  const now = Date.now();
  const absoluteExpiresAt = session.absoluteExpiresAt?.getTime() ?? null;

  if (session.expiresAt.getTime() < now || (absoluteExpiresAt !== null && absoluteExpiresAt < now)) {
    // Auto-invalidate expired session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        invalidatedAt: new Date(),
      },
    });
    return 'expired';
  }

  if (session.idleTimeoutDays && absoluteExpiresAt !== null) {
    const slidTo = Math.min(now + session.idleTimeoutDays * DAY_MS, absoluteExpiresAt);
    if (slidTo - session.expiresAt.getTime() > DAY_MS) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { expiresAt: new Date(slidTo) },
      });
    }
  }

  return 'active';
}

/**
 * Validate a session by sessionId
 * Returns true if session is valid (active and not expired)
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  return (await getSessionStatus(sessionId)) === 'active';
}

/**
 * Invalidate a specific session (for logout)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: {
      sessionId,
      isActive: true,
    },
    data: {
      isActive: false,
      invalidatedAt: new Date(),
    },
  });
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: number): Promise<void> {
  await prisma.userSession.updateMany({
    where: {
      userId,
      isActive: true,
    },
    data: {
      isActive: false,
      invalidatedAt: new Date(),
    },
  });
}

/**
 * Invalidate all sessions for all users of a merchant
 * Useful when subscription plan changes (especially allowWebAccess)
 */
export async function invalidateAllMerchantUserSessions(merchantId: number): Promise<number> {
  // Get all user IDs for this merchant
  const users = await prisma.user.findMany({
    where: {
      merchantId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return 0;
  }

  const userIds = users.map((u: { id: number }): number => u.id);

  // Invalidate all sessions for these users
  const result = await prisma.userSession.updateMany({
    where: {
      userId: {
        in: userIds,
      },
      isActive: true,
    },
    data: {
      isActive: false,
      invalidatedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: number) {
  return await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      isActive: true,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      isActive: false,
      invalidatedAt: new Date(),
    },
  });

  return result.count;
}

export const sessions = {
  generateSessionId,
  createUserSession,
  getSessionStatus,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  invalidateAllMerchantUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
};

