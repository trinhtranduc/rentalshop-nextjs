import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import bcrypt from 'bcryptjs';
import {API} from '@rentalshop/constants';

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const currentUser = authResult.user;

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
    const user = await prisma.user.findUnique({
      where: { publicId: currentUser.id },
      select: { id: true, password: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password changed successfully for user:', user.email);

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
