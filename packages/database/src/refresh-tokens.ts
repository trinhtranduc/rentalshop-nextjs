import { prisma } from './client';
import { randomBytes, createHash } from 'crypto';

/**
 * Refresh Token Management
 * 
 * Implements secure refresh token rotation pattern:
 * - Tokens are stored as SHA-256 hashes (never plaintext)
 * - Each refresh creates a new token and revokes the old one
 * - If a revoked token is reused, all tokens for that user/device are revoked (theft detection)
 * - Tokens expire after 30 days
 */

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

/**
 * Hash a refresh token for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create and store a new refresh token for a user
 */
export async function createRefreshToken(
  userId: number,
  options?: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<string> {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      deviceId: options?.deviceId || null,
      userAgent: options?.userAgent || null,
      ipAddress: options?.ipAddress || null,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate a refresh token and return the associated user ID
 * Returns null if token is invalid, expired, or revoked
 */
export async function validateRefreshToken(token: string): Promise<{
  userId: number;
  deviceId: string | null;
  tokenHash: string;
} | null> {
  const tokenHash = hashToken(token);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!refreshToken) {
    return null;
  }

  // Check if token is revoked
  if (refreshToken.isRevoked) {
    // SECURITY: Revoked token reuse detected — possible token theft
    // Revoke ALL tokens for this user on this device
    console.warn('⚠️ REFRESH TOKEN: Revoked token reuse detected!', {
      userId: refreshToken.userId,
      deviceId: refreshToken.deviceId,
    });
    
    await revokeAllUserTokens(refreshToken.userId, refreshToken.deviceId || undefined);
    return null;
  }

  // Check if token is expired
  if (refreshToken.expiresAt < new Date()) {
    // Auto-revoke expired token
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return null;
  }

  return {
    userId: refreshToken.userId,
    deviceId: refreshToken.deviceId,
    tokenHash: refreshToken.tokenHash,
  };
}

/**
 * Rotate a refresh token: revoke old token and issue a new one
 * This is called during token refresh to implement rotation
 */
export async function rotateRefreshToken(
  oldToken: string,
  options?: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<{ newToken: string; userId: number } | null> {
  const oldTokenHash = hashToken(oldToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldTokenHash },
  });

  if (!existingToken) {
    return null;
  }

  // Check if already revoked (theft detection)
  if (existingToken.isRevoked) {
    console.warn('⚠️ REFRESH TOKEN ROTATION: Attempt to rotate revoked token!', {
      userId: existingToken.userId,
      deviceId: existingToken.deviceId,
    });
    await revokeAllUserTokens(existingToken.userId, existingToken.deviceId || undefined);
    return null;
  }

  // Check if expired
  if (existingToken.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return null;
  }

  // Generate new token
  const newToken = generateRefreshToken();
  const newTokenHash = hashToken(newToken);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Transaction: revoke old token + create new token
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedBy: newTokenHash,
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: newTokenHash,
        deviceId: options?.deviceId || existingToken.deviceId,
        userAgent: options?.userAgent || existingToken.userAgent,
        ipAddress: options?.ipAddress || existingToken.ipAddress,
        expiresAt,
      },
    }),
  ]);

  return {
    newToken,
    userId: existingToken.userId,
  };
}

/**
 * Revoke a specific refresh token (for logout)
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
}

/**
 * Revoke all refresh tokens for a user (optionally for a specific device)
 * Used for: password change, account compromise, force logout all devices
 */
export async function revokeAllUserTokens(
  userId: number,
  deviceId?: string
): Promise<number> {
  const where: any = {
    userId,
    isRevoked: false,
  };

  if (deviceId) {
    where.deviceId = deviceId;
  }

  const result = await prisma.refreshToken.updateMany({
    where,
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Clean up expired and revoked refresh tokens (maintenance task)
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        // Delete expired tokens older than 30 days
        { expiresAt: { lt: thirtyDaysAgo } },
        // Delete revoked tokens older than 30 days
        { isRevoked: true, revokedAt: { lt: thirtyDaysAgo } },
      ],
    },
  });

  return result.count;
}

/**
 * Get active refresh tokens count for a user
 */
export async function getActiveTokenCount(userId: number): Promise<number> {
  return await prisma.refreshToken.count({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
  });
}

export const refreshTokens = {
  generate: generateRefreshToken,
  hash: hashToken,
  create: createRefreshToken,
  validate: validateRefreshToken,
  rotate: rotateRefreshToken,
  revoke: revokeRefreshToken,
  revokeAllForUser: revokeAllUserTokens,
  cleanup: cleanupExpiredRefreshTokens,
  getActiveCount: getActiveTokenCount,
};
