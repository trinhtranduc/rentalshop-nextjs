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
  await prisma.emailVerification.updateMany({
    where: {
      userId,
      verified: false,
      expiresAt: { gt: new Date() }, // Not expired yet
    },
    data: {
      verified: true, // Mark as used/invalid
      verifiedAt: new Date(),
    },
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
  try {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      console.log('❌ Email verification: Token not found:', token);
      return {
        success: false,
        error: 'Token không hợp lệ hoặc không tồn tại',
      };
    }

    if (verification.verified) {
      console.log('❌ Email verification: Token already used:', token);
      return {
        success: false,
        error: 'Token đã được sử dụng',
      };
    }

    if (new Date() > verification.expiresAt) {
      console.log('❌ Email verification: Token expired:', token);
      return {
        success: false,
        error: 'Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực',
      };
    }

    // Use transaction to ensure both updates succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Update verification record
      const updatedVerification = await tx.emailVerification.update({
        where: { id: verification.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      console.log('✅ Email verification: Verification record updated:', updatedVerification.id);

      // Update user email verified status
      const user = await tx.user.update({
        where: { id: verification.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          emailVerifiedAt: true,
        },
      });

      console.log('✅ Email verification: User updated:', {
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
      });

      // Verify that emailVerified was actually updated
      if (!user.emailVerified) {
        throw new Error(`Failed to update emailVerified for user ${user.id}`);
      }

      return user;
    });

    return {
      success: true,
      user: {
        id: result.id,
        email: result.email,
      },
    };
  } catch (error: any) {
    console.error('❌ Email verification error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Check for Prisma-specific errors
    if (error.code === 'P2025') {
      return {
        success: false,
        error: 'Không tìm thấy user hoặc verification record',
      };
    }

    return {
      success: false,
      error: error.message || 'Lỗi xác thực email. Vui lòng thử lại sau.',
    };
  }
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

