// ============================================================================
// PLAN DATABASE FUNCTIONS - MODERN SUBSCRIPTION SYSTEM
// ============================================================================

import { prisma } from './client';
import type { Plan, PlanCreateInput, PlanUpdateInput, PlanFilters } from '@rentalshop/types';
import { calculatePlanPricing } from './subscription';
import { removeVietnameseDiacritics } from '@rentalshop/utils';

/**
 * Helper function to generate pricing object for a plan
 */
function generatePlanPricing(basePrice: number) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3, // 0% discount for quarterly
      discount: 0,
      savings: 0
    },
    semi_annual: {
      price: basePrice * 6 * 0.95, // 5% discount for semi-annual
      discount: 5,
      savings: basePrice * 6 * 0.05
    },
    annual: {
      price: basePrice * 12 * 0.90, // 10% discount for annual
      discount: 10,
      savings: basePrice * 12 * 0.10
    }
  };
}

/**
 * Get plan by public ID
 */
export async function getPlanById(id: number): Promise<Plan | null> {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id }
    });

    if (!plan) return null;

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  } catch (error) {
    console.error('Error getting plan by public ID:', error);
    throw error;
  }
}

/**
 * Get all plans
 */
export async function getAllPlans(): Promise<Plan[]> {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    return plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting all plans:', error);
    throw error;
  }
}

/**
 * Search plans with filters
 */
export async function searchPlans(filters: PlanFilters = {}): Promise<{ plans: Plan[]; total: number; hasMore: boolean; page: number; limit: number; totalPages: number }> {
  try {
    const where: any = {};

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.trim();
      const normalizedTerm = removeVietnameseDiacritics(searchTerm);
      
      const searchConditions: any[] = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
      
      // Add normalized search if different from original
      if (normalizedTerm !== searchTerm) {
        searchConditions.push(
          { name: { contains: normalizedTerm, mode: 'insensitive' } },
          { description: { contains: normalizedTerm, mode: 'insensitive' } }
        );
      }
      
      where.OR = searchConditions;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isPopular !== undefined) {
      where.isPopular = filters.isPopular;
    }

    // Get total count
    const total = await prisma.plan.count({ where });

    // Get plans with pagination
    const limit = filters.limit || 20;
    const page = filters.page || 1;
    const skip = (page - 1) * limit;
    
    const plans = await prisma.plan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      take: limit,
      skip
    });

    const transformedPlans = plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);
    
    return {
      plans: transformedPlans,
      total,
      hasMore: page < totalPages,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    console.error('Error searching plans:', error);
    throw error;
  }
}

/**
 * Create a new plan
 */
export async function createPlan(data: PlanCreateInput): Promise<Plan> {
  try {
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        currency: data.currency || 'USD',
        trialDays: data.trialDays,
        limits: JSON.stringify(data.limits),
        features: JSON.stringify(data.features),
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        sortOrder: data.sortOrder ?? 0
      }
    });

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
}

/**
 * Update a plan
 */
export async function updatePlan(id: number, data: PlanUpdateInput): Promise<Plan | null> {
  try {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.basePrice && { basePrice: data.basePrice }),
        ...(data.currency && { currency: data.currency }),
        ...(data.trialDays && { trialDays: data.trialDays }),
        ...(data.limits && {
          limits: JSON.stringify(data.limits)
        }),
        ...(data.features && { features: JSON.stringify(data.features) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
      }
    });

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
}

/**
 * Delete a plan (soft delete)
 */
export async function deletePlan(id: number): Promise<boolean> {
  try {
    await prisma.plan.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    });
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
}

/**
 * Get active plans
 */
export async function getActivePlans(): Promise<Plan[]> {
  try {
    const plans = await prisma.plan.findMany({
      where: { 
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    });

    return plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting active plans:', error);
    throw error;
  }
}

/**
 * Get plan statistics
 */
export async function getPlanStats() {
  try {
    const [totalPlans, activePlans, popularPlans] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.plan.count({ where: { isPopular: true } })
    ]);

    return {
      totalPlans,
      activePlans,
      popularPlans
    };
  } catch (error) {
    console.error('Error getting plan stats:', error);
    throw error;
  }
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedPlans = {
  /**
   * Find plan by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.plan.findUnique({
      where: { id }
    });
  },

  /**
   * Find plan by name (simplified API)
   */
  findByName: async (name: string) => {
    return await prisma.plan.findFirst({
      where: { 
        name,
        isActive: true 
      }
    });
  },

  /**
   * Create new plan (simplified API)
   */
  create: async (data: any) => {
    return await prisma.plan.create({
      data
    });
  },

  /**
   * Update plan (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.plan.update({
      where: { id },
      data
    });
  },

  /**
   * Delete plan (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.plan.delete({
      where: { id }
    });
  },

  /**
   * Search plans with simple filters (simplified API)
   */
  search: async (filters: any) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
    if (whereFilters.isPopular !== undefined) where.isPopular = whereFilters.isPopular;
    
    // Text search
    if (whereFilters.search) {
      where.OR = [
        { name: { contains: whereFilters.search } },
        { description: { contains: whereFilters.search } }
      ];
    }

    // Price range
    if (whereFilters.minPrice !== undefined || whereFilters.maxPrice !== undefined) {
      where.basePrice = {};
      if (whereFilters.minPrice !== undefined) where.basePrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== undefined) where.basePrice.lte = whereFilters.maxPrice;
    }

    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit
      }),
      prisma.plan.count({ where })
    ]);

    return {
      data: plans,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },

  /**
   * Find first plan matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    const plan = await prisma.plan.findFirst({
      where,
      include: {
        subscriptions: {
          select: {
            id: true,
            merchantId: true,
            status: true
          }
        }
      }
    });

    if (!plan) return null;

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits as string),
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      subscriptions: plan.subscriptions
    };
  },

  /**
   * Get plan statistics (simplified API)
   */
  getStats: async () => {
    const [totalPlans, activePlans, popularPlans] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.plan.count({ where: { isPopular: true } })
    ]);

    return {
      totalPlans,
      activePlans,
      popularPlans
    };
  }
};