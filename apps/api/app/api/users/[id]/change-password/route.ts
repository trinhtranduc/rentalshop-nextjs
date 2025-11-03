import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import bcrypt from 'bcryptjs';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/users/[id]/change-password
 * Change user password (All authenticated users can change their own password)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * 
 * Authorization rules:
 * - OUTLET_ADMIN: Can change passwords for users in their outlet
 * - OUTLET_STAFF: Can change passwords for users in their outlet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAnyAuth(async (request: NextRequest, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      console.log('🔐 PATCH /api/users/[id]/change-password - Changing password for user:', params.id);

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
      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json(
            ResponseBuilder.error('PASSWORD_MISMATCH'),
          { status: 400 }
        );
      }

      // Check if user exists using id
      const targetUser = await db.user.findUnique({
        where: { id: numericId }
      });

      if (!targetUser) {
        return NextResponse.json(
            ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // ✅ Authorization check: Ensure user can change password for this target user
      let canChangePassword = false;
      
      if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
        // OUTLET_* can change passwords for users in their outlet
        if (targetUser.outletId && user.outletId && targetUser.outletId === user.outletId) {
          canChangePassword = true;
          console.log(`✅ ${user.role} access granted for password change`);
        }
      }

      if (!canChangePassword) {
        console.log('❌ Access denied for password change:', {
          currentUserRole: user.role,
          targetUserId: numericId,
          userOutletId: user.outletId,
          targetUserOutletId: targetUser.outletId
        });
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to change password for this user'),
          { status: API.STATUS.FORBIDDEN }
        );
      }

    // Note: Current password verification removed - users can change their password without providing current password

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password using Prisma
    await db.user.update({
      where: { id: targetUser.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password changed successfully for user:', targetUser.email);

    return NextResponse.json({
      success: true,
      code: 'PASSWORD_CHANGED_SUCCESS',
      message: 'Password changed successfully'
    });

  } catch (error) {
      console.error('❌ Error changing password:', error);
      return NextResponse.json(
        ResponseBuilder.error('CHANGE_PASSWORD_FAILED', 'Failed to change password'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}
