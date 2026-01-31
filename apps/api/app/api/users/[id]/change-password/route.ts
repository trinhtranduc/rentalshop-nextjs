import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth, hashPassword } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import {API, USER_ROLE} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Handle both sync and async params (Next.js 13+ compatibility)
  const resolvedParams = await Promise.resolve(params);
  
  return withApiLogging(
    withAnyAuth(async (request: NextRequest, { user, userScope }) => {
      try {
        const currentUser = user;

    const { id } = resolvedParams;
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
    
    if (currentUser.role === USER_ROLE.ADMIN) {
      // ADMIN can change any user's password
      canChangePassword = true;
    } else if (currentUser.role === USER_ROLE.MERCHANT) {
      // MERCHANT can change passwords for users in their merchant
      if (targetMerchantId && userScope.merchantId && targetMerchantId === userScope.merchantId) {
        canChangePassword = true;
      }
    } else if (currentUser.role === USER_ROLE.OUTLET_ADMIN || currentUser.role === USER_ROLE.OUTLET_STAFF) {
      // OUTLET_* can change passwords for users in their outlet
      // Compare both outletId (direct field) and outlet.id (relation) with userScope.outletId
      if (targetOutletId && userScope.outletId && targetOutletId === userScope.outletId) {
        canChangePassword = true;
      }
    }

    if (!canChangePassword) {
      return NextResponse.json(
        ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Note: Current password verification removed - users can change their password without providing current password

    // Hash new password using centralized password hashing
    let hashedPassword: string;
    try {
      hashedPassword = await hashPassword(newPassword);
    } catch (hashError: any) {
      return NextResponse.json(
        ResponseBuilder.error('PASSWORD_HASH_FAILED'),
        { status: 500 }
      );
    }

    // Update password using user ID
    // Validate targetUser.id is a number
    if (!targetUser.id || typeof targetUser.id !== 'number') {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_USER_ID'),
        { status: 400 }
      );
    }

    let updatedUser: any;
    try {
      updatedUser = await db.users.update(targetUser.id, {
        password: hashedPassword,
        passwordChangedAt: new Date() // Invalidate all existing tokens
    });
    } catch (updateError: any) {
      return NextResponse.json(
        ResponseBuilder.error('PASSWORD_UPDATE_FAILED'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ResponseBuilder.success('PASSWORD_CHANGED_SUCCESS', {
        message: 'Password changed successfully',
        userId: updatedUser.id
      })
    );

      } catch (error: any) {
        // Error will be automatically logged by withApiLogging wrapper
        // Use unified error handling system
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    })
  )(request);
}
