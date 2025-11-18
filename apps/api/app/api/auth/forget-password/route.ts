import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { db, createPasswordResetToken } from '@rentalshop/database';
import { sendPasswordResetEmail } from '@rentalshop/utils';

const forgetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = forgetPasswordSchema.parse(body);
    
    console.log('🔐 [Forget Password] Password reset requested for:', validatedData.email);
    
    // Find user by email
    const user = await db.users.findByEmail(validatedData.email);
    
    // Security: Only allow password reset for MERCHANT role or users with merchantId
    // Don't reveal if email exists (security best practice)
    if (!user) {
      console.log('ℹ️ [Forget Password] User not found (security: returning success)');
      return NextResponse.json(
        ResponseBuilder.success('PASSWORD_RESET_LINK_SENT', {
          message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
        })
      );
    }

    // Check if user is merchant or has merchantId
    if (user.role !== 'MERCHANT' && !user.merchantId) {
      console.log('⚠️ [Forget Password] User is not a merchant (security: returning success)');
      // Still return success to avoid revealing user existence
      return NextResponse.json(
        ResponseBuilder.success('PASSWORD_RESET_LINK_SENT', {
          message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
        })
      );
    }

    console.log('✅ [Forget Password] User found:', { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      merchantId: user.merchantId
    });

    // Create password reset token (24 hour expiry)
    console.log('🔑 [Forget Password] Creating password reset token...');
    const passwordReset = await createPasswordResetToken(user.id, user.email, 24);
    console.log('✅ [Forget Password] Password reset token created:', { 
      tokenId: passwordReset.id,
      expiresAt: passwordReset.expiresAt 
    });
    
    // Send password reset email
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    console.log('📨 [Forget Password] Sending password reset email...', {
      to: user.email,
      userName,
      provider: process.env.EMAIL_PROVIDER || 'console'
    });
    
    const emailResult = await sendPasswordResetEmail(
      user.email,
      userName,
      passwordReset.token
    );

    console.log('📬 [Forget Password] Email result:', {
      success: emailResult.success,
      error: emailResult.error,
      messageId: emailResult.messageId,
      provider: process.env.EMAIL_PROVIDER
    });

    if (!emailResult.success) {
      console.error('❌ [Forget Password] Failed to send password reset email:', emailResult.error);
      // Don't fail the request - return success anyway (security best practice)
      // The token is still created, user can request another email if needed
    }

    // Always return success (security best practice - don't reveal if email exists)
    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_RESET_LINK_SENT', {
        message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
      })
    );
    
  } catch (error: any) {
    console.error('❌ [Forget Password] Error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 