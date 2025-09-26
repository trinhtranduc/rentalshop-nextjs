// ============================================================================
// OUTLET DATABASE FUNCTIONS
// ============================================================================
// This file contains outlet functions that follow the dual ID system:
// - Input: id (number)
// - Database: queries by id, uses CUIDs for relationships
// - Return: includes both id (CUID) and id (number)

import { prisma } from './client';
import type { 
  OutletCreateInput, 
  OutletUpdateInput, 
  OutletSearchFilter,
  OutletSearchResponse 
} from '@rentalshop/types';

// ============================================================================
// OUTLET SEARCH FUNCTIONS
// ============================================================================

/**
 * Search outlets - follows dual ID system
 * Input: ids (numbers), Output: ids (numbers)
 */
export async function searchOutlets(filters: OutletSearchFilter): Promise<OutletSearchResponse> {
  const {
    merchantId,
    outletId, // Add outletId filter for outlet-level users
    isActive,
    search,
    page = 1,
    limit = 20
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (merchantId) {
    // Find merchant by id
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true }
    });
    
    if (merchant) {
      where.merchantId = merchant.id; // Use CUID
    }
  }

  // Outlet-level filtering: Users can only see their assigned outlet
  if (outletId) {
    // Find outlet by id
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true }
    });
    
    if (outlet) {
      where.id = outlet.id; // Use CUID for exact match
    }
  }

  // Only filter by isActive if explicitly provided
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get total count
  const total = await prisma.outlet.count({ where });

  // Get outlets with pagination
  const outlets = await prisma.outlet.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: skip
  });

  // Transform to match expected types
  const transformedOutlets = outlets.map((outlet: any) => ({
    id: outlet.id, // Return id as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    isDefault: outlet.isDefault || false,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.id, // Return merchant id
    merchant: {
      id: outlet.merchant.id,
      name: outlet.merchant.name
    }
  }));

  return {
    outlets: transformedOutlets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + limit < total,
  };
}

/**
 * Get outlets by merchant - follows dual ID system
 */
export async function getOutletsByMerchant(merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  const outlets = await prisma.outlet.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to match expected types
  return outlets.map((outlet: any) => ({
    id: outlet.id, // Return id as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    isDefault: outlet.isDefault || false,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.id, // Return merchant id
    merchant: {
      id: outlet.merchant.id,
      name: outlet.merchant.name
    }
  }));
}

/**
 * Get outlet by public ID - follows dual ID system
 */
export async function getOutletByPublicId(id: number) {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!outlet) return null;

  // Transform to match expected types
  return {
    id: outlet.id, // Return id as "id" to frontend
    name: outlet.name,
    address: outlet.address,
    phone: outlet.phone,
    description: outlet.description,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.id, // Return merchant id
    merchant: {
      id: outlet.merchant.id,
      name: outlet.merchant.name
    }
  };
}

/**
 * Create outlet - follows dual ID system
 */
export async function createOutlet(input: OutletCreateInput, merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  // Generate unique id
  const id = Math.floor(Math.random() * 1000000) + 100000;

  const outlet = await prisma.outlet.create({
    data: {
      id,
      name: input.name.trim(),
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      description: input.description?.trim(),
      merchantId: merchant.id, // Use CUID
      isActive: true
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // Transform to match expected types
  return {
    id: outlet.id, // Return id as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.id, // Return merchant id
    merchant: {
      id: outlet.merchant.id,
      name: outlet.merchant.name
    }
  };
}

/**
 * Update outlet - follows dual ID system
 */
export async function updateOutlet(id: number, input: OutletUpdateInput) {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    select: { id: true, merchantId: true, name: true, isDefault: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with id ${id} not found`);
  }

  // Prevent disabling default outlets
  if (outlet.isDefault && input.isActive === false) {
    throw new Error('Default outlet cannot be disabled');
  }

  const updatedOutlet = await prisma.outlet.update({
    where: { id: outlet.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.address !== undefined && { address: input.address?.trim() }),
      ...(input.phone !== undefined && { phone: input.phone?.trim() }),
      ...(input.city !== undefined && { city: input.city?.trim() }),
      ...(input.state !== undefined && { state: input.state?.trim() }),
      ...(input.zipCode !== undefined && { zipCode: input.zipCode?.trim() }),
      ...(input.country !== undefined && { country: input.country?.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() }),
      ...(input.isActive !== undefined && { isActive: input.isActive })
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // Transform to match expected types
  return {
    id: updatedOutlet.id, // Return id as "id" to frontend
    name: updatedOutlet.name,
    address: updatedOutlet.address || undefined,
    phone: updatedOutlet.phone || undefined,
    city: (updatedOutlet as any).city || undefined,
    state: (updatedOutlet as any).state || undefined,
    zipCode: (updatedOutlet as any).zipCode || undefined,
    country: (updatedOutlet as any).country || undefined,
    description: updatedOutlet.description || undefined,
    isActive: updatedOutlet.isActive,
    createdAt: updatedOutlet.createdAt,
    updatedAt: updatedOutlet.updatedAt,
    merchantId: updatedOutlet.merchant.id, // Return merchant id
    merchant: {
      id: updatedOutlet.merchant.id,
      name: updatedOutlet.merchant.name
    }
  };
}

/**
 * Delete outlet - follows dual ID system
 */
export async function deleteOutlet(id: number) {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with id ${id} not found`);
  }

  await prisma.outlet.delete({
    where: { id: outlet.id }
  });

  return { success: true };
}
