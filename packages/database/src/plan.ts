// ============================================================================
// PLAN DATABASE FUNCTIONS - MODERN SUBSCRIPTION SYSTEM
// ============================================================================

import { prisma } from './client';
import type { Plan, PlanCreateInput, PlanUpdateInput, PlanFilters } from '@rentalshop/types';
import { calculatePlanPricing } from './subscription';

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
      price: basePrice * 3 * 0.95, // 5% discount for quarterly
      discount: 5,
      savings: basePrice * 3 * 0.05
    },
    yearly: {
      price: basePrice * 12 * 0.85, // 15% discount for yearly
      discount: 15,
      savings: basePrice * 12 * 0.15
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