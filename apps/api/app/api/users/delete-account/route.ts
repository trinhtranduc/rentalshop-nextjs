import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { softDeleteUser } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * POST /api/users/delete-account
 * Soft delete the current user's account
 * REFACTORED: Now uses unified withAuthRoles pattern for all authenticated users
 */
export const POST = withAuthRoles()(async (request, { user, userScope }) => {
  console.log(`🗑️ POST /api/users/delete-account - User: ${user.email}`);
  
  try {
    // Get the user ID to delete from the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Valid user ID is required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Check if user is trying to delete their own account
    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, message: 'You can only delete your own account' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Soft delete the user
    const deletedUser = await softDeleteUser(userId);

    console.log('✅ User account soft deleted successfully:', {
      deletedUserId: userId,
      deletedUser: deletedUser.id
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        id: deletedUser.id,
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
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error.message.includes('already deleted')) {
      return NextResponse.json(
        { success: false, message: 'Account is already deleted' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete account', error: error.message },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
