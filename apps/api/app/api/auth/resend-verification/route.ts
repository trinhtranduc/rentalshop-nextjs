import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, resendVerificationToken } from '@rentalshop/database';
import { sendVerificationEmail } from '@rentalshop/utils';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createRateLimiter } from '@rentalshop/middleware';

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email with rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input first to get email
    const validatedData = resendVerificationSchema.parse(body);
    
    // Apply rate limiting using email as key (prevents spam per email address)
    const emailRateLimiter = createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 requests per 5 minutes per email
      keyGenerator: () => `resend_verification:${validatedData.email}`,
    });
    
    const rateLimitResult = emailRateLimiter(request);
    if (rateLimitResult) {
      const retryAfter = rateLimitResult.headers.get('Retry-After') || '300';
      return NextResponse.json(
        ResponseBuilder.error('RATE_LIMIT_EXCEEDED', 
          `Quá nhiều yêu cầu. Vui lòng đợi ${Math.ceil(parseInt(retryAfter) / 60)} phút trước khi thử lại.`
        ),
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }
    
    // Find user by email
    const user = await db.users.findByEmail(validatedData.email);
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return NextResponse.json(
        ResponseBuilder.success('VERIFICATION_EMAIL_SENT', {
          message: 'Nếu email tồn tại trong hệ thống, một email xác thực đã được gửi.',
        })
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực rồi'),
        { status: 400 }
      );
    }

    // Create new verification token
    const verification = await resendVerificationToken(user.id, user.email);
    
    // Send verification email
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const emailResult = await sendVerificationEmail(
      user.email,
      userName,
      verification.token
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_SEND_FAILED', 'Không thể gửi email xác thực. Vui lòng thử lại sau.'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ResponseBuilder.success('VERIFICATION_EMAIL_SENT', {
        message: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn.',
      })
    );
  } catch (error: any) {
    console.error('Resend verification error:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

