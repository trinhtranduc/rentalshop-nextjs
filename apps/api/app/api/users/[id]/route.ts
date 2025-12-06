import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/users/[id]
 * Get user by ID
 * 
 * Authorization: All roles with 'users.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.view' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['users.view'])(async (request, { user, userScope }) => {
    try {
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
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {

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

      // Note: Hard delete - if user doesn't exist, findById will return null and we handle it above

      // Check if user is being deactivated (isActive changed from true to false)
      const isBeingDeactivated = existingUser.isActive && body.isActive === false;

      // Update the user using the simplified database API
      const updatedUser = await db.users.update(userId, body);
      console.log('✅ User updated successfully:', updatedUser);

      // If user is being deactivated, invalidate all their sessions to force logout
      if (isBeingDeactivated) {
        await db.sessions.invalidateAllUserSessions(userId);
        console.log(`🗑️ Deactivated user ${userId}: Invalidated all sessions to force logout`);
      }

      return NextResponse.json({
        success: true,
        data: updatedUser,
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
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {

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

      // Note: Hard delete doesn't need to check deletedAt since user will be permanently removed

      // If user is deleting themselves, hard delete account
      if (userId === user.id) {
        // Invalidate all user sessions to force logout
        await db.sessions.invalidateAllUserSessions(userId);
        console.log(`🗑️ User ${userId} deleting own account: Invalidated all sessions`);
        
        // Hard delete the account (orders.createdById will be set to null to preserve order history)
        const deletedUser = await db.users.delete(userId);
        
        console.log('✅ User account deleted successfully:', deletedUser);
        
        return NextResponse.json({
          success: true,
          data: deletedUser,
          code: 'ACCOUNT_DELETED_SUCCESS',
          message: 'Your account has been deleted successfully'
        });
      }

      // Check if this is the last admin user for the merchant
      if (existingUser.role === USER_ROLE.ADMIN || (existingUser.role === USER_ROLE.MERCHANT && existingUser.merchantId)) {
        const merchantId = existingUser.merchantId;
        const adminCount = await db.users.getStats({
          merchantId: merchantId || null,
          role: existingUser.role,
          isActive: true
        });

        if (adminCount <= 1) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_LAST_ADMIN'),
            { status: API.STATUS.CONFLICT }
          );
        }
      }

      // Invalidate all user sessions to force logout
      await db.sessions.invalidateAllUserSessions(userId);
      console.log(`🗑️ Invalidated all sessions for user ${userId}`);

      // Hard delete user (orders.createdById will be set to null to preserve order history)
      const deletedUser = await db.users.delete(userId);
      console.log('✅ User hard deleted successfully:', deletedUser);

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