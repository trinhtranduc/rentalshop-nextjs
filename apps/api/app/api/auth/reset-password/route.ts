import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

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
    
    // TODO: Implement password reset logic
    // 1. Validate reset token
    // 2. Check if token is expired
    // 3. Update user password
    // 4. Invalidate reset token
    // 5. Log the password change
    
    console.log('Password reset with token:', validatedData.token);
    
    return NextResponse.json({
      success: true,
      code: 'PASSWORD_RESET_SUCCESS', message: 'Password has been reset successfully'
    });
    
  } catch (error: any) {
    console.error('Reset password error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 