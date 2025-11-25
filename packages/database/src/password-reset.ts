// ============================================================================
// PASSWORD RESET DATABASE OPERATIONS
// ============================================================================

import { prisma } from './client';
import { randomBytes } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  email: string;
  used: boolean;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// PASSWORD RESET OPERATIONS
// ============================================================================

/**
 * Generate a secure random token for password reset
 */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create password reset record
 */
export async function createPasswordResetToken(
  userId: number,
  email: string,
  expiresInHours: number = 24
): Promise<PasswordResetToken> {
  const token = generatePasswordResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Invalidate any existing unused tokens for this user
  await prisma.passwordReset.updateMany({
    where: {
      userId,
      used: false,
      expiresAt: { gt: new Date() }, // Not expired yet
    },
    data: {
      used: true, // Mark as used/invalid
      usedAt: new Date(),
    },
  });

  // Create new password reset token
  const passwordReset = await prisma.passwordReset.create({
    data: {
      userId,
      token,
      email,
      expiresAt,
    },
  });

  return passwordReset;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ success: boolean; user?: { id: number; email: string }; error?: string }> {
  const passwordReset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!passwordReset) {
    return {
      success: false,
      error: 'Token không hợp lệ hoặc không tồn tại',
    };
  }

  if (passwordReset.used) {
    return {
      success: false,
      error: 'Token đã được sử dụng',
    };
  }

  if (new Date() > passwordReset.expiresAt) {
    return {
      success: false,
      error: 'Token đã hết hạn. Vui lòng yêu cầu gửi lại email đặt lại mật khẩu',
    };
  }

  return {
    success: true,
    user: {
      id: passwordReset.userId,
      email: passwordReset.email,
    },
  };
}

/**
 * Mark password reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  await prisma.passwordReset.update({
    where: { token },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });
}

/**
 * Get password reset token by userId
 */
export async function getPasswordResetTokenByUserId(
  userId: number
): Promise<PasswordResetToken | null> {
  const passwordReset = await prisma.passwordReset.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: { gt: new Date() }, // Not expired
    },
    orderBy: { createdAt: 'desc' },
  });

  return passwordReset;
}

/**
 * Delete expired password reset tokens (cleanup job)
 */
export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  const result = await prisma.passwordReset.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      used: false,
    },
  });

  return result.count;
}

