import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth, withMerchantAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAnyAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/users/[id] - Looking for user with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);
      
      // Get user using the simplified database API
      const foundUser = await db.users.findById(userId);

      if (!foundUser) {
        console.log('❌ User not found in database for userId:', userId);
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ User found:', foundUser);

      return NextResponse.json({
        success: true,
        data: foundUser,
        code: 'USER_RETRIEVED_SUCCESS',
        code: 'USER_RETRIEVED_SUCCESS',
        message: 'User retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/users/[id]
 * Update user by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMerchantAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/users/[id] - Update request body:', body);

      // Check if user exists
      const existingUser = await db.users.findById(userId);
      if (!existingUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check if user is being deactivated (isActive changed from true to false)
      const isBeingDeactivated = existingUser.isActive && body.isActive === false;

      // Update the user using the simplified database API
      const updatedUser = await db.users.update(userId, body);
      console.log('✅ User updated successfully:', updatedUser);

      // If user is being deactivated, delete all their sessions to force logout
      if (isBeingDeactivated) {
        const { prisma } = await import('@rentalshop/database');
        const deletedSessionsCount = await prisma.userSession.deleteMany({
          where: { userId: userId }
        });
        console.log(`🗑️ Deactivated user ${userId}: Deleted ${deletedSessionsCount.count} session(s) to force logout`);
      }

      return NextResponse.json({
        success: true,
        data: updatedUser,
        code: 'USER_UPDATED_SUCCESS',
        code: 'USER_UPDATED_SUCCESS',
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/users/[id]
 * Delete user by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMerchantAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);

      // Check if user exists
      const existingUser = await db.users.findById(userId);
      if (!existingUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_DELETE_SELF', 'You cannot delete your own account. Please contact another administrator.'),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Check if this is the last admin user for the merchant
      if (existingUser.role === 'ADMIN' || (existingUser.role === 'MERCHANT' && existingUser.merchantId)) {
        const merchantId = existingUser.merchantId;
        const adminCount = await db.users.getStats({
          merchantId: merchantId || null,
          role: existingUser.role,
          isActive: true
        });

        if (adminCount <= 1) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_LAST_ADMIN', 'Cannot delete the last administrator. Please assign another administrator first.'),
            { status: API.STATUS.CONFLICT }
          );
        }
      }

      // Soft delete by setting isActive to false and deletedAt
      const deletedUser = await db.users.update(userId, { 
        isActive: false,
        deletedAt: new Date()
      });
      console.log('✅ User soft deleted successfully:', deletedUser);

      return NextResponse.json({
        success: true,
        data: deletedUser,
        code: 'USER_DELETED_SUCCESS',
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}