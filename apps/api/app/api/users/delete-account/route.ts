import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
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
        ResponseBuilder.error('VALID_USER_ID_REQUIRED'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Check if user is trying to delete their own account
    if (user.id !== userId) {
      return NextResponse.json(
        ResponseBuilder.error('DELETE_OWN_ACCOUNT_ONLY'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Soft delete the user
    const deletedUser = await db.users.update(userId, { 
      isActive: false, 
      deletedAt: new Date() 
    });

    console.log('✅ User account soft deleted successfully:', {
      deletedUserId: userId,
      deletedUser: deletedUser.id
    });

    return NextResponse.json({
      success: true,
        code: 'ACCOUNT_DELETED_SUCCESS',
        code: 'ACCOUNT_DELETED_SUCCESS',
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
        ResponseBuilder.error('USER_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error.message.includes('already deleted')) {
      return NextResponse.json(
        ResponseBuilder.error('ACCOUNT_ALREADY_DELETED'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

      return NextResponse.json(
        ResponseBuilder.error('DELETE_ACCOUNT_FAILED', { error: error.message }),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
  }
});
