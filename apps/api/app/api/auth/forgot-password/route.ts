import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { db, createPasswordResetToken } from '@rentalshop/database';
import { sendPasswordResetEmail } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const forgetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ============================================================================
// FORGOT PASSWORD API ROUTE
// ============================================================================

/**
 * POST /api/auth/forgot-password
 * Request password reset for a user account
 * 
 * Pattern: Follows same structure as register route
 * - Input validation with schema
 * - Security: Don't reveal if email exists
 * - Create reset token
 * - Send reset email
 * - Always return success (security best practice)
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    // ============================================================================
    // STEP 1: PARSE REQUEST BODY
    // ============================================================================
    // Handle different content types (application/json or text/plain)
    // Some browsers send text/plain, so we read as text first then parse JSON
    const text = await request.text();
    let body: any;
    
    try {
      // Try to parse as JSON (works for both application/json and text/plain with JSON content)
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_REQUEST'),
        { status: 400 }
      );
    }
    
    // ============================================================================
    // STEP 2: VALIDATE INPUT
    // ============================================================================
    const validatedData = forgetPasswordSchema.parse(body);
    
    // ============================================================================
    // STEP 3: PRE-CHECKS - Find user by email
    // ============================================================================
    const user = await db.users.findByEmail(validatedData.email);
    
    // Security: Don't reveal if email exists (security best practice)
    // Always return success to prevent email enumeration attacks
    // Allow password reset for all users (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json(
        ResponseBuilder.success('PASSWORD_RESET_LINK_SENT', {
          message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
        })
      );
    }

    // ============================================================================
    // STEP 4: BUSINESS LOGIC - Create password reset token
    // ============================================================================
    // Create password reset token (24 hour expiry)
    const passwordReset = await createPasswordResetToken(user.id, user.email, 24);
    
    // ============================================================================
    // STEP 5: SEND PASSWORD RESET EMAIL
    // ============================================================================
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        userName,
        passwordReset.token
      );

      // Don't fail the request if email fails - return success anyway (security best practice)
      // The token is still created, user can request another email if needed
    } catch (error) {
      // Don't fail the request - return success anyway (security best practice)
      // The token is still created, user can request another email if needed
    }

    // ============================================================================
    // STEP 6: RETURN SUCCESS RESPONSE
    // ============================================================================
    // Always return success (security best practice - don't reveal if email exists)
    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_RESET_LINK_SENT', {
        message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
      })
    );
    
  } catch (error: any) {
    // ============================================================================
    // ERROR HANDLING
    // ============================================================================
    // Error will be automatically logged by withApiLogging wrapper
    // Use unified error handling system (same pattern as register route)
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

