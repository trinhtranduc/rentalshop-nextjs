import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { findUserById, findUserByPublicId, createUser, updateUser } from '@rentalshop/database';
import { usersQuerySchema, userCreateSchema, userUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole } from '@rentalshop/auth';


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
 * Get users with filtering and pagination (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('🔍 Full user object from token:', JSON.stringify(user, null, 2));
    console.log('🔍 User role:', user.role);
    console.log('🔍 User merchantId:', user.merchantId);
    console.log('🔍 User outletId:', user.outletId);
    console.log('🔍 User email:', user.email);

    // Initialize userScope outside try block
    let userScope: { merchantId?: number; outletId?: number } = {};

    try {
      // Check authorization based on user role
      let canAccess = false;

      // Normalize role for comparison (handle case sensitivity)
      const normalizedRole = user.role?.toUpperCase() || '';

      if (normalizedRole === 'ADMIN') {
        // Admin can see all users system-wide
        canAccess = true;
        userScope = {};
        console.log('🔐 Admin access granted - can see all users system-wide');
      } else if (normalizedRole === 'MERCHANT') {
        // Merchant can see all users within their organization
        canAccess = true;
        userScope = { merchantId: user.merchantId || undefined };
        console.log('🔐 Merchant access granted - scope:', userScope);
      } else if (normalizedRole === 'OUTLET_ADMIN') {
        // Outlet admin can see users within their outlet
        canAccess = true;
        userScope = { 
          merchantId: user.merchantId || undefined, 
          outletId: user.outletId || undefined 
        };
        console.log('🔐 Outlet Admin access granted - scope:', userScope);
      } else if (normalizedRole === 'OUTLET_STAFF') {
        // Outlet staff cannot manage users
        canAccess = false;
        console.log('🔐 Outlet Staff access denied - cannot manage users');
      } else {
        // Unknown role
        canAccess = false;
        console.log('❌ Unknown role:', user.role, 'Normalized:', normalizedRole);
      }

      if (!canAccess) {
        console.log('❌ Access denied for user:', { role: user.role, merchantId: user.merchantId, outletId: user.outletId });
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions to view users' }, 
          { status: 403 }
        );
      }

      console.log('✅ Access granted for user:', { role: user.role, scope: userScope });
    } catch (error) {
      console.error('❌ Error in authorization logic:', error);
      return NextResponse.json(
        { success: false, message: 'Authorization error', error: error instanceof Error ? error.message : 'Unknown error' }, 
        { status: 500 }
      );
    }

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
      status: 200, 
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
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/users - Creating new user');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No authorization token provided');
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      console.log('❌ Invalid authorization token');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    try {
      assertAnyRole(user as any, ['ADMIN']);
      console.log('✅ User has admin role:', user.email);
    } catch {
      console.log('❌ User does not have admin role:', user.email);
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

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
    let merchantId: number | undefined;
    if (user.merchantId) {
      merchantId = user.merchantId;
    } else if (user.role === 'ADMIN') {
      // Admin users can create users without a specific merchant (system-wide)
      merchantId = undefined;
    } else {
      console.log('❌ User does not have merchant access');
      return NextResponse.json(
        { success: false, error: 'User does not have merchant access' },
        { status: 403 }
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
        { status: 500 }
      );
    }
    
    // Note: All uniqueness validation (email + phone) is handled at the database level
    // in the createUser function. This reduces API calls and ensures consistency.
    
    console.log('📡 Calling createUser database function...');
    const result = await createUser(userData);
    
    // Check if database function returned an error
    if (!result.success) {
      console.log('❌ Database validation failed:', result.error);
      // Use the numeric code directly from database function
      const statusCode = typeof result.code === 'number' ? result.code : 500;
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      );
    }
    
    // At this point, result.success is true, so result.user should exist
    const newUser = (result as any).user;
    if (!newUser) {
      console.error('❌ Database returned success but no user data');
      return NextResponse.json(
        { success: false, error: 'Database error: No user data returned' },
        { status: 500 }
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
}

/**
 * PUT /api/users
 * Update an existing user (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const currentUser = await verifyTokenSimple(token);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check authorization based on user role
    let canAccess = false;
    let userScope: { merchantId?: number; outletId?: number } = {};

    // Normalize role for comparison (handle case sensitivity)
    const normalizedRole = currentUser.role?.toUpperCase() || '';

    if (normalizedRole === 'ADMIN') {
      // Admin can update all users system-wide
      canAccess = true;
      userScope = {};
      console.log('🔐 Admin access granted - can update all users system-wide');
    } else if (normalizedRole === 'MERCHANT') {
      // Merchant can update users within their organization
      canAccess = true;
      userScope = { merchantId: currentUser.merchantId || undefined };
      console.log('🔐 Merchant access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_ADMIN') {
      // Outlet admin can update users within their outlet
      canAccess = true;
      userScope = { 
        merchantId: currentUser.merchantId || undefined, 
        outletId: currentUser.outletId || undefined 
      };
      console.log('🔐 Outlet Admin access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_STAFF') {
      // Outlet staff cannot update users
      canAccess = false;
      console.log('🔐 Outlet Staff access denied - cannot update users');
    } else {
      // Unknown role
      canAccess = false;
      console.log('❌ Unknown role:', currentUser.role, 'Normalized:', normalizedRole);
    }

    if (!canAccess) {
      console.log('❌ Access denied for user:', { role: currentUser.role, merchantId: currentUser.merchantId, outletId: currentUser.outletId });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to update users' }, 
        { status: 403 }
      );
    }

    console.log('✅ Access granted for user:', { role: currentUser.role, scope: userScope });

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
        { status: 500 }
      );
    }
    
    // Check if user exists using publicId
    const existingUser = await findUserByPublicId(parseInt(publicId));
    
    if (!existingUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Validate scope access - ensure user can only update users within their scope
    if (userScope.merchantId && existingUser.merchantId !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to update user from different merchant', {
        existingUserMerchantId: existingUser.merchantId,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different organization' },
        { status: 403 }
      );
    }

    if (userScope.outletId && existingUser.outletId !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to update user from different outlet', {
        existingUserOutletId: existingUser.outletId,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different outlet' },
        { status: 403 }
      );
    }

    console.log('✅ Scope validation passed - user can update this user data');

    // Prepare update data for database - firstName and lastName are already in the correct format
    const updateDataForDB = { ...parsed.data };
    
    console.log('Final update data for database:', updateDataForDB);
    
    // Update user using the internal ID from existingUser
    const updatedUser = await updateUser(existingUser.id, updateDataForDB);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    where.merchantId = userScope.merchantId;
    console.log('🔍 Filtering by merchantId:', userScope.merchantId);
  }
  
  if (userScope.outletId) {
    where.outletId = userScope.outletId;
    console.log('🔍 Filtering by outletId:', userScope.outletId);
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
            id: user.publicId, // Return publicId as "id" to frontend
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