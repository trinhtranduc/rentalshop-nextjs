// ============================================================================
// OUTLET DATABASE FUNCTIONS
// ============================================================================
// This file contains outlet functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId, uses CUIDs for relationships
// - Return: includes both id (CUID) and publicId (number)

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
 * Input: publicIds (numbers), Output: publicIds (numbers)
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
    // Find merchant by publicId
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      select: { id: true }
    });
    
    if (merchant) {
      where.merchantId = merchant.id; // Use CUID
    }
  }

  // Outlet-level filtering: Users can only see their assigned outlet
  if (outletId) {
    // Find outlet by publicId
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: outletId },
      select: { id: true }
    });
    
    if (outlet) {
      where.id = outlet.id; // Use CUID for exact match
    }
  }

  // Default to active outlets only
  if (isActive !== undefined) {
    where.isActive = isActive;
  } else {
    where.isActive = true;
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
      publicId: true,
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
          publicId: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: skip
  });

  // Transform to match expected types
  const transformedOutlets = outlets.map(outlet => ({
    id: outlet.publicId, // Return publicId as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.publicId, // Return merchant publicId
    merchant: {
      id: outlet.merchant.publicId,
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  const outlets = await prisma.outlet.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    select: {
      id: true,
      publicId: true,
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
          publicId: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to match expected types
  return outlets.map(outlet => ({
    id: outlet.publicId, // Return publicId as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.publicId, // Return merchant publicId
    merchant: {
      id: outlet.merchant.publicId,
      name: outlet.merchant.name
    }
  }));
}

/**
 * Get outlet by public ID - follows dual ID system
 */
export async function getOutletByPublicId(publicId: number) {
  const outlet = await prisma.outlet.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
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
          publicId: true,
          name: true
        }
      }
    }
  });

  if (!outlet) return null;

  // Transform to match expected types
  return {
    id: outlet.publicId, // Return publicId as "id" to frontend
    name: outlet.name,
    address: outlet.address,
    phone: outlet.phone,
    description: outlet.description,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.publicId, // Return merchant publicId
    merchant: {
      id: outlet.merchant.publicId,
      name: outlet.merchant.name
    }
  };
}

/**
 * Create outlet - follows dual ID system
 */
export async function createOutlet(input: OutletCreateInput, merchantId: number) {
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  // Generate unique publicId
  const publicId = Math.floor(Math.random() * 1000000) + 100000;

  const outlet = await prisma.outlet.create({
    data: {
      publicId,
      name: input.name.trim(),
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      description: input.description?.trim(),
      merchantId: merchant.id, // Use CUID
      isActive: true
    },
    select: {
      id: true,
      publicId: true,
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
          publicId: true,
          name: true
        }
      }
    }
  });

  // Transform to match expected types
  return {
    id: outlet.publicId, // Return publicId as "id" to frontend
    name: outlet.name,
    address: outlet.address || undefined,
    phone: outlet.phone || undefined,
    description: outlet.description || undefined,
    isActive: outlet.isActive,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    merchantId: outlet.merchant.publicId, // Return merchant publicId
    merchant: {
      id: outlet.merchant.publicId,
      name: outlet.merchant.name
    }
  };
}

/**
 * Update outlet - follows dual ID system
 */
export async function updateOutlet(publicId: number, input: OutletUpdateInput) {
  const outlet = await prisma.outlet.findUnique({
    where: { publicId },
    select: { id: true, merchantId: true, name: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with publicId ${publicId} not found`);
  }

  const updatedOutlet = await prisma.outlet.update({
    where: { id: outlet.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.address !== undefined && { address: input.address?.trim() }),
      ...(input.phone !== undefined && { phone: input.phone?.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() }),
      ...(input.isActive !== undefined && { isActive: input.isActive })
    },
    select: {
      id: true,
      publicId: true,
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
          publicId: true,
          name: true
        }
      }
    }
  });

  // Transform to match expected types
  return {
    id: updatedOutlet.publicId, // Return publicId as "id" to frontend
    name: updatedOutlet.name,
    address: updatedOutlet.address || undefined,
    phone: updatedOutlet.phone || undefined,
    description: updatedOutlet.description || undefined,
    isActive: updatedOutlet.isActive,
    createdAt: updatedOutlet.createdAt,
    updatedAt: updatedOutlet.updatedAt,
    merchantId: updatedOutlet.merchant.publicId, // Return merchant publicId
    merchant: {
      id: updatedOutlet.merchant.publicId,
      name: updatedOutlet.merchant.name
    }
  };
}

/**
 * Delete outlet - follows dual ID system
 */
export async function deleteOutlet(publicId: number) {
  const outlet = await prisma.outlet.findUnique({
    where: { publicId },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with publicId ${publicId} not found`);
  }

  await prisma.outlet.delete({
    where: { id: outlet.id }
  });

  return { success: true };
}
