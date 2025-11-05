// ============================================================================
// USERS API ROUTE - UNIFIED AUTH PATTERN
// ============================================================================
// REFACTORED: Now uses unified withAuth wrapper instead of withUserManagementAuth
// This demonstrates the new standardized authentication pattern

import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { usersQuerySchema, userCreateSchema, userUpdateSchema, assertPlanLimit, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { captureAuditContext } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: All users in tenant DB are OUTLET_ADMIN or OUTLET_STAFF
 */
export const GET = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
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
    
    // Build where clause - NO merchantId needed
    const where: any = {};
    
    // Role filtering: Only OUTLET_ADMIN and OUTLET_STAFF exist in tenant DB
    if (q.role) {
      if (q.role === 'MERCHANT' || q.role === 'ADMIN') {
        // These roles don't exist in tenant DB, return empty
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page: q.page || 1,
            limit: q.limit || 20,
            total: 0,
            hasMore: false,
            totalPages: 0
          }
        });
      }
      where.role = q.role;
    }
    
    // Outlet filtering: OUTLET_STAFF can only see their outlet
    if (user.role === 'OUTLET_STAFF' && user.outletId) {
      where.outletId = user.outletId;
    } else if (q.outletId) {
      where.outletId = q.outletId;
    }
    
    // Active status filtering
    if (q.isActive !== undefined) {
      where.isActive = q.isActive;
    }
    
    // Search filtering
    if (q.search) {
      where.OR = [
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } }
      ];
    }
    
    const pageNum = q.page || 1;
    const limitNum = q.limit || 20;
    const skip = (pageNum - 1) * limitNum;
    
    console.log('🔄 Querying users with where clause:', where);
    
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { outlet: true },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip
      }),
      db.user.count({ where })
    ]);
    
    console.log(`✅ Retrieved ${users.length} users (total: ${total})`);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        hasMore: skip + limitNum < total,
        totalPages: Math.ceil(total / limitNum)
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: Only OUTLET_ADMIN and OUTLET_STAFF can be created in tenant DB
 */
export const POST = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    console.log(`➕ POST /api/users - User: ${user.email} (${user.role})`);

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // In tenant DB, only OUTLET_ADMIN and OUTLET_STAFF roles exist
    if (parsed.data.role === 'ADMIN' || parsed.data.role === 'MERCHANT') {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_ROLE', 'Only OUTLET_ADMIN and OUTLET_STAFF can be created in tenant database'),
        { status: 400 }
      );
    }

    // Remove merchantId if present
    const { merchantId: _, ...userDataWithoutMerchant } = parsed.data;

    const newUser = await db.user.create({
      data: userDataWithoutMerchant as any
    });
    
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const PUT = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
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

    // Check if user exists (NO merchantId validation needed)
    const existingUser = await db.user.findUnique({
      where: { id }
    });
    if (!existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Remove merchantId if present
    const { merchantId: _, ...updateDataWithoutMerchant } = updateData;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateDataWithoutMerchant as any
    });
    
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const DELETE = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    console.log(`🗑️ DELETE /api/users - User: ${user.email} (${user.role})`);

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('id') || '0');

    if (!userId) {
      return NextResponse.json(
        ResponseBuilder.error('USER_ID_REQUIRED', 'User ID is required'),
        { status: 400 }
      );
    }

    // Check if user exists (NO merchantId validation needed)
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });
    if (!existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Soft delete (deactivate)
    await db.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() }
    });
    
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