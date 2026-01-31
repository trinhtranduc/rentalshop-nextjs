import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { db, verifyPasswordResetToken, markTokenAsUsed } from '@rentalshop/database';
import { hashPassword } from '@rentalshop/auth';
import { withApiLogging } from '@/lib/api-logging-wrapper';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  code: 'PASSWORD_MISMATCH', message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    
    // Verify password reset token
    const tokenVerification = await verifyPasswordResetToken(validatedData.token);
    
    if (!tokenVerification.success || !tokenVerification.user) {
      // Return appropriate error based on token status
      if (tokenVerification.error?.includes('hết hạn')) {
        return NextResponse.json(
          ResponseBuilder.error('PASSWORD_RESET_TOKEN_EXPIRED'),
          { status: 400 }
        );
      }
      
      if (tokenVerification.error?.includes('đã được sử dụng')) {
        return NextResponse.json(
          ResponseBuilder.error('PASSWORD_RESET_TOKEN_USED'),
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        ResponseBuilder.error('PASSWORD_RESET_TOKEN_INVALID'),
        { status: 400 }
      );
    }

    const { user } = tokenVerification;

    // Hash new password
    const hashedPassword = await hashPassword(validatedData.password);

    // Update user password and set passwordChangedAt to invalidate old tokens
    await db.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date() // Invalidate all existing tokens
      },
    });

    // Mark token as used
    await markTokenAsUsed(validatedData.token);
    
    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_RESET_SUCCESS', {
        message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.',
      })
    );
    
  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        ResponseBuilder.validationError(error.flatten()),
        { status: 400 }
      );
    }
    
    // Error will be automatically logged by withApiLogging wrapper
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}); 
