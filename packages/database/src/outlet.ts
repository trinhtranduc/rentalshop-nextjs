// ============================================================================
// OUTLET DATABASE FUNCTIONS
// ============================================================================
// This file contains outlet functions that use integer ID system:
// - Input: id (number)
// - Database: queries by id (integer), uses integer IDs for relationships
// - Return: includes id (number)

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
 * Get default outlet
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function getDefaultOutlet(): Promise<any> {
  const outlet = await prisma.outlet.findFirst({
    where: {
      isDefault: true,
      isActive: true
    },
    select: {
      id: true,
      name: true,
    }
  });

  if (!outlet) {
    throw new Error(`No default outlet found`);
  }

  return outlet;
}

/**
 * Search outlets - follows dual ID system
 * Input: ids (numbers), Output: ids (numbers)
 */
export async function searchOutlets(filters: OutletSearchFilter): Promise<OutletSearchResponse> {
  const {
    outletId, // Add outletId filter for outlet-level users
    isActive,
    search,
    page = 1,
    limit = 20
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  // Note: merchantId filtering removed - tenant databases are already isolated per tenant

  // Outlet-level filtering: Users can only see their assigned outlet
  if (outletId) {
    // Find outlet by id
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true }
    });
    
    if (outlet) {
      where.id = outlet.id;
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
 * Get all outlets
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function getAllOutlets() {
  const outlets = await prisma.outlet.findMany({
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
  };
}

/**
 * Create outlet
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function createOutlet(input: OutletCreateInput) {
  // Generate unique id
  const id = Math.floor(Math.random() * 1000000) + 100000;

  const outlet = await prisma.outlet.create({
    data: {
      id,
      name: input.name.trim(),
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      description: input.description?.trim(),
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
  };
}

/**
 * Update outlet - follows dual ID system
 */
export async function updateOutlet(id: number, input: OutletUpdateInput) {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    select: { id: true, name: true, isDefault: true }
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

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedOutlets = {
  /**
   * Find outlet by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.outlet.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },

  /**
   * Create new outlet (simplified API)
   */
  create: async (data: any) => {
    try {
      console.log('🔍 simplifiedOutlets.create called with data:', data);
      
      // Remove merchant connection if present (not needed in tenant DBs)
      const { merchant, ...outletData } = data;
      
      const outlet = await prisma.outlet.create({
        data: outletData,
      });
      
      console.log('✅ Outlet created successfully:', outlet);
      return outlet;
    } catch (error) {
      console.error('❌ Error in simplifiedOutlets.create:', error);
      throw error;
    }
  },

  /**
   * Update outlet (simplified API)
   */
  update: async (id: number, data: any) => {
    // Remove merchant connection if present (not needed in tenant DBs)
    const { merchant, ...outletData } = data;
    return await prisma.outlet.update({
      where: { id },
      data: outletData,
    });
  },

  /**
   * Find first outlet matching criteria (simplified API)
   */
  findFirst: async (where: any) => {
    return await prisma.outlet.findFirst({
      where,
      include: {
        _count: {
          select: { 
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },

  /**
   * Get outlet statistics (simplified API)
   */
  getStats: async (options: any) => {
    return await prisma.outlet.count(options.where);
  },

  /**
   * Update multiple outlets (simplified API)
   */
  updateMany: async (where: any, data: any) => {
    return await prisma.outlet.updateMany({
      where,
      data
    });
  },

  /**
   * Search outlets with pagination (simplified API)
   */
  search: async (filters: any) => {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    console.log('🔍 DB outlet.search - Received filters:', filters);
    console.log('🔍 DB outlet.search - whereFilters:', whereFilters);

    // Build where clause
    const where: any = {};
    
    // Note: merchantId filtering removed - tenant databases are already isolated per tenant
    if (whereFilters.outletId) where.id = whereFilters.outletId;
    if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
    if (whereFilters.status) where.status = whereFilters.status;
    
    // Text search across multiple fields - ONLY search by name
    const searchTerm = whereFilters.search?.trim();
    console.log('🔍 DB outlet.search - searchTerm:', searchTerm, 'length:', searchTerm?.length);
    
    if (searchTerm && searchTerm.length > 0) {
      where.name = { 
        contains: searchTerm, 
        mode: 'insensitive' 
      };
      console.log('✅ DB outlet.search - Added name filter:', where.name);
    } else {
      console.log('⚠️ DB outlet.search - No search term, will return all outlets for this merchant');
    }
    
    console.log('🔍 DB outlet.search - Final where clause:', JSON.stringify(where, null, 2));

    // Specific field filters (not used in current implementation)
    if (whereFilters.name) where.name = { contains: whereFilters.name, mode: 'insensitive' };
    if (whereFilters.address) where.address = { contains: whereFilters.address, mode: 'insensitive' };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone, mode: 'insensitive' };

    // Build orderBy based on sortBy and sortOrder
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; // Default
    }

    const [outlets, total] = await Promise.all([
      prisma.outlet.findMany({
        where,
        include: {
          _count: {
            select: { 
              users: true,
              orders: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.outlet.count({ where })
    ]);

    console.log(`📊 db.outlets.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, outlets=${outlets.length}`);

    return {
      data: outlets,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },

  count: async (options?: { where?: any }) => {
    const where = options?.where || {};
    return await prisma.outlet.count({ where });
  }
};
