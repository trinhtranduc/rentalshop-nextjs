import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, verifyEmailByToken } from '@rentalshop/database';
import { generateToken } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/verify-email
 * Verify user email using verification token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = verifyEmailSchema.parse(body);
    
    // Verify email using token
    const result = await verifyEmailByToken(validatedData.token);
    
    if (!result.success || !result.user) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_VERIFICATION_FAILED'),
        { status: 400 }
      );
    }

    // Get full user data
    const user = await db.users.findById(result.user.id);
    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Generate JWT token now that email is verified
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      ResponseBuilder.success('EMAIL_VERIFIED_SUCCESS', {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: (user as any).emailVerified || true,
        },
        token,
      })
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email via GET (for email links)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        ResponseBuilder.error('TOKEN_REQUIRED'),
        { status: 400 }
      );
    }
    
    // Verify email using token
    const result = await verifyEmailByToken(token);
    
    if (!result.success || !result.user) {
      // Redirect to client app with error
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${clientUrl}/verify-email?error=${encodeURIComponent(result.error || 'Token không hợp lệ')}`
      );
    }

    // Get full user data
    const user = await db.users.findById(result.user.id);
    if (!user) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${clientUrl}/verify-email?error=${encodeURIComponent('User không tồn tại')}`
      );
    }
    
    // Ensure emailVerified is set
    const userWithVerification = user as any;

    // Generate JWT token
    const token_jwt = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Redirect to client app with success and token
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${clientUrl}/verify-email?success=true&token=${encodeURIComponent(token_jwt)}`
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const errorMessage = error.message || 'Lỗi xác thực email';
    return NextResponse.redirect(
      `${clientUrl}/verify-email?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export async function resendVerification(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = z.object({ email: z.string().email() }).parse(body);
    
    // Find user by email
    const user = await db.users.findByEmail(email);
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
        ResponseBuilder.error('EMAIL_ALREADY_VERIFIED'),
        { status: 400 }
      );
    }

    // Create new verification token
    const { createEmailVerification, resendVerificationToken } = await import('@rentalshop/database');
    const verification = await resendVerificationToken(user.id, user.email);
    
    // Send verification email
    const { sendVerificationEmail } = await import('@rentalshop/utils');
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const emailResult = await sendVerificationEmail(
      user.email,
      userName,
      verification.token
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_SEND_FAILED'),
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

