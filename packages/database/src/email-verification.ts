// ============================================================================
// EMAIL VERIFICATION DATABASE OPERATIONS
// ============================================================================

import { prisma } from './client';
import { randomBytes } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailVerificationToken {
  id: number;
  userId: number;
  token: string;
  email: string;
  verified: boolean;
  verifiedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// EMAIL VERIFICATION OPERATIONS
// ============================================================================

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create email verification record
 */
export async function createEmailVerification(
  userId: number,
  email: string,
  expiresInHours: number = 24
): Promise<EmailVerificationToken> {
  const token = generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Invalidate any existing unverified tokens for this user
  // Explicitly construct data object to prevent any extra fields (like 'status') from being passed
  const updateData: {
    verified: boolean;
    verifiedAt: Date;
  } = {
    verified: true, // Mark as used/invalid
    verifiedAt: new Date(),
  };
  
  await prisma.emailVerification.updateMany({
    where: {
      userId,
      verified: false,
      expiresAt: { gt: new Date() }, // Not expired yet
    },
    data: updateData,
  });

  // Create new verification token
  const verification = await prisma.emailVerification.create({
    data: {
      userId,
      token,
      email,
      expiresAt,
    },
  });

  return verification;
}

/**
 * Verify email using token
 */
export async function verifyEmailByToken(
  token: string
): Promise<{ success: boolean; user?: { id: number; email: string }; error?: string }> {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verification) {
    return {
      success: false,
      error: 'Token không hợp lệ hoặc không tồn tại',
    };
  }

  if (verification.verified) {
    return {
      success: false,
      error: 'Token đã được sử dụng',
    };
  }

  if (new Date() > verification.expiresAt) {
    return {
      success: false,
      error: 'Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực',
    };
  }

  // Update verification record
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      verifiedAt: new Date(),
    },
  });

  // Update user email verified status
  const user = await prisma.user.update({
    where: { id: verification.userId },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    } as any,
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

/**
 * Get verification token by userId
 */
export async function getVerificationTokenByUserId(
  userId: number
): Promise<EmailVerificationToken | null> {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      verified: false,
      expiresAt: { gt: new Date() }, // Not expired
    },
    orderBy: { createdAt: 'desc' },
  });

  return verification;
}

/**
 * Resend verification email (create new token)
 */
export async function resendVerificationToken(
  userId: number,
  email: string
): Promise<EmailVerificationToken> {
  return await createEmailVerification(userId, email);
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true } as any,
  });

  return (user as any)?.emailVerified || false;
}

/**
 * Delete expired verification tokens (cleanup job)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      verified: false,
    },
  });

  return result.count;
}

