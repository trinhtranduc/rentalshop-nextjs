import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import { findUserByPublicId } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * PATCH /api/users/[id]/change-password
 * Change user password (Admin or self)
 * 
 * For admin password changes: Only requires { newPassword }
 * For self password changes: Requires { newPassword, confirmPassword }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 PATCH /api/users/[id]/change-password - Changing password for user:', params.id);
    
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }

    const currentUser = authResult.user;

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
    const targetUser = await findUserByPublicId(numericId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Security check: Only allow if:
    // 1. Current user is admin, OR
    // 2. Current user is changing their own password
    const isAdmin = currentUser.role === 'ADMIN';
    // For now, only allow admins to change passwords until we can get currentUser.id
    const isSelf = false; // TODO: Fix when verifyTokenSimple returns id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, message: 'You can only change your own password' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

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
        error: 'Failed to change password',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
