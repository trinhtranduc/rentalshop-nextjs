import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth, hashPassword } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
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
  return withAnyAuth(async (request: NextRequest, { user, userScope }) => {
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
    
    // Get outletId from targetUser (can be from outletId field or outlet.id relation)
    const targetOutletId = targetUser.outletId || (targetUser.outlet as any)?.id;
    const targetMerchantId = targetUser.merchantId || (targetUser.merchant as any)?.id;
    
    console.log('🔍 Authorization check:', {
      currentUserRole: currentUser.role,
      currentUserMerchantId: userScope.merchantId,
      currentUserOutletId: userScope.outletId,
      targetUserId: numericId,
      targetUserMerchantId: targetMerchantId,
      targetUserOutletId: targetOutletId,
      targetUserOutletIdField: targetUser.outletId,
      targetUserOutletRelation: targetUser.outlet?.id
    });
    
    if (currentUser.role === 'ADMIN') {
      // ADMIN can change any user's password
      canChangePassword = true;
      console.log('✅ ADMIN access granted for password change');
    } else if (currentUser.role === 'MERCHANT') {
      // MERCHANT can change passwords for users in their merchant
      if (targetMerchantId && userScope.merchantId && targetMerchantId === userScope.merchantId) {
        canChangePassword = true;
        console.log('✅ MERCHANT access granted for password change');
      } else {
        console.log('❌ MERCHANT access denied - merchant mismatch:', {
          targetMerchantId,
          userScopeMerchantId: userScope.merchantId
        });
      }
    } else if (currentUser.role === 'OUTLET_ADMIN' || currentUser.role === 'OUTLET_STAFF') {
      // OUTLET_* can change passwords for users in their outlet
      // Compare both outletId (direct field) and outlet.id (relation) with userScope.outletId
      if (targetOutletId && userScope.outletId && targetOutletId === userScope.outletId) {
        canChangePassword = true;
        console.log(`✅ ${currentUser.role} access granted for password change`);
      } else {
        console.log(`❌ ${currentUser.role} access denied - outlet mismatch:`, {
          targetOutletId,
          userScopeOutletId: userScope.outletId,
          targetUserOutletIdField: targetUser.outletId,
          targetUserOutletRelation: targetUser.outlet?.id
        });
      }
    }

    if (!canChangePassword) {
      console.log('❌ Access denied for password change:', {
        currentUserRole: currentUser.role,
        targetUserId: numericId,
        userScope: userScope,
        targetUserMerchantId: targetMerchantId,
        targetUserOutletId: targetOutletId
      });
      return NextResponse.json(
        ResponseBuilder.error('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to change password for this user'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Note: Current password verification removed - users can change their password without providing current password

    // Hash new password using centralized password hashing
    console.log('🔐 Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);
    console.log('✅ Password hashed successfully');

    // Update password using user ID
    console.log('💾 Updating password for user ID:', targetUser.id);
    const updatedUser = await db.users.update(targetUser.id, {
      password: hashedPassword
    });

    console.log('✅ Password changed successfully for user:', targetUser.email);

    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_CHANGED_SUCCESS', {
        message: 'Password changed successfully',
        userId: updatedUser.id
      })
    );

  } catch (error: any) {
      console.error('❌ Error changing password:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        name: error?.name
      });
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
