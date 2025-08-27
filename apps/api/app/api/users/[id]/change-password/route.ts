import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import { findUserByPublicId } from '@rentalshop/database';

/**
 * PATCH /api/users/[publicId]/change-password
 * Change user password (Admin or self)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { publicId: number } }
) {
  try {
    console.log('🔐 PATCH /api/users/[publicId]/change-password - Changing password for user:', params.publicId);
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const currentUser = await verifyTokenSimple(token);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { publicId } = params;
    const body = await request.json();
    const { newPassword, confirmPassword } = body;

    // Validate public ID format (should be numeric)
    const numericId = parseInt(publicId);
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

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Check if user exists using publicId
    const targetUser = await findUserByPublicId(numericId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Security check: Only allow if:
    // 1. Current user is admin, OR
    // 2. Current user is changing their own password
    const isAdmin = currentUser.role === 'ADMIN';
    // For now, only allow admins to change passwords until we can get currentUser.publicId
    const isSelf = false; // TODO: Fix when verifyTokenSimple returns publicId

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, message: 'You can only change your own password' },
        { status: 403 }
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
      { status: 500 }
    );
  }
}
