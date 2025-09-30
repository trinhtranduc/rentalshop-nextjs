import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import { findUserById } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * PATCH /api/users/[id]/change-password
 * Change user password (Admin only for now)
 * 
 * TODO: Add self password change capability when user ID matching is fixed
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
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
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Only validate confirmPassword if it's provided (for self password changes)
    // Admin password changes don't require confirmPassword
    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Check if user exists using id
    const targetUser = await findUserById(numericId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Security check: Admin access verified by withAuthRoles
    // TODO: Add self password change capability when user ID matching is implemented

    // Note: Current password verification removed - users can change their password without providing current password

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password using internal ID
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password changed successfully for user:', targetUser.email);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
      console.error('❌ Error changing password:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to change password' 
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}
