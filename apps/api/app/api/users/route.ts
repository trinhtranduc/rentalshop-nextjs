// ============================================================================
// USERS API ROUTE - UNIFIED AUTH PATTERN
// ============================================================================
// REFACTORED: Now uses unified withAuth wrapper instead of withUserManagementAuth
// This demonstrates the new standardized authentication pattern

import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { usersQuerySchema, userCreateSchema, userUpdateSchema, assertPlanLimit, handleApiError } from '@rentalshop/utils';
import { captureAuditContext } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';

export interface UserFilters {
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  isActive?: boolean;
  search?: string;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * GET /api/users
 * Get users with filtering and pagination
 * REFACTORED: Uses unified withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']) pattern
 * Note: OUTLET_STAFF cannot access user management
 */
export const GET = withManagementAuth(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 GET /api/users - User: ${user.email} (${user.role})`);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const parsed = usersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const q = parsed.data as any;
    
    // Use simplified database API
    const searchFilters: any = {
      role: q.role,
      isActive: q.isActive,
      search: q.search,
      page: q.page || 1,
      limit: q.limit || 20
    };

    // Role-based merchant filtering:
    // - ADMIN role: Can see users from all merchants (unless queryMerchantId is specified)
    // - MERCHANT role: Can only see users from their own merchant
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see users from their merchant
    if (user.role === 'ADMIN') {
      // Admins can see all merchants unless specifically filtering by merchant
      searchFilters.merchantId = q.merchantId;
    } else {
      // Non-admin users restricted to their merchant
      searchFilters.merchantId = userScope.merchantId;
    }

    // Role-based outlet filtering:
    // - MERCHANT role: Can see users from all outlets of their merchant (unless queryOutletId is specified)
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see users from their assigned outlet
    if (user.role === 'MERCHANT') {
      // Merchants can see all outlets unless specifically filtering by outlet
      searchFilters.outletId = q.outletId;
    } else if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Outlet users can only see users from their assigned outlet
      searchFilters.outletId = userScope.outletId;
    } else if (user.role === 'ADMIN') {
      // Admins can see all users (no outlet filtering unless specified)
      searchFilters.outletId = q.outletId;
    }

    // If user is MERCHANT, only return OUTLET_ADMIN and OUTLET_STAFF users
    // Do not return other MERCHANT users
    if (user.role === 'MERCHANT') {
      if (!q.role) {
        // If no specific role filter is requested, restrict to outlet-level roles only
        searchFilters.roles = ['OUTLET_ADMIN', 'OUTLET_STAFF'];
        delete searchFilters.role; // Remove single role filter since we're using roles array
        console.log('🔒 MERCHANT user: Restricting to OUTLET_ADMIN and OUTLET_STAFF only');
      } else if (q.role === 'MERCHANT') {
        // If merchant specifically requests MERCHANT role, return empty (merchants shouldn't see other merchants)
        console.log('🚫 MERCHANT user: Blocked request for MERCHANT role users');
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: q.limit || 20,
            total: 0,
            hasMore: false,
            totalPages: 0
          }
        });
      } else if (q.role === 'OUTLET_ADMIN' || q.role === 'OUTLET_STAFF') {
        // Allow these specific role requests from merchant
        console.log(`✅ MERCHANT user: Allowed request for ${q.role} users`);
      }
    }

    console.log('🔄 Using simplified db.users.search() with filters:', searchFilters);
    
    const result = await db.users.search(searchFilters);
    
    console.log(`✅ Retrieved ${result.data.length} users (total: ${result.total})`);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / (result.limit || 20))
      }
    });

  } catch (error) {
    console.error('❌ GET /api/users error:', error);
    return NextResponse.json(
      ResponseBuilder.error('RETRIEVE_USERS_FAILED', 'Failed to retrieve users'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/users
 * Create a new user
 * REFACTORED: Uses unified withAuth pattern
 * Note: OUTLET_STAFF cannot create users
 */
export const POST = withManagementAuth(async (request, { user, userScope }) => {
  try {
    console.log(`➕ POST /api/users - User: ${user.email} (${user.role})`);

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Smart assignment of merchantId and outletId based on role and user permissions
    let merchantId: number | undefined;
    let outletId: number | undefined;

    if (parsed.data.role === 'ADMIN') {
      // ADMIN can be assigned to any merchant/outlet or none
      merchantId = parsed.data.merchantId;
      outletId = parsed.data.outletId;
    } else if (parsed.data.role === 'MERCHANT') {
      // MERCHANT must have merchantId, no outletId
      merchantId = parsed.data.merchantId || userScope.merchantId;
      outletId = undefined;
    } else if (parsed.data.role === 'OUTLET_ADMIN' || parsed.data.role === 'OUTLET_STAFF') {
      // OUTLET users must have both merchantId and outletId
      merchantId = parsed.data.merchantId || userScope.merchantId;
      outletId = parsed.data.outletId || userScope.outletId;
    }

    const userData = {
      ...parsed.data,
      merchantId,
      outletId
    };

    console.log('🔍 POST /api/users: Creating user with data:', userData);
    console.log('🔍 POST /api/users: merchantId:', merchantId, 'outletId:', outletId);

    // Check plan limits before creating user (only for non-ADMIN users)
    if (parsed.data.role !== 'ADMIN' && merchantId) {
      try {
        await assertPlanLimit(merchantId, 'users');
        console.log('✅ Plan limit check passed for users');
      } catch (error: any) {
        console.log('❌ Plan limit exceeded for users:', error.message);
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_EXCEEDED', error.message || 'Plan limit exceeded for users'),
          { status: 403 }
        );
      }
    }

    const newUser = await db.users.create(userData);
    
    console.log(`✅ Created user: ${newUser.email} (ID: ${newUser.id})`);

    return NextResponse.json({
      success: true,
      data: newUser,
      code: 'USER_CREATED_SUCCESS',
        message: 'User created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ POST /api/users error:', error);
    
    // Use unified error handling
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * PUT /api/users
 * Update an existing user
 * REFACTORED: Uses unified withAuth pattern
 */
export const PUT = withManagementAuth(async (request, { user, userScope }) => {
  try {
    console.log(`✏️ PUT /api/users - User: ${user.email} (${user.role})`);

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Get user ID from request body (assuming it's included)
    const { id } = body;
    const updateData = parsed.data;
    
    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('USER_ID_REQUIRED', 'User ID is required in request body'),
        { status: 400 }
      );
    }

    // Check if user exists and is accessible within scope
    const existingUser = await db.users.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Scope validation
    if (userScope.merchantId && existingUser.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('UPDATE_USER_OUT_OF_SCOPE', 'Cannot update user outside your scope'),
        { status: 403 }
      );
    }

    const updatedUser = await db.users.update(id, updateData);
    
    console.log(`✅ Updated user: ${updatedUser.email} (ID: ${updatedUser.id})`);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      code: 'USER_UPDATED_SUCCESS',
        message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ PUT /api/users error:', error);
    return NextResponse.json(
      ResponseBuilder.error('UPDATE_USER_FAILED', 'Failed to update user'),
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/users
 * Delete/deactivate a user
 * REFACTORED: Uses unified withAuth pattern
 */
export const DELETE = withManagementAuth(async (request, { user, userScope }) => {
  try {
    console.log(`🗑️ DELETE /api/users - User: ${user.email} (${user.role})`);

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('id') || '0');

    if (!userId) {
      return NextResponse.json(
        ResponseBuilder.error('USER_ID_REQUIRED', 'User ID is required'),
        { status: 400 }
      );
    }

    // Check if user exists and is accessible within scope
    const existingUser = await db.users.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Scope validation
    if (userScope.merchantId && existingUser.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('DELETE_USER_OUT_OF_SCOPE', 'Cannot delete user outside your scope'),
        { status: 403 }
      );
    }

    // Soft delete (deactivate)
    await db.users.update(userId, { isActive: false, deletedAt: new Date() });
    
    console.log(`✅ Deactivated user: ${existingUser.email} (ID: ${userId})`);

    return NextResponse.json({
      success: true,
      code: 'USER_DEACTIVATED_SUCCESS',
        message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('❌ DELETE /api/users error:', error);
    return NextResponse.json(
      ResponseBuilder.error('DELETE_USER_FAILED', 'Failed to delete user'),
      { status: 500 }
    );
  }
});