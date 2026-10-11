// ============================================================================
// PLAN LIMIT ADDON DATABASE FUNCTIONS
// ============================================================================
// Functions for managing plan limit addons (additional limits for merchants)

import { prisma } from './client';
import { calculateTotalLimits } from './billing-module';
import { readModuleLimits } from '@rentalshop/utils';
import type { 
  PlanLimitAddonCreateInput, 
  PlanLimitAddonUpdateInput,
  PlanLimitAddonsQuery 
} from '@rentalshop/utils';

// ============================================================================
// PLAN LIMIT ADDON CRUD OPERATIONS
// ============================================================================

/**
 * Find plan limit addon by ID
 */
export async function getPlanLimitAddonById(id: number) {
  return await prisma.planLimitAddon.findUnique({
    where: { id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Find all plan limit addons for a merchant
 */
export async function getPlanLimitAddonsByMerchant(merchantId: number) {
  return await prisma.planLimitAddon.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get active plan limit addons for a merchant
 * These are the addons that contribute to the total limits
 */
export async function getActivePlanLimitAddonsByMerchant(merchantId: number) {
  // #782: read the new table, keep the old row shape (the extend routes list these)
  const rows = await prisma.merchantModule.findMany({
    where: { merchantId, isActive: true, kind: 'quantity' },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => {
    const per = readModuleLimits(row.limits);
    return {
      id: row.id,
      merchantId: row.merchantId,
      outlets: per.outlets * row.quantity,
      users: per.users * row.quantity,
      products: per.products * row.quantity,
      customers: per.customers * row.quantity,
      orders: per.orders * row.quantity,
      notes: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

/**
 * Calculate total addon limits for a merchant
 * Returns the sum of all active addons
 */
export async function calculateTotalAddonLimits(merchantId: number) {
  // #782: add-ons are MerchantModule rows now (the old rows were copied there at the same limits).
  return calculateTotalLimits(merchantId);
}

/**
 * Search plan limit addons with filters and pagination
 */
export async function searchPlanLimitAddons(filters: PlanLimitAddonsQuery) {
  const {
    merchantId,
    isActive,
    page = 1,
    limit = 20,
    offset = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  // Build where clause
  const where: any = {};
  
  if (merchantId) {
    where.merchantId = merchantId;
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Calculate pagination
  const skip = offset || (page - 1) * limit;

  // Execute query with pagination
  const [addons, total] = await Promise.all([
    prisma.planLimitAddon.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.planLimitAddon.count({ where }),
  ]);

  return {
    data: addons,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
  };
}

/**
 * Create a new plan limit addon
 */
export async function createPlanLimitAddon(data: PlanLimitAddonCreateInput) {
  return await prisma.planLimitAddon.create({
    data: {
      merchantId: data.merchantId,
      outlets: data.outlets ?? 0,
      users: data.users ?? 0,
      products: data.products ?? 0,
      customers: data.customers ?? 0,
      orders: data.orders ?? 0,
      notes: data.notes,
      isActive: data.isActive ?? true,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Update an existing plan limit addon
 */
export async function updatePlanLimitAddon(
  id: number,
  data: PlanLimitAddonUpdateInput
) {
  return await prisma.planLimitAddon.update({
    where: { id },
    data: {
      ...(data.outlets !== undefined && { outlets: data.outlets }),
      ...(data.users !== undefined && { users: data.users }),
      ...(data.products !== undefined && { products: data.products }),
      ...(data.customers !== undefined && { customers: data.customers }),
      ...(data.orders !== undefined && { orders: data.orders }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Delete a plan limit addon (hard delete)
 */
export async function deletePlanLimitAddon(id: number) {
  return await prisma.planLimitAddon.delete({
    where: { id },
  });
}

/**
 * Soft delete a plan limit addon (deactivate)
 */
export async function deactivatePlanLimitAddon(id: number) {
  return await prisma.planLimitAddon.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Activate a plan limit addon
 */
export async function activatePlanLimitAddon(id: number) {
  return await prisma.planLimitAddon.update({
    where: { id },
    data: { isActive: true },
  });
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedPlanLimitAddons = {
  /**
   * Find plan limit addon by ID (simplified API)
   */
  findById: async (id: number) => {
    return await getPlanLimitAddonById(id);
  },

  /**
   * Find all plan limit addons for a merchant (simplified API)
   */
  findByMerchant: async (merchantId: number) => {
    return await getPlanLimitAddonsByMerchant(merchantId);
  },

  /**
   * Get active addons for a merchant (simplified API)
   */
  findActiveByMerchant: async (merchantId: number) => {
    return await getActivePlanLimitAddonsByMerchant(merchantId);
  },

  /**
   * Calculate total addon limits (simplified API)
   */
  calculateTotal: async (merchantId: number) => {
    return await calculateTotalAddonLimits(merchantId);
  },

  /**
   * Search plan limit addons (simplified API)
   */
  search: async (filters: PlanLimitAddonsQuery) => {
    return await searchPlanLimitAddons(filters);
  },

  /**
   * Create new plan limit addon (simplified API)
   */
  create: async (data: PlanLimitAddonCreateInput) => {
    return await createPlanLimitAddon(data);
  },

  /**
   * Update plan limit addon (simplified API)
   */
  update: async (id: number, data: PlanLimitAddonUpdateInput) => {
    return await updatePlanLimitAddon(id, data);
  },

  /**
   * Delete plan limit addon (simplified API)
   */
  delete: async (id: number) => {
    return await deletePlanLimitAddon(id);
  },
};

