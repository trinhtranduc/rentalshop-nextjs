import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { findUserById, findUserByEmail, createUser, updateUser } from '@rentalshop/database';
import { usersQuerySchema, userCreateSchema } from '@rentalshop/utils';
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

    // Check if user is admin
    try {
      assertAnyRole(user as any, ['ADMIN']);
    } catch {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
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
    const result = await getUsers(filters, options);

    const body = JSON.stringify({ success: true, data: result });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json', 
        ETag: etag, 
        'Cache-Control': 'private, max-age=60' 
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

    // Check if user is admin
    try {
      assertAnyRole(user as any, ['ADMIN']);
    } catch {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsed.error.flatten() }, { status: 400 });
    }

    // Create user
    const p = parsed.data;
    const [firstName, ...rest] = p.name.trim().split(' ');
    const lastName = rest.join(' ');
    const newUser = await createUser({
      email: p.email.toLowerCase().trim(),
      password: p.password,
      firstName: firstName || p.name.trim(),
      lastName: lastName || '',
      phone: p.phone?.trim(),
      role: p.role || 'OUTLET_STAFF',
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
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
  options: UserListOptions = {}
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
    name: 'firstName', // Map 'name' to 'firstName' since we don't have a 'name' field
    email: 'email',
    createdAt: 'createdAt'
  };
  
  const actualSortBy = sortByMap[sortBy] || 'createdAt';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    where.OR = [
      { firstName: { contains: searchTerm } },
      { lastName: { contains: searchTerm } },
      { email: { contains: searchTerm } },
      { phone: { contains: searchTerm } },
    ];
  }

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        }
      },
      outlet: {
        select: {
          id: true,
          name: true,
          merchant: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { [actualSortBy]: sortOrder },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    users,
    total,
    page,
    totalPages,
  };
} 