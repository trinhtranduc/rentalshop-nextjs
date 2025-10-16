import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
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
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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
        code: 'USER_RETRIEVED_SUCCESS', message: 'User retrieved successfully'
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
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
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

      // Update the user using the simplified database API
      const updatedUser = await db.users.update(userId, body);
      console.log('✅ User updated successfully:', updatedUser);

      return NextResponse.json({
        success: true,
        data: updatedUser,
        code: 'USER_UPDATED_SUCCESS',
        code: 'USER_UPDATED_SUCCESS', message: 'User updated successfully'
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
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
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

      // Soft delete by setting isActive to false
      const deletedUser = await db.users.update(userId, { isActive: false });
      console.log('✅ User soft deleted successfully:', deletedUser);

      return NextResponse.json({
        success: true,
        data: deletedUser,
        code: 'USER_DELETED_SUCCESS',
        code: 'USER_DELETED_SUCCESS', message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}