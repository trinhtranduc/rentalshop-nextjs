// ============================================================================
// USER FUNCTIONS
// ============================================================================
// This file contains user functions that use integer IDs:
// - Input: id (number)
// - Database: queries by id (auto-incrementing integer)
// - Return: includes id (number)

import { prisma } from './client';
import type { UserCreateInput, UserUpdateInput } from '@rentalshop/types';

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
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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

  // Find merchant by id if provided
  let merchantId: number | undefined;
  if (input.merchantId) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: input.merchantId }
    });
    if (!merchant) {
      throw new Error(`Merchant with id ${input.merchantId} not found`);
    }
    merchantId = merchant.id;
  }

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
      merchantId,
      outletId,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          businessType: true,
          taxId: true,
          website: true,
          description: true,
          isActive: true,
          planId: true,
          subscriptionStatus: true,
          totalRevenue: true,
          createdAt: true,
          lastActiveAt: true,
        }
      },
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
          merchant: {
            select: {
              id: true,
              name: true,
            }
          }
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
 * Get users by merchant - follows dual ID system
 */
export async function getUsersByMerchant(merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.user.findMany({
    where: { merchantId: merchant.id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
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
