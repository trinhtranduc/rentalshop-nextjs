import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    
    // TODO: Implement password reset logic
    // 1. Validate reset token
    // 2. Check if token is expired
    // 3. Update user password
    // 4. Invalidate reset token
    // 5. Log the password change
    
    console.log('Password reset with token:', validatedData.token);
    
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
    
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Handle specific errors
    if (error.message === 'Invalid or expired reset token') {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired reset token'
      }, { status: 400 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 