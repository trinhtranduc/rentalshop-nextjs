import { NextRequest, NextResponse } from 'next/server';
import { withPermissions, hashPassword } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { userUpdateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API, USER_ROLE } from '@rentalshop/constants';
import { canAccessUser, canAssignRole, isAllowedPlacement, toPublicUser } from '../../../../lib/user-scope';
import { applyUserAccessChange, buildUserAuditContext } from '../../../../lib/user-merchant-assignment';

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

      // Out of the caller's merchant/outlet → answered as not found
      if (!foundUser || !canAccessUser(user, userScope, foundUser)) {
        console.log('❌ User not found in database for userId:', userId);
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json({
        success: true,
        data: toPublicUser(foundUser),
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

      // Validate request body with schema (id comes from URL params, not body)
      const parsed = userUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      // Check if user exists and is in the caller's merchant/outlet
      const existingUser = await db.users.findById(userId);
      if (!existingUser || !canAccessUser(user, userScope, existingUser)) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Role and placement the caller may give
      if (parsed.data.role !== undefined && !canAssignRole(user, parsed.data.role, existingUser.role)) {
        return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
      }
      const placementAllowed = await isAllowedPlacement(
        user,
        userScope,
        { merchantId: parsed.data.merchantId, outletId: parsed.data.outletId },
        (outletId) => db.outlets.findById(outletId)
      );
      if (!placementAllowed) {
        return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
      }

      // Check if user is being deactivated (isActive changed from true to false)
      const isBeingDeactivated = existingUser.isActive && parsed.data.isActive === false;

      // Handle emailVerified: also set emailVerifiedAt timestamp
      const updateData: any = { ...parsed.data };
      // Never store a plain password
      if (typeof updateData.password === 'string' && updateData.password.length > 0) {
        updateData.password = await hashPassword(updateData.password);
      } else {
        delete updateData.password;
      }
      if (updateData.emailVerified === true && !existingUser.emailVerified) {
        updateData.emailVerifiedAt = new Date();
      } else if (updateData.emailVerified === false) {
        updateData.emailVerifiedAt = null;
      }

      // Moving to another merchant (ADMIN only), outlet and role changes (#443)
      const access = await applyUserAccessChange(user, existingUser, updateData);
      if (!access.ok) {
        return NextResponse.json(ResponseBuilder.error(access.code), { status: access.status });
      }

      // Update the user using the simplified database API (use parsed data)
      const updatedUser = await db.users.update(userId, updateData);

      await createAuditHelper(prisma).logUpdate({
        entityType: 'User',
        entityId: String(userId),
        entityName: updatedUser.email,
        oldValues: toPublicUser(existingUser),
        newValues: toPublicUser(updatedUser),
        description: access.accessChanged ? `User access changed: ${updatedUser.email}` : `User updated: ${updatedUser.email}`,
        context: buildUserAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log update failed:', err));

      // Deactivation, or a new merchant/outlet/role, takes effect on the next sign-in
      if (isBeingDeactivated || access.accessChanged) {
        await db.sessions.invalidateAllUserSessions(userId);
        console.log(`🗑️ User ${userId}: invalidated all sessions (deactivated or access changed)`);
      }

      return NextResponse.json({
        success: true,
        data: toPublicUser(updatedUser),
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

      // Check if user exists and is in the caller's merchant/outlet
      const existingUser = await db.users.findById(userId);
      if (!existingUser || !canAccessUser(user, userScope, existingUser)) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Note: Hard delete doesn't need to check deletedAt since user will be permanently removed

      // If user is deleting themselves, soft delete account
      if (userId === user.id) {
        // Invalidate all user sessions to force logout
        await db.sessions.invalidateAllUserSessions(userId);
        console.log(`🗑️ User ${userId} deleting own account: Invalidated all sessions`);
        
        // Soft delete the account (preserves order history and frees addon slot)
        // Soft deleted users are automatically excluded from queries and plan limit counts
        const deletedUser = await db.users.softDelete(userId);
        
        console.log('✅ User account deleted successfully:', deletedUser);
        
        return NextResponse.json({
          success: true,
          data: toPublicUser(deletedUser),
          code: 'ACCOUNT_DELETED_SUCCESS',
          message: 'Your account has been deleted successfully'
        });
      }

      // Check if this is the last admin user for the merchant
      // ADMIN role users (system admins) can always be deleted (they don't belong to a merchant)
      // Only check for MERCHANT role users (merchant admins)
      if (existingUser.role === USER_ROLE.MERCHANT && existingUser.merchantId) {
        const merchantId = existingUser.merchantId;
        const adminCount = await db.users.getStats({
          merchantId: merchantId,
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
      
      // For ADMIN role users (system admins), allow deletion without merchant checks
      // They don't belong to a merchant, so no plan limit or merchant validation needed

      // Invalidate all user sessions to force logout
      await db.sessions.invalidateAllUserSessions(userId);
      console.log(`🗑️ Invalidated all sessions for user ${userId}`);

      // Hard delete user (permanently removes from database)
      // Order history preserved: Order.createdById is SET NULL on user deletion (schema onDelete: SetNull)
      await db.users.delete(userId);
      console.log('✅ User hard deleted successfully:', userId);

      return NextResponse.json({
        success: true,
        data: { id: userId },
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