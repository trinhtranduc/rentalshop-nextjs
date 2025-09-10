import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { softDeleteUser } from '@rentalshop/database';

/**
 * POST /api/users/delete-account
 * Soft delete the current user's account
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Get the user ID to delete from the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Check if user is trying to delete their own account
    if (user.publicId !== userId) {
      return NextResponse.json(
        { success: false, message: 'You can only delete your own account' },
        { status: 403 }
      );
    }

    // Soft delete the user
    const deletedUser = await softDeleteUser(userId);

    console.log('✅ User account soft deleted successfully:', {
      deletedUserId: userId,
      deletedUser: deletedUser.publicId
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        id: deletedUser.publicId,
        email: deletedUser.email,
        isActive: deletedUser.isActive,
        deletedAt: deletedUser.deletedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/users/delete-account:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('already deleted')) {
      return NextResponse.json(
        { success: false, message: 'Account is already deleted' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete account', error: error.message },
      { status: 500 }
    );
  }
}
