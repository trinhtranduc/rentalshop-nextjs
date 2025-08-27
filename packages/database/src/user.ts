// ============================================================================
// DUAL ID USER FUNCTIONS
// ============================================================================
// This file contains user functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId, uses CUIDs for relationships
// - Return: includes both id (CUID) and publicId (number)

import { prisma } from './client';
import type { UserCreateInput, UserUpdateInput } from '@rentalshop/types';

// ============================================================================
// USER LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Find user by internal ID (CUID) - follows dual ID system
 */
export async function findUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get user by public ID - follows dual ID system
 */
export async function getUserByPublicId(publicId: number) {
  return await prisma.user.findUnique({
    where: { publicId },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
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
 * Input: publicIds (numbers), Output: publicId (number)
 */
export async function createUser(input: UserCreateInput): Promise<any> {
  // Generate next user publicId
  const lastUser = await prisma.user.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  const nextPublicId = (lastUser?.publicId || 0) + 1;

  // Find merchant by publicId if provided
  let merchantId: string | undefined;
  if (input.merchantId) {
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: parseInt(input.merchantId) }
    });
    if (!merchant) {
      throw new Error(`Merchant with publicId ${input.merchantId} not found`);
    }
    merchantId = merchant.id;
  }

  // Find outlet by publicId if provided
  let outletId: string | undefined;
  if (input.outletId) {
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: parseInt(input.outletId) }
    });
    if (!outlet) {
      throw new Error(`Outlet with publicId ${input.outletId} not found`);
    }
    outletId = outlet.id;
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      publicId: nextPublicId,
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
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
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
 * Input: publicId (number), Output: publicId (number)
 */
export async function updateUser(
  publicId: number,
  input: UserUpdateInput
): Promise<any> {
  // Find user by publicId
  const existingUser = await prisma.user.findUnique({
    where: { publicId }
  });

  if (!existingUser) {
    throw new Error(`User with publicId ${publicId} not found`);
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { publicId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.user.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
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
  // Find outlet by publicId
  const outlet = await prisma.outlet.findUnique({
    where: { publicId: outletId },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with publicId ${outletId} not found`);
  }

  return await prisma.user.findMany({
    where: { outletId: outlet.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
