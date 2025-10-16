import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import {API} from '@rentalshop/constants';

/**
 * PATCH /api/users/[id]/change-password
 * Change user password (All authenticated users can change their own password)
 * 
 * Authorization rules:
 * - ADMIN: Can change any user's password
 * - MERCHANT: Can change passwords for users in their merchant
 * - OUTLET_ADMIN: Can change passwords for users in their outlet
 * - OUTLET_STAFF: Can change passwords for users in their outlet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, { user, userScope }) => {
    try {
      console.log('🔐 PATCH /api/users/[id]/change-password - Changing password for user:', params.id);
      
      const currentUser = user;

    const { id } = params;
    const body = await request.json();
    const { newPassword, confirmPassword } = body;

    // Validate public ID format (should be numeric)
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
        { status: 400 }
      );
    }

    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
          ResponseBuilder.error('PASSWORD_MIN_LENGTH'),
        { status: 400 }
      );
    }

    // Only validate confirmPassword if it's provided (for self password changes)
    // Admin password changes don't require confirmPassword
    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
          ResponseBuilder.error('PASSWORD_MISMATCH'),
        { status: 400 }
      );
    }

    // Check if user exists using id
    const targetUser = await db.users.findById(numericId);

    if (!targetUser) {
      return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // ✅ Authorization check: Ensure user can change password for this target user
    let canChangePassword = false;
    
    if (currentUser.role === 'ADMIN') {
      // ADMIN can change any user's password
      canChangePassword = true;
      console.log('✅ ADMIN access granted for password change');
    } else if (currentUser.role === 'MERCHANT') {
      // MERCHANT can change passwords for users in their merchant
      if (targetUser.merchantId && userScope.merchantId && targetUser.merchantId === userScope.merchantId) {
        canChangePassword = true;
        console.log('✅ MERCHANT access granted for password change');
      }
    } else if (currentUser.role === 'OUTLET_ADMIN' || currentUser.role === 'OUTLET_STAFF') {
      // OUTLET_* can change passwords for users in their outlet
      if (targetUser.outletId && userScope.outletId && targetUser.outletId === userScope.outletId) {
        canChangePassword = true;
        console.log(`✅ ${currentUser.role} access granted for password change`);
      }
    }

    if (!canChangePassword) {
      console.log('❌ Access denied for password change:', {
        currentUserRole: currentUser.role,
        targetUserId: numericId,
        userScope: userScope,
        targetUserMerchantId: targetUser.merchantId,
        targetUserOutletId: targetUser.outletId
      });
      return NextResponse.json(
        { 
          success: false, 
            code: 'INSUFFICIENT_PERMISSIONS',
            code: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions to change password for this user',
          required: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'],
          current: currentUser.role
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Note: Current password verification removed - users can change their password without providing current password

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password using internal ID
    await db.users.update(targetUser.id, {
      password: hashedPassword
    });

    console.log('✅ Password changed successfully for user:', targetUser.email);

    return NextResponse.json({
      success: true,
        code: 'PASSWORD_CHANGED_SUCCESS',
        code: 'PASSWORD_CHANGED_SUCCESS', message: 'Password changed successfully'
    });

  } catch (error) {
      console.error('❌ Error changing password:', error);
      return NextResponse.json(
        { 
          success: false, 
          code: 'CHANGE_PASSWORD_FAILED',
          code: 'CHANGE_PASSWORD_FAILED', message: 'Failed to change password' 
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}
