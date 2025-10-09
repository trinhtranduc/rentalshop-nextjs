import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * POST /api/auth/change-password - Change current user's password
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔐 POST /api/auth/change-password - User: ${user.email}`);
  
  try {

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate input
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Get current user from database to verify current password
    const currentUser = await db.users.findById(user.id);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
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
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
