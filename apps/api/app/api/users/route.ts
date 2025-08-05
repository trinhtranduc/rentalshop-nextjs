import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { findUserById, findUserByEmail, createUser, updateUser } from '@rentalshop/database';
import type { User } from '@rentalshop/database';

export interface UserFilters {
  role?: 'CLIENT' | 'MERCHANT' | 'OUTLET_STAFF' | 'ADMIN';
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
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: UserFilters = {};
    const options: UserListOptions = {};
    
    // Filter parameters
    if (searchParams.get('role')) filters.role = searchParams.get('role') as any;
    if (searchParams.get('isActive')) filters.isActive = searchParams.get('isActive') === 'true';
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    
    // Pagination and sorting parameters
    if (searchParams.get('page')) options.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('limit')) options.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sortBy')) options.sortBy = searchParams.get('sortBy') as any;
    if (searchParams.get('sortOrder')) options.sortOrder = searchParams.get('sortOrder') as any;

    // Get users from database
    const result = await getUsers(filters, options);

    return NextResponse.json({
      success: true,
      data: result,
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
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { email, password, name, role } = body;
    if (!email || !password || !name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: email, password, name' 
        },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await createUser({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      phone: body.phone?.trim(),
      role: role || 'CLIENT',
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
      { name: { contains: searchTerm } },
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
          companyName: true,
        }
      },
      admin: {
        select: {
          id: true,
          level: true,
        }
      },
      outletStaff: {
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              merchant: {
                select: {
                  id: true,
                  companyName: true,
                }
              }
            }
          }
        }
      }
    },
    orderBy: { [sortBy]: sortOrder },
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