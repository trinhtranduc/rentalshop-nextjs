// ============================================================================
// USER FUNCTIONS
// ============================================================================
// This file contains user functions that use integer IDs:
// - Input: id (number)
// - Database: queries by id (auto-incrementing integer)
// - Return: includes id (number)

import { prisma } from './client';
import type { UserCreateInput, UserUpdateInput } from '@rentalshop/types';
import { hashPassword } from '@rentalshop/auth';

// ============================================================================
// USER LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find user by ID
 */
export async function findUserById(id: number) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(id: number) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// ============================================================================
// USER CREATION FUNCTIONS
// ============================================================================

/**
 * Create new user - follows dual ID system
 * Input: ids (numbers), Output: id (number)
 */
export async function createUser(input: UserCreateInput): Promise<any> {
  // Generate next user id
  const lastUser = await prisma.user.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  const nextPublicId = (lastUser?.id || 0) + 1;

  // Find outlet by id if provided
  let outletId: number | undefined;
  if (input.outletId) {
    const outlet = await prisma.outlet.findUnique({
      where: { id: input.outletId }
    });
    if (!outlet) {
      throw new Error(`Outlet with id ${input.outletId} not found`);
    }
    outletId = outlet.id;
  }

  // Create user
  // Note: merchantId removed - tenant databases are already isolated per tenant
  const user = await prisma.user.create({
    data: {
      id: nextPublicId,
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
      isActive: true,
      outletId,
    },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return user;
}

// ============================================================================
// USER UPDATE FUNCTIONS
// ============================================================================

/**
 * Update user - follows dual ID system
 * Input: id (number), Output: id (number)
 */
export async function updateUser(
  id: number,
  input: UserUpdateInput
): Promise<any> {
  // Find user by id
  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new Error(`User with id ${id} not found`);
  }

  // Update user - only update fields that are provided
  const updateData: any = {};
  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  // Note: email updates are disabled for security reasons

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          description: true,
          isActive: true,
          isDefault: true,
          createdAt: true,
        }
      },
    },
  });

  return updatedUser;
}

// ============================================================================
// USER UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all users
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function getAllUsers() {
  return await prisma.user.findMany({
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get users by outlet - follows dual ID system
 */
export async function getUsersByOutlet(outletId: number) {
  // Find outlet by id
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }

  return await prisma.user.findMany({
    where: { outletId: outlet.id },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// USER SOFT DELETE FUNCTIONS
// ============================================================================

/**
 * Soft delete user by public ID - follows dual ID system
 * Sets isActive to false and deletedAt to current timestamp
 */
export async function softDeleteUser(id: number): Promise<any> {
  // Find user by id
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true, deletedAt: true }
  });

  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }

  if (user.deletedAt) {
    throw new Error(`User with id ${id} is already deleted`);
  }

  // Soft delete the user
  const deletedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return deletedUser;
}

/**
 * Restore soft deleted user by public ID - follows dual ID system
 * Sets isActive to true and clears deletedAt
 */
export async function restoreUser(id: number): Promise<any> {
  // Find user by id
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true, deletedAt: true }
  });

  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }

  if (!user.deletedAt) {
    throw new Error(`User with id ${id} is not deleted`);
  }

  // Restore the user
  const restoredUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return restoredUser;
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedUsers = {
  /**
   * Find user by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        outlet: { 
          select: { 
            id: true, 
            name: true,
            address: true,
            phone: true,
            description: true,
            isActive: true,
            isDefault: true,
            createdAt: true,
          } 
        }
      }
    });
  },

  /**
   * Find user by email (simplified API)
   */
  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        outletId: true,
        deletedAt: true,
        outlet: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Find first user matching criteria (simplified API)
   */
  findFirst: async (where: any) => {
    return await prisma.user.findFirst({
      where,
      include: {
        outlet: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Create new user (simplified API)
   */
  create: async (data: any) => {
    try {
      console.log('🔍 simplifiedUsers.create called with data:', data);
      
      // Password should already be hashed when passed to this function
      const userData = { ...data };
      
      // Note: merchantId removed - tenant databases are already isolated per tenant

      // Validate outletId exists if provided
      if (userData.outletId && typeof userData.outletId === 'number') {
        const outlet = await prisma.outlet.findUnique({
          where: { id: userData.outletId },
          select: { id: true, name: true }
        });
        
        if (!outlet) {
          throw new Error(`Outlet with id ${userData.outletId} not found`);
        }
        
        console.log('✅ Outlet found:', outlet);
      }

      // Check for duplicate email globally
      if (userData.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: userData.email },
          select: { id: true, email: true }
        });
        
        if (existingEmail) {
          throw new Error(`Email ${userData.email} is already registered`);
        }
      }

      // Check for duplicate phone (tenant databases are already isolated)
      if (userData.phone) {
        const existingPhone = await prisma.user.findFirst({
          where: { 
            phone: userData.phone,
          },
          select: { id: true, phone: true }
        });
        
        if (existingPhone) {
          throw new Error(`Phone number ${userData.phone} is already registered`);
        }
      }

      // Generate next user id
      const lastUser = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
      });
      const nextPublicId = (lastUser?.id || 0) + 1;
      userData.id = nextPublicId;

      const user = await prisma.user.create({
        data: userData,
        include: {
          outlet: { 
            select: { 
              id: true, 
              name: true,
              address: true,
              phone: true,
              description: true,
              isActive: true,
              isDefault: true,
              createdAt: true,
            } 
          }
        }
      });
      
      console.log('✅ User created successfully:', user);
      return user;
    } catch (error) {
      console.error('❌ Error in simplifiedUsers.create:', error);
      throw error;
    }
  },

  /**
   * Update user (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.user.update({
      where: { id },
      data,
      include: {
        outlet: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Delete user (soft delete) (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.user.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    });
  },

  /**
   * Search users with simple filters (simplified API)
   */
  search: async (filters: any) => {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      ...whereFilters 
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    // Note: merchantId filtering removed - tenant databases are already isolated per tenant
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
    
    // Handle role filtering - roles array has priority over single role
    if (whereFilters.roles && Array.isArray(whereFilters.roles)) {
      where.role = { in: whereFilters.roles };
    } else if (whereFilters.role) {
      where.role = whereFilters.role;
    }
    
    // Text search (case-insensitive)
    if (whereFilters.search) {
      where.OR = [
        { firstName: { contains: whereFilters.search, mode: 'insensitive' } },
        { lastName: { contains: whereFilters.search, mode: 'insensitive' } },
        { email: { contains: whereFilters.search, mode: 'insensitive' } }
      ];
    }

    // ✅ Build dynamic orderBy clause
    const orderBy: any = {};
    if (sortBy === 'firstName' || sortBy === 'lastName' || sortBy === 'email') {
      orderBy[sortBy] = sortOrder;
    } else {
      // Default: createdAt
      orderBy.createdAt = sortOrder;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } }
        },
        orderBy, // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    console.log(`📊 db.users.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, users=${users.length}`);

    return {
      data: users,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },

  count: async (options?: { where?: any }) => {
    const where = options?.where || {};
    return await prisma.user.count({ where });
  },

  /**
   * Get user statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.user.count({ where });
  }
};
