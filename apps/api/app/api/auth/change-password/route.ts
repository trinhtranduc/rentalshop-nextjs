import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * POST /api/auth/change-password - Change current user's password
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔐 POST /api/auth/change-password - User: ${user.email}`);
  
  try {

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword) {
      return NextResponse.json(
        ResponseBuilder.error('CURRENT_PASSWORD_REQUIRED'),
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        ResponseBuilder.error('PASSWORD_MIN_LENGTH'),
        { status: 400 }
      );
    }

    // Note: confirmPassword validation is done on frontend for better UX
    // No need to validate again on backend

    // Get current user from database to verify current password
    const currentUser = await db.users.findById(user.id);

    if (!currentUser) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        ResponseBuilder.error('CURRENT_PASSWORD_INCORRECT'),
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.users.update(user.id, {
      password: hashedPassword
    });

    console.log('✅ Password changed successfully for user:', user.email);

    return NextResponse.json({
      success: true,
      code: 'PASSWORD_CHANGED_SUCCESS', message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
