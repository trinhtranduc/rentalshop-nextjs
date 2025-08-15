import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * PATCH /api/users/[userId]/activate
 * Activate a user (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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

    // Check if user is admin
    try {
      assertAnyRole(currentUser as any, ['ADMIN']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already active
    if (user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User is already active' },
        { status: 400 }
      );
    }

    // Activate user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      message: 'User activated successfully'
    });

  } catch (error) {
    console.error('Error activating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to activate user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
