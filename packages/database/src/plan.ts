// ============================================================================
// PLAN DATABASE FUNCTIONS - DUAL ID SYSTEM
// ============================================================================

import { prisma } from './client';
import type { PlanCreateInput, PlanUpdateInput, PlanFilters } from '@rentalshop/types';

/**
 * Helper function to get billing cycle ID by value
 */
async function getBillingCycleId(value: string): Promise<string | null> {
  const billingCycle = await prisma.billingCycle.findUnique({
    where: { value }
  });
  return billingCycle?.id || null;
}

/**
 * Get plan by public ID
 */
export async function getPlanByPublicId(publicId: number) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { publicId },
      include: {
        billingCycle: true,
        subscriptions: {
          select: {
            id: true,
            publicId: true,
            status: true,
            amount: true,
            merchant: {
              select: {
                publicId: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!plan) return null;

    // Transform to match frontend expectations
    return {
      id: plan.publicId,                    // Return publicId as "id"
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      trialDays: plan.trialDays,
      maxOutlets: plan.maxOutlets,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxCustomers: plan.maxCustomers,
      features: plan.features ? JSON.parse(plan.features) : [],
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      billingCycle: plan.billingCycle?.value || 'monthly',
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      // Computed fields
      merchantCount: plan.subscriptions.filter(sub => sub.status === 'ACTIVE').length,
      totalRevenue: plan.subscriptions
        .filter(sub => sub.status === 'ACTIVE')
        .reduce((sum, sub) => sum + (sub.amount || 0), 0)
    };
  } catch (error) {
    console.error('Error getting plan by public ID:', error);
    throw error;
  }
}

/**
 * Search plans with filtering and pagination
 */
export async function searchPlans(filters: PlanFilters = {}) {
  try {
    const {
      search,
      isActive,
      isPopular,
      limit = 50,
      offset = 0,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = filters;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isPopular !== undefined) {
      where.isPopular = isPopular;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.sortOrder = sortOrder;
    }

    // Fetch plans with related data
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        include: {
          billingCycle: true,
          subscriptions: {
            select: {
              id: true,
              status: true,
              amount: true,
              merchant: {
                select: {
                  publicId: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.plan.count({ where })
    ]);

    // Transform data for frontend
    const transformedPlans = plans.map(plan => {
      const activeSubscriptions = plan.subscriptions.filter(sub => sub.status === 'ACTIVE');
      const merchantCount = activeSubscriptions.length;
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      
      return {
        id: plan.publicId,                    // Return publicId as "id"
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        trialDays: plan.trialDays,
        maxOutlets: plan.maxOutlets,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        maxCustomers: plan.maxCustomers,
        features: plan.features ? JSON.parse(plan.features) : [],
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        billingCycle: plan.billingCycle?.value || 'monthly',
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        // Computed fields
        merchantCount,
        totalRevenue
      };
    });

    return {
      plans: transformedPlans,
      total,
      hasMore: offset + limit < total
    };
  } catch (error) {
    console.error('Error searching plans:', error);
    throw error;
  }
}

/**
 * Create a new plan
 */
export async function createPlan(data: PlanCreateInput) {
  try {
    // Generate next public ID
    const lastPlan = await prisma.plan.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastPlan?.publicId || 0) + 1;

    // Create plan
    const plan = await prisma.plan.create({
      data: {
        publicId: nextPublicId,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || 'USD',
        trialDays: data.trialDays,
        maxOutlets: data.maxOutlets,
        maxUsers: data.maxUsers,
        maxProducts: data.maxProducts,
        maxCustomers: data.maxCustomers,
        features: JSON.stringify(data.features || []),
        isActive: data.isActive !== undefined ? data.isActive : true,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
        billingCycleId: data.billingCycle ? await getBillingCycleId(data.billingCycle) : null
      },
      include: {
        billingCycle: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            amount: true
          }
        }
      }
    });

    // Transform response
    return {
      id: plan.publicId,                    // Return publicId as "id"
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      trialDays: plan.trialDays,
      maxOutlets: plan.maxOutlets,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxCustomers: plan.maxCustomers,
      features: plan.features ? JSON.parse(plan.features) : [],
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      billingCycle: plan.billingCycle?.value || 'monthly',
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      // Computed fields
      merchantCount: 0,
      totalRevenue: 0
    };
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
}

/**
 * Update an existing plan
 */
export async function updatePlan(publicId: number, data: PlanUpdateInput) {
  try {
    // Check if plan exists
    const existingPlan = await prisma.plan.findUnique({
      where: { publicId }
    });

    if (!existingPlan) {
      throw new Error('Plan not found');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.trialDays !== undefined) updateData.trialDays = data.trialDays;
    if (data.maxOutlets !== undefined) updateData.maxOutlets = data.maxOutlets;
    if (data.maxUsers !== undefined) updateData.maxUsers = data.maxUsers;
    if (data.maxProducts !== undefined) updateData.maxProducts = data.maxProducts;
    if (data.maxCustomers !== undefined) updateData.maxCustomers = data.maxCustomers;
    if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle;

    // Update plan
    const plan = await prisma.plan.update({
      where: { publicId },
      data: updateData,
      include: {
        billingCycle: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            amount: true,
            merchant: {
              select: {
                publicId: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Transform response
    const activeSubscriptions = plan.subscriptions.filter(sub => sub.status === 'ACTIVE');
    const merchantCount = activeSubscriptions.length;
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    return {
      id: plan.publicId,                    // Return publicId as "id"
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      trialDays: plan.trialDays,
      maxOutlets: plan.maxOutlets,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxCustomers: plan.maxCustomers,
      features: plan.features ? JSON.parse(plan.features) : [],
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      billingCycle: plan.billingCycle?.value || 'monthly',
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      // Computed fields
      merchantCount,
      totalRevenue
    };
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
}

/**
 * Delete a plan (soft delete by setting isActive to false)
 */
export async function deletePlan(publicId: number) {
  try {
    // Check if plan exists
    const existingPlan = await prisma.plan.findUnique({
      where: { publicId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!existingPlan) {
      throw new Error('Plan not found');
    }

    // Check if plan has active subscriptions
    if (existingPlan.subscriptions.length > 0) {
      throw new Error('Cannot delete plan with active subscriptions');
    }

    // Soft delete by setting isActive to false
    const plan = await prisma.plan.update({
      where: { publicId },
      data: { isActive: false }
    });

    return {
      id: plan.publicId,
      name: plan.name,
      isActive: plan.isActive
    };
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
}

/**
 * Get all active plans (for public display)
 */
export async function getActivePlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        billingCycle: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            amount: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Transform data for frontend
    return plans.map(plan => {
      const activeSubscriptions = plan.subscriptions.filter(sub => sub.status === 'ACTIVE');
      const merchantCount = activeSubscriptions.length;
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      
      return {
        id: plan.publicId,                    // Return publicId as "id"
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        trialDays: plan.trialDays,
        maxOutlets: plan.maxOutlets,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        maxCustomers: plan.maxCustomers,
        features: plan.features ? JSON.parse(plan.features) : [],
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        billingCycle: plan.billingCycle?.value || 'monthly',
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        // Computed fields
        merchantCount,
        totalRevenue
      };
    });
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
    const [totalPlans, activePlans, totalSubscriptions, activeSubscriptions, totalRevenue] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalPlans,
      activePlans,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue: totalRevenue._sum.amount || 0
    };
  } catch (error) {
    console.error('Error getting plan stats:', error);
    throw error;
  }
}
