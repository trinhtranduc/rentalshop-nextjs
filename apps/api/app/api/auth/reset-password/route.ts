import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { db, verifyPasswordResetToken, markTokenAsUsed } from '@rentalshop/database';
import { hashPassword } from '@rentalshop/auth';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  code: 'PASSWORD_MISMATCH', message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    
    console.log('🔐 [Reset Password] Password reset requested with token');
    
    // Verify password reset token
    const tokenVerification = await verifyPasswordResetToken(validatedData.token);
    
    if (!tokenVerification.success || !tokenVerification.user) {
      console.error('❌ [Reset Password] Invalid or expired token:', tokenVerification.error);
      
      // Return appropriate error based on token status
      if (tokenVerification.error?.includes('hết hạn')) {
        return NextResponse.json(
          ResponseBuilder.error('PASSWORD_RESET_TOKEN_EXPIRED', tokenVerification.error || 'Token đã hết hạn'),
          { status: 400 }
        );
      }
      
      if (tokenVerification.error?.includes('đã được sử dụng')) {
        return NextResponse.json(
          ResponseBuilder.error('PASSWORD_RESET_TOKEN_USED', tokenVerification.error || 'Token đã được sử dụng'),
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        ResponseBuilder.error('PASSWORD_RESET_TOKEN_INVALID', tokenVerification.error || 'Token không hợp lệ'),
        { status: 400 }
      );
    }

    const { user } = tokenVerification;
    console.log('✅ [Reset Password] Token verified for user:', { userId: user.id, email: user.email });

    // Hash new password
    console.log('🔑 [Reset Password] Hashing new password...');
    const hashedPassword = await hashPassword(validatedData.password);

    // Update user password
    console.log('💾 [Reset Password] Updating user password...');
    await db.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark token as used
    console.log('✅ [Reset Password] Marking token as used...');
    await markTokenAsUsed(validatedData.token);
    
    console.log('✅ [Reset Password] Password reset successful for user:', user.id);
    
    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_RESET_SUCCESS', {
        message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.',
      })
    );
    
  } catch (error: any) {
    console.error('❌ [Reset Password] Error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        ResponseBuilder.validationError(error.flatten()),
        { status: 400 }
      );
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 