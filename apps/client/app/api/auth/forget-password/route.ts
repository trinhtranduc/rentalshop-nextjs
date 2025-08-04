import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const forgetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = forgetPasswordSchema.parse(body);
    
    // TODO: Implement password reset logic
    // 1. Check if user exists
    // 2. Generate reset token
    // 3. Send email with reset link
    // 4. Store reset token in database
    
    console.log('Password reset requested for:', validatedData.email);
    
    // For now, always return success (security best practice)
    // Don't reveal if email exists or not
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
    
  } catch (error: any) {
    console.error('Forget password error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Invalid email address',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 