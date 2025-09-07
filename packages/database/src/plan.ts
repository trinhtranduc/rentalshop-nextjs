// ============================================================================
// PLAN DATABASE FUNCTIONS - MODERN SUBSCRIPTION SYSTEM
// ============================================================================

import { prisma } from './client';
import type { Plan, PlanCreateInput, PlanUpdateInput, PlanFilters } from '@rentalshop/types';
import { calculatePlanPricing } from './subscription';

/**
 * Get plan by public ID
 */
export async function getPlanByPublicId(publicId: number): Promise<Plan | null> {
  try {
    const plan = await prisma.plan.findUnique({
      where: { publicId }
    });

    if (!plan) return null;

    return {
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
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

    return plans.map(plan => ({
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
    }));
  } catch (error) {
    console.error('Error getting all plans:', error);
    throw error;
  }
}

/**
 * Search plans with filters
 */
export async function searchPlans(filters: PlanFilters = {}): Promise<{ plans: Plan[]; total: number; hasMore: boolean }> {
  try {
    const where: any = {};

    // Apply filters
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
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
    const plans = await prisma.plan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      take: filters.limit || 20,
      skip: filters.offset || 0
    });

    const transformedPlans = plans.map(plan => ({
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
    }));

    return {
      plans: transformedPlans,
      total,
      hasMore: (filters.offset || 0) + (filters.limit || 20) < total
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
    // Generate next publicId
    const lastPlan = await prisma.plan.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastPlan?.publicId || 0) + 1;

    const plan = await prisma.plan.create({
      data: {
        publicId: nextPublicId,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        currency: data.currency || 'USD',
        trialDays: data.trialDays,
        maxOutlets: data.limits.outlets,
        maxUsers: data.limits.users,
        maxProducts: data.limits.products,
        maxCustomers: data.limits.customers,
        features: JSON.stringify(data.features),
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        sortOrder: data.sortOrder ?? 0
      }
    });

    return {
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
    };
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
}

/**
 * Update a plan
 */
export async function updatePlan(publicId: number, data: PlanUpdateInput): Promise<Plan | null> {
  try {
    const plan = await prisma.plan.update({
      where: { publicId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.basePrice && { basePrice: data.basePrice }),
        ...(data.currency && { currency: data.currency }),
        ...(data.trialDays && { trialDays: data.trialDays }),
        ...(data.limits && {
          maxOutlets: data.limits.outlets,
          maxUsers: data.limits.users,
          maxProducts: data.limits.products,
          maxCustomers: data.limits.customers
        }),
        ...(data.features && { features: JSON.stringify(data.features) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
      }
    });

    return {
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
    };
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
}

/**
 * Delete a plan (soft delete)
 */
export async function deletePlan(publicId: number): Promise<boolean> {
  try {
    await prisma.plan.update({
      where: { publicId },
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

    return plans.map(plan => ({
      id: plan.id,
      publicId: plan.publicId,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: {
        outlets: plan.maxOutlets,
        users: plan.maxUsers,
        products: plan.maxProducts,
        customers: plan.maxCustomers
      },
      features: JSON.parse(plan.features || '[]'),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      pricing: calculatePlanPricing(plan.basePrice)
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