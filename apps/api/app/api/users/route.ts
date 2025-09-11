import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withUserManagementAuth } from '@rentalshop/auth';
import { findUserById, findUserByPublicId, createUser, updateUser } from '@rentalshop/database';
import { usersQuerySchema, userCreateSchema, userUpdateSchema } from '@rentalshop/utils';
import { captureAuditContext } from '@rentalshop/middleware';
import { createAuditHelper } from '@rentalshop/utils';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';


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
 * Get users with filtering and pagination (Role-based access)
 */
export const GET = withUserManagementAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized
    // User scope is automatically determined based on role:
    // - ADMIN: no restrictions (can see all users)
    // - MERCHANT: scoped to their merchant
    // - OUTLET_ADMIN: scoped to their outlet
    // - OUTLET_STAFF: automatically denied (no users.manage permission)
    const { user, userScope, request } = authorizedRequest;

    const { searchParams } = new URL(request.url);
    const parsed = usersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const q = parsed.data as any;
    const filters: UserFilters = {
      role: q.role,
      isActive: q.isActive,
      search: q.search,
    };
    const options: UserListOptions = {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy as any,
      sortOrder: q.sortOrder as any,
    };

    // Get users from database
    console.log('🔄 Calling getUsers with scope:', userScope);
    const result = await getUsers(filters, options, userScope);
    console.log('✅ getUsers returned:', { success: !!result, dataKeys: result ? Object.keys(result) : 'no result' });

    const body = JSON.stringify({ success: true, data: result });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304, 
        headers: { 
          ETag: etag, 
          'Cache-Control': 'private, max-age=10, no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      });
    }
    return new NextResponse(body, { 
      status: API.STATUS.OK, 
      headers: { 
        'Content-Type': 'application/json', 
        ETag: etag, 
        'Cache-Control': 'private, max-age=10, no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      } 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * POST /api/users
 * Create a new user (Role-based access)
 */
export const POST = withUserManagementAuth(async (authorizedRequest) => {
  try {
    console.log('🔄 POST /api/users - Creating new user');
    
    // Capture audit context
    const auditContext = await captureAuditContext(authorizedRequest.request);
    
    // User is already authenticated and authorized
    const { user, userScope, request } = authorizedRequest;

    const body = await request.json();
    console.log('📝 Request body received:', body);
    
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      console.log('❌ Validation failed:', parsed.error.flatten());
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    console.log('✅ Validation passed for user data');

    // Create user
    const p = parsed.data;
    
    // Get merchant ID from the authenticated user
    let merchantId: string | undefined;
    if (user.merchant?.id) {
      merchantId = user.merchant.id.toString();
    } else if (user.role === 'ADMIN') {
      // Admin users can create users without a specific merchant (system-wide)
      merchantId = undefined;
    } else {
      console.log('❌ User does not have merchant access');
      return NextResponse.json(
        { success: false, error: 'User does not have merchant access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }
    
    const userData = {
      email: p.email.toLowerCase().trim(),
      password: p.password,
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      phone: p.phone?.trim(),
      role: p.role || 'OUTLET_STAFF',
      merchantId: merchantId, // Include merchant ID for uniqueness checking
    };
    
    console.log('🔄 Creating user with processed data:', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: userData.role,
      merchantId: userData.merchantId,
      hasPassword: !!userData.password
    });
    
    // Check if database functions are available
    if (!createUser) {
      console.error('❌ createUser function is not available');
      return NextResponse.json(
        { success: false, error: 'Database function not available' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    // Note: All uniqueness validation (email + phone) is handled at the database level
    // in the createUser function. This reduces API calls and ensures consistency.
    
    console.log('📡 Calling createUser database function...');
    const newUser = await createUser(userData);
    
    // createUser returns the user object directly, not a structured response
    if (!newUser) {
      console.error('❌ Database returned no user data');
      return NextResponse.json(
        { success: false, error: 'Database error: No user data returned' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    console.log('✅ User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create user';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        if (error.message.includes('email')) {
          errorMessage = 'User with this email already exists in this merchant organization';
        } else if (error.message.includes('phone')) {
          errorMessage = 'User with this phone number already exists in this merchant organization';
        } else {
          errorMessage = 'User with this information already exists in this merchant organization';
        }
        statusCode = 409;
      } else if (error.message.includes('already exists in this merchant organization')) {
        // This catches the specific error messages from our database function
        errorMessage = error.message;
        statusCode = 409;
      } else if (error.message.includes('Validation')) {
        errorMessage = 'Invalid user data provided';
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
});

/**
 * PUT /api/users
 * Update an existing user (Role-based access)
 */
export const PUT = withUserManagementAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized
    // User scope is automatically determined based on role:
    // - ADMIN: no restrictions (can update all users)
    // - MERCHANT: scoped to their merchant
    // - OUTLET_ADMIN: scoped to their outlet
    // - OUTLET_STAFF: automatically denied (no users.manage permission)
    const { user, userScope, request } = authorizedRequest;

    const body = await request.json();
    const { publicId, ...updateData } = body;
    
    // Always use publicId for API operations
    if (!publicId) {
      return NextResponse.json({ success: false, message: 'Public ID is required' }, { status: 400 });
    }

    // Validate update data
    const parsed = userUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsed.error.flatten() }, { status: 400 });
    }

    // Check if database functions are available
    if (!findUserById || !updateUser) {
      console.error('Database functions not available:', { findUserById: !!findUserById, updateUser: !!updateUser });
      return NextResponse.json(
        { success: false, error: 'Database functions not available' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    // Check if user exists using publicId
    const existingUser = await findUserByPublicId(parseInt(publicId));
    
    if (!existingUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: API.STATUS.NOT_FOUND });
    }

    // Validate scope access - ensure user can only update users within their scope
    if (userScope.merchantId && existingUser.merchant?.publicId !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to update user from different merchant', {
        existingUserMerchantId: existingUser.merchant?.publicId,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different organization' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.outletId && existingUser.outlet?.publicId !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to update user from different outlet', {
        existingUserOutletId: existingUser.outlet?.publicId,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Scope validation passed - user can update this user data');

    // Prepare update data for database - firstName and lastName are already in the correct format
    const updateDataForDB = { ...parsed.data };
    
    console.log('Final update data for database:', updateDataForDB);
    
    // Update user using the publicId from existingUser
    const updatedUser = await updateUser(existingUser.publicId, updateDataForDB);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    }, { status: API.STATUS.OK });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * Helper function to get users with filtering and pagination
 */
async function getUsers(
  filters: UserFilters = {},
  options: UserListOptions = {},
  userScope: { merchantId?: number; outletId?: number } = {}
) {
  const { prisma } = await import('@rentalshop/database');
  
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Map sortBy to actual database fields
  const sortByMap: Record<string, string> = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    createdAt: 'createdAt'
  };
  
  const actualSortBy = sortByMap[sortBy] || 'createdAt';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  // Apply role-based scope filtering
  if (userScope.merchantId) {
    // Convert publicId to CUID for database query
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: userScope.merchantId },
      select: { id: true }
    });
    if (merchant) {
      where.merchantId = merchant.id;
      console.log('🔍 Filtering by merchantId:', userScope.merchantId, '-> CUID:', merchant.id);
    }
  }
  
  if (userScope.outletId) {
    // Convert publicId to CUID for database query
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: userScope.outletId },
      select: { id: true }
    });
    if (outlet) {
      where.outletId = outlet.id;
      console.log('🔍 Filtering by outletId:', userScope.outletId, '-> CUID:', outlet.id);
    }
  }

  if (filters.role) {
    where.role = filters.role;
    console.log('🔍 Filtering by role:', filters.role);
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
    console.log('🔍 Filtering by isActive:', filters.isActive);
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    where.OR = [
      { firstName: { contains: searchTerm } },
      { lastName: { contains: searchTerm } },
      { email: { contains: searchTerm } },
      { phone: { contains: searchTerm } },
    ];
    console.log('🔍 Filtering by search term:', searchTerm);
  }

  console.log('🔍 Final where clause:', JSON.stringify(where, null, 2));

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users - expose publicId as "id" to the client
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, // Internal ID for database operations
      publicId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true, // Internal ID for database operations
          publicId: true,
          name: true,
        }
      },
      outlet: {
        select: {
          id: true, // Internal ID for database operations
          publicId: true,
          name: true,
          merchant: {
            select: { 
              id: true, // Internal ID for database operations
              publicId: true, 
              name: true 
            }
          }
        }
      }
    } as any, // Type assertion to bypass Prisma type checking
    orderBy: { [actualSortBy]: sortOrder },
    skip,
    take: limit,
  });

  // Transform the response to expose publicId as "id" to the client
  const transformedUsers = users.map((user: any) => ({
            id: user.id, // Return id to frontend
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    merchant: user.merchant ? {
                id: user.merchant.publicId, // Return merchant publicId as "id" to frontend
      name: user.merchant.name,
    } : undefined,
    outlet: user.outlet ? {
                id: user.outlet.publicId, // Return outlet publicId as "id" to frontend
      name: user.outlet.name,
      merchant: user.outlet.merchant ? {
                  id: user.outlet.merchant.publicId, // Return merchant publicId as "id" to frontend
        name: user.outlet.merchant.name,
      } : undefined,
    } : undefined,
  }));

  const totalPages = Math.ceil(total / limit);

  console.log('✅ getUsers result:', {
    total,
    page,
    totalPages,
    usersCount: transformedUsers.length,
    scope: userScope
  });

  return {
    users: transformedUsers,
    total,
    page,
    totalPages,
  };
}

/**
 * DELETE /api/users
 * Soft delete a user (Role-based access)
 */
export const DELETE = withUserManagementAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized
    // User scope is automatically determined based on role:
    // - ADMIN: no restrictions (can delete all users)
    // - MERCHANT: scoped to their merchant
    // - OUTLET_ADMIN: scoped to their outlet
    // - OUTLET_STAFF: automatically denied (no users.manage permission)
    const { user, userScope, request } = authorizedRequest;

    // Get the user ID to delete from the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Check if user is trying to delete themselves
    if (user.id === userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Import the soft delete function
    const { softDeleteUser } = await import('@rentalshop/database');

    // Soft delete the user
    const deletedUser = await softDeleteUser(userId);

    console.log('✅ User soft deleted successfully:', {
      deletedUserId: userId,
      deletedBy: user.id,
      deletedUser: deletedUser.publicId
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: deletedUser.publicId,
        email: deletedUser.email,
        isActive: deletedUser.isActive,
        deletedAt: deletedUser.deletedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error in DELETE /api/users:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error.message.includes('already deleted')) {
      return NextResponse.json(
        { success: false, message: 'User is already deleted' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete user', error: error.message },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}); 