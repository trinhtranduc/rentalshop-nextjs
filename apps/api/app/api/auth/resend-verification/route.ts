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
    console.log('📧 [Resend Verification] Request received:', { email: body.email });
    
    // Validate input first to get email
    const validatedData = resendVerificationSchema.parse(body);
    console.log('✅ [Resend Verification] Input validated:', { email: validatedData.email });
    
    // Apply rate limiting using email as key (prevents spam per email address)
    const emailRateLimiter = createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 requests per 5 minutes per email
      keyGenerator: () => `resend_verification:${validatedData.email}`,
    });
    
    const rateLimitResult = emailRateLimiter(request);
    if (rateLimitResult) {
      const retryAfter = rateLimitResult.headers.get('Retry-After') || '300';
      console.warn('⚠️ [Resend Verification] Rate limit exceeded:', { email: validatedData.email });
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
    console.log('🔍 [Resend Verification] Looking up user by email:', { email: validatedData.email });
    const user = await db.users.findByEmail(validatedData.email);
    if (!user) {
      console.log('ℹ️ [Resend Verification] User not found (security: returning success)');
      // Don't reveal if user exists (security best practice)
      return NextResponse.json(
        ResponseBuilder.success('VERIFICATION_EMAIL_SENT', {
          message: 'Nếu email tồn tại trong hệ thống, một email xác thực đã được gửi.',
        })
      );
    }

    console.log('✅ [Resend Verification] User found:', { 
      userId: user.id, 
      email: user.email, 
      emailVerified: user.emailVerified 
    });

    // Check if already verified
    if (user.emailVerified) {
      console.log('⚠️ [Resend Verification] Email already verified');
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực rồi'),
        { status: 400 }
      );
    }

    // Create new verification token
    console.log('🔑 [Resend Verification] Creating new verification token...');
    const verification = await resendVerificationToken(user.id, user.email);
    console.log('✅ [Resend Verification] Verification token created:', { 
      tokenId: verification.id,
      expiresAt: verification.expiresAt 
    });
    
    // Send verification email
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    console.log('📨 [Resend Verification] Sending verification email...', {
      to: user.email,
      userName,
      provider: process.env.EMAIL_PROVIDER || 'console'
    });
    
    const emailResult = await sendVerificationEmail(
      user.email,
      userName,
      verification.token
    );

    console.log('📬 [Resend Verification] Email result:', {
      success: emailResult.success,
      error: emailResult.error,
      messageId: emailResult.messageId,
      provider: process.env.EMAIL_PROVIDER
    });

    if (!emailResult.success) {
      const errorDetails = emailResult.error || 'Không thể xác định lỗi';
      console.error('❌ [Resend Verification] Failed to send email:', {
        error: errorDetails,
        email: user.email,
        provider: process.env.EMAIL_PROVIDER,
        fullResult: JSON.stringify(emailResult)
      });
      
      // Include the actual error message in the response
      const errorMessage = `Không thể gửi email xác thực. ${errorDetails}`;
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_SEND_FAILED', errorMessage),
        { status: 500 }
      );
    }

    console.log('✅ [Resend Verification] Email sent successfully:', {
      messageId: emailResult.messageId,
      email: user.email
    });

    return NextResponse.json(
      ResponseBuilder.success('VERIFICATION_EMAIL_SENT', {
        message: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn.',
      })
    );
  } catch (error: any) {
    console.error('❌ [Resend Verification] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

