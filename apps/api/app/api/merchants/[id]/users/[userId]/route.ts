import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess, hashPassword } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder, userUpdateSchema } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { canAccessUser, canAssignRole, isAllowedPlacement, toPublicUser } from '../../../../../../lib/user-scope';

/**
 * GET /api/merchants/[id]/users/[userId]
 * Get user by ID
 * 
 * Authorization: All roles with 'users.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.view' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withPermissions(['users.view'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const foundUser = await db.users.findById(userPublicId);
      // The user must belong to this merchant and to the caller's scope
      if (!foundUser || foundUser.merchantId !== merchant.id || !canAccessUser(user, userScope, foundUser)) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Note: Hard delete - if user doesn't exist, findById will return null and we handle it above

      return NextResponse.json({ success: true, data: toPublicUser(foundUser) });
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/users/[userId]
 * Update user
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const existing = await db.users.findById(userPublicId);
      // The user must belong to this merchant and to the caller's scope
      if (!existing || existing.merchantId !== merchant.id || !canAccessUser(user, userScope, existing)) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Note: Hard delete - if user doesn't exist, findById will return null and we handle it above

      const parsed = userUpdateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      if (parsed.data.role !== undefined && !canAssignRole(user, parsed.data.role, existing.role)) {
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
      const updateData: any = { ...parsed.data };
      // Never store a plain password
      if (typeof updateData.password === 'string' && updateData.password.length > 0) {
        updateData.password = await hashPassword(updateData.password);
      } else {
        delete updateData.password;
      }
      const updatedUser = await db.users.update(userPublicId, updateData);

      return NextResponse.json({ success: true, data: toPublicUser(updatedUser) });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/merchants/[id]/users/[userId]
 * Delete user (soft delete)
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const existing = await db.users.findById(userPublicId);
      // The user must belong to this merchant and to the caller's scope
      if (!existing || existing.merchantId !== merchant.id || !canAccessUser(user, userScope, existing)) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Check if user is already soft deleted
      if (existing.deletedAt) {
        return NextResponse.json(
          ResponseBuilder.error('USER_ALREADY_DELETED'),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete user (sets deletedAt and isActive = false)
      // This preserves order history (createdById remains) and frees up addon slot
      // Soft deleted users are automatically excluded from:
      // - User listing queries (deletedAt = null filter)
      // - Plan limit counts (deletedAt = null in getCurrentEntityCounts)
      // - Login attempts (deletedAt check in auth)
      
      // Invalidate all user sessions first
      await db.sessions.invalidateAllUserSessions(userPublicId);
      console.log(`🗑️ Invalidated all sessions for user ${userPublicId}`);

      // Soft delete user (preserves order history and frees addon slot)
      const deletedUser = await db.users.softDelete(userPublicId);

      return NextResponse.json({
        success: true,
        code: 'USER_DELETED_SUCCESS',
        message: 'User deleted successfully',
        data: toPublicUser(deletedUser)
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}