// ============================================================================
// USERS API ROUTE - UNIFIED AUTH PATTERN
// ============================================================================
// REFACTORED: Now uses unified withAuth wrapper instead of withUserManagementAuth
// This demonstrates the new standardized authentication pattern

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth'; // Direct import to avoid conflicts
import { db } from '@rentalshop/database';
import { usersQuerySchema, userCreateSchema, userUpdateSchema } from '@rentalshop/utils';
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
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 GET /api/users - User: ${user.email} (${user.role})`);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const parsed = usersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const q = parsed.data as any;
    
    // Use simplified database API
    const searchFilters = {
      merchantId: userScope.merchantId,
      outletId: userScope.outletId,
      role: q.role,
      isActive: q.isActive,
      search: q.search,
      page: q.page || 1,
      limit: q.limit || 20
    };

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
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('❌ GET /api/users error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve users'
    }, { status: 500 });
  }
});

/**
 * POST /api/users
 * Create a new user
 * REFACTORED: Uses unified withAuth pattern
 * Note: OUTLET_STAFF cannot create users
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    console.log(`➕ POST /api/users - User: ${user.email} (${user.role})`);

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid user data',
        error: parsed.error.flatten()
      }, { status: 400 });
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

    const newUser = await db.users.create(userData);
    
    console.log(`✅ Created user: ${newUser.email} (ID: ${newUser.id})`);

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ POST /api/users error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create user'
    }, { status: 500 });
  }
});

/**
 * PUT /api/users
 * Update an existing user
 * REFACTORED: Uses unified withAuth pattern
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    console.log(`✏️ PUT /api/users - User: ${user.email} (${user.role})`);

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid update data',
        error: parsed.error.flatten()
      }, { status: 400 });
    }

    // Get user ID from request body (assuming it's included)
    const { id } = body;
    const updateData = parsed.data;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required in request body'
      }, { status: 400 });
    }

    // Check if user exists and is accessible within scope
    const existingUser = await db.users.findById(id);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Scope validation
    if (userScope.merchantId && existingUser.merchantId !== userScope.merchantId) {
      return NextResponse.json({
        success: false,
        message: 'Cannot update user outside your scope'
      }, { status: 403 });
    }

    const updatedUser = await db.users.update(id, updateData);
    
    console.log(`✅ Updated user: ${updatedUser.email} (ID: ${updatedUser.id})`);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ PUT /api/users error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update user'
    }, { status: 500 });
  }
});

/**
 * DELETE /api/users
 * Delete/deactivate a user
 * REFACTORED: Uses unified withAuth pattern
 */
export const DELETE = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    console.log(`🗑️ DELETE /api/users - User: ${user.email} (${user.role})`);

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('id') || '0');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Check if user exists and is accessible within scope
    const existingUser = await db.users.findById(userId);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Scope validation
    if (userScope.merchantId && existingUser.merchantId !== userScope.merchantId) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete user outside your scope'
      }, { status: 403 });
    }

    // Soft delete (deactivate)
    await db.users.update(userId, { isActive: false, deletedAt: new Date() });
    
    console.log(`✅ Deactivated user: ${existingUser.email} (ID: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('❌ DELETE /api/users error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete user'
    }, { status: 500 });
  }
});