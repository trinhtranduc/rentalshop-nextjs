import { prisma } from './client';
import { randomBytes } from 'crypto';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user and invalidate all previous sessions
 * This implements "single session" behavior - only the latest login is valid
 */
export async function createUserSession(
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Start a transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Invalidate ALL previous sessions for this user
    await tx.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        invalidatedAt: new Date(),
      },
    });

    // 2. Create new session
    const session = await tx.userSession.create({
      data: {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
      },
    });

    return session;
  });
}

/**
 * Validate a session by sessionId
 * Returns true if session is valid (active and not expired)
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  if (!sessionId) {
    return false;
  }

  const session = await prisma.userSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return false;
  }

  // Check if session is active
  if (!session.isActive) {
    return false;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Auto-invalidate expired session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        invalidatedAt: new Date(),
      },
    });
    return false;
  }

  return true;
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

  const userIds = users.map(u => u.id);

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
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  invalidateAllMerchantUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
};

