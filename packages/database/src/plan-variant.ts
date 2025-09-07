// ============================================================================
// PLAN VARIANT DATABASE FUNCTIONS - DUAL ID SYSTEM
// ============================================================================

import { prisma } from './client';
import type { PlanVariantCreateInput, PlanVariantUpdateInput, PlanVariantFilters } from '@rentalshop/types';

/**
 * Get plan variant by public ID
 */
export async function getPlanVariantByPublicId(publicId: number) {
  try {
    const variant = await prisma.planVariant.findUnique({
      where: { publicId },
      include: {
        plan: {
          select: {
            publicId: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
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

    if (!variant) return null;

    // Transform to match frontend expectations
    return {
      id: variant.publicId,                    // Return publicId as "id"
      planId: variant.plan.publicId,           // Return plan's publicId
      name: variant.name,
      duration: variant.duration,
      price: variant.price,
      discount: variant.discount,
      savings: variant.savings,
      isActive: variant.isActive,
      isPopular: variant.isPopular,
      sortOrder: variant.sortOrder,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      // Plan information
      plan: {
        id: variant.plan.publicId,
        name: variant.plan.name,
        description: variant.plan.description,
        basePrice: variant.plan.basePrice,
        currency: variant.plan.currency
      },
      // Computed fields
      subscriptionCount: variant.subscriptions.filter(sub => sub.status === 'ACTIVE').length,
      totalRevenue: variant.subscriptions
        .filter(sub => sub.status === 'ACTIVE')
        .reduce((sum, sub) => sum + (sub.amount || 0), 0)
    };
  } catch (error) {
    console.error('Error getting plan variant by public ID:', error);
    throw error;
  }
}

/**
 * Search plan variants with filtering and pagination
 */
export async function searchPlanVariants(filters: PlanVariantFilters = {}) {
  try {
    const {
      planId,
      search,
      isActive,
      isPopular,
      duration,
      minPrice,
      maxPrice,
      showAll = false,
      limit = 50,
      offset = 0,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = filters;

    // Build where clause
    const where: any = {};
    
    if (planId) {
      where.planId = planId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { plan: { name: { contains: search } } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    } else {
      // By default, only show active variants unless explicitly requested otherwise
      where.isActive = true;
    }

    if (isPopular !== undefined) {
      where.isPopular = isPopular;
    }

    if (duration !== undefined) {
      where.duration = duration;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'duration') {
      orderBy.duration = sortOrder;
    } else if (sortBy === 'discount') {
      orderBy.discount = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.sortOrder = sortOrder;
    }

    // Fetch variants with related data
    const [variants, total] = await Promise.all([
      prisma.planVariant.findMany({
        where,
        include: {
          plan: {
            select: {
              publicId: true,
              name: true,
              description: true,
              basePrice: true,
              currency: true
            }
          },
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
      prisma.planVariant.count({ where })
    ]);

    // Transform data for frontend
    const transformedVariants = variants.map(variant => {
      const activeSubscriptions = variant.subscriptions.filter(sub => sub.status === 'ACTIVE');
      const subscriptionCount = activeSubscriptions.length;
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      
      return {
        id: variant.publicId,                    // Return publicId as "id"
        planId: variant.plan.publicId,           // Return plan's publicId
        name: variant.name,
        duration: variant.duration,
        price: variant.price,
        discount: variant.discount,
        savings: variant.savings,
        isActive: variant.isActive,
        isPopular: variant.isPopular,
        sortOrder: variant.sortOrder,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        // Plan information
        plan: {
          id: variant.plan.publicId,
          name: variant.plan.name,
          description: variant.plan.description,
          basePrice: variant.plan.basePrice,
          currency: variant.plan.currency
        },
        // Computed fields
        subscriptionCount,
        totalRevenue
      };
    });

    return {
      variants: transformedVariants,
      total,
      hasMore: offset + limit < total
    };
  } catch (error) {
    console.error('Error searching plan variants:', error);
    throw error;
  }
}

/**
 * Create a new plan variant
 */
export async function createPlanVariant(data: PlanVariantCreateInput) {
  try {
    // Generate next public ID
    const lastVariant = await prisma.planVariant.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastVariant?.publicId || 0) + 1;

    // Calculate savings if discount is provided
    const basePrice = data.basePrice || 0;
    const discount = data.discount || 0;
    const price = data.price || (basePrice * (1 - discount / 100));
    const savings = basePrice - price;

    // Create variant
    const variant = await prisma.planVariant.create({
      data: {
        publicId: nextPublicId,
        planId: data.planId,
        name: data.name,
        duration: data.duration,
        price: price,
        discount: discount,
        savings: savings,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0
      },
      include: {
        plan: {
          select: {
            publicId: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        }
      }
    });

    // Transform response
    return {
      id: variant.publicId,                    // Return publicId as "id"
      planId: variant.plan.publicId,           // Return plan's publicId
      name: variant.name,
      duration: variant.duration,
      price: variant.price,
      discount: variant.discount,
      savings: variant.savings,
      isActive: variant.isActive,
      isPopular: variant.isPopular,
      sortOrder: variant.sortOrder,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      // Plan information
      plan: {
        id: variant.plan.publicId,
        name: variant.plan.name,
        description: variant.plan.description,
        basePrice: variant.plan.basePrice,
        currency: variant.plan.currency
      },
      // Computed fields
      subscriptionCount: 0,
      totalRevenue: 0
    };
  } catch (error) {
    console.error('Error creating plan variant:', error);
    throw error;
  }
}

/**
 * Update an existing plan variant
 */
export async function updatePlanVariant(publicId: number, data: PlanVariantUpdateInput) {
  try {
    // Check if variant exists
    const existingVariant = await prisma.planVariant.findUnique({
      where: { publicId },
      include: { plan: true }
    });

    if (!existingVariant) {
      throw new Error('Plan variant not found');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Recalculate savings if price or discount changed
    if (data.price !== undefined || data.discount !== undefined) {
      const basePrice = existingVariant.plan.basePrice;
      const newPrice = data.price !== undefined ? data.price : existingVariant.price;
      const newDiscount = data.discount !== undefined ? data.discount : existingVariant.discount;
      const newSavings = basePrice - newPrice;
      
      updateData.savings = newSavings;
    }

    // Update variant
    const variant = await prisma.planVariant.update({
      where: { publicId },
      data: updateData,
      include: {
        plan: {
          select: {
            publicId: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
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
    const activeSubscriptions = variant.subscriptions.filter(sub => sub.status === 'ACTIVE');
    const subscriptionCount = activeSubscriptions.length;
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    return {
      id: variant.publicId,                    // Return publicId as "id"
      planId: variant.plan.publicId,           // Return plan's publicId
      name: variant.name,
      duration: variant.duration,
      price: variant.price,
      discount: variant.discount,
      savings: variant.savings,
      isActive: variant.isActive,
      isPopular: variant.isPopular,
      sortOrder: variant.sortOrder,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      // Plan information
      plan: {
        id: variant.plan.publicId,
        name: variant.plan.name,
        description: variant.plan.description,
        basePrice: variant.plan.basePrice,
        currency: variant.plan.currency
      },
      // Computed fields
      subscriptionCount,
      totalRevenue
    };
  } catch (error) {
    console.error('Error updating plan variant:', error);
    throw error;
  }
}

/**
 * Delete a plan variant (permanent delete)
 */
export async function deletePlanVariant(publicId: number) {
  try {
    // Check if variant exists
    const existingVariant = await prisma.planVariant.findUnique({
      where: { publicId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!existingVariant) {
      throw new Error('Plan variant not found');
    }

    // Check if variant has active subscriptions
    if (existingVariant.subscriptions.length > 0) {
      throw new Error('Cannot delete plan variant with active subscriptions');
    }

    // Permanently delete the variant
    await prisma.planVariant.delete({
      where: { publicId }
    });

    return {
      id: publicId,
      name: existingVariant.name,
      permanentlyDeleted: true,
      deletedAt: new Date()
    };
  } catch (error) {
    console.error('Error deleting plan variant:', error);
    throw error;
  }
}

/**
 * Restore a deleted plan variant (recycling)
 */
export async function restorePlanVariant(publicId: number) {
  try {
    // Check if variant exists and is deleted
    const existingVariant = await prisma.planVariant.findUnique({
      where: { publicId }
    });

    if (!existingVariant) {
      throw new Error('Plan variant not found');
    }

    if (existingVariant.isActive) {
      throw new Error('Plan variant is already active');
    }

    // Restore variant by setting isActive to true
    const variant = await prisma.planVariant.update({
      where: { publicId },
      data: { 
        isActive: true,
        deletedAt: null  // Clear deletion timestamp
      }
    });

    return {
      id: variant.publicId,
      name: variant.name,
      isActive: variant.isActive,
      restoredAt: new Date()
    };
  } catch (error) {
    console.error('Error restoring plan variant:', error);
    throw error;
  }
}

/**
 * Get deleted plan variants (for recycling management)
 */
export async function getDeletedPlanVariants() {
  try {
    const deletedVariants = await prisma.planVariant.findMany({
      where: { 
        isActive: false,
        deletedAt: { not: null }
      },
      include: {
        plan: {
          select: {
            publicId: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
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
      orderBy: { deletedAt: 'desc' }
    });

    return deletedVariants.map(variant => ({
      id: variant.publicId,
      planId: variant.plan.publicId,
      name: variant.name,
      duration: variant.duration,
      price: variant.price,
      discount: variant.discount,
      savings: variant.savings,
      isActive: variant.isActive,
      isPopular: variant.isPopular,
      sortOrder: variant.sortOrder,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      deletedAt: variant.deletedAt,
      // Plan information
      plan: {
        id: variant.plan.publicId,
        name: variant.plan.name,
        description: variant.plan.description,
        basePrice: variant.plan.basePrice,
        currency: variant.plan.currency
      },
      // Computed fields
      subscriptionCount: variant.subscriptions.filter(sub => sub.status === 'ACTIVE').length,
      totalRevenue: variant.subscriptions
        .filter(sub => sub.status === 'ACTIVE')
        .reduce((sum, sub) => sum + (sub.amount || 0), 0)
    }));
  } catch (error) {
    console.error('Error getting deleted plan variants:', error);
    throw error;
  }
}

/**
 * Permanently delete a plan variant (hard delete - use with caution)
 */
export async function permanentlyDeletePlanVariant(publicId: number) {
  try {
    // Check if variant exists
    const existingVariant = await prisma.planVariant.findUnique({
      where: { publicId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!existingVariant) {
      throw new Error('Plan variant not found');
    }

    // Check if variant has active subscriptions
    if (existingVariant.subscriptions.length > 0) {
      throw new Error('Cannot permanently delete plan variant with active subscriptions');
    }

    // Hard delete - removes from database
    await prisma.planVariant.delete({
      where: { publicId }
    });

    return {
      id: publicId,
      name: existingVariant.name,
      permanentlyDeleted: true,
      deletedAt: new Date()
    };
  } catch (error) {
    console.error('Error permanently deleting plan variant:', error);
    throw error;
  }
}

/**
 * Get all active plan variants for a specific plan
 */
export async function getActivePlanVariants(planId: string) {
  try {
    const variants = await prisma.planVariant.findMany({
      where: { 
        planId,
        isActive: true 
      },
      include: {
        plan: {
          select: {
            publicId: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
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
    return variants.map(variant => {
      const activeSubscriptions = variant.subscriptions.filter(sub => sub.status === 'ACTIVE');
      const subscriptionCount = activeSubscriptions.length;
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      
      return {
        id: variant.publicId,                    // Return publicId as "id"
        planId: variant.plan.publicId,           // Return plan's publicId
        name: variant.name,
        duration: variant.duration,
        price: variant.price,
        discount: variant.discount,
        savings: variant.savings,
        isActive: variant.isActive,
        isPopular: variant.isPopular,
        sortOrder: variant.sortOrder,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        // Plan information
        plan: {
          id: variant.plan.publicId,
          name: variant.plan.name,
          description: variant.plan.description,
          basePrice: variant.plan.basePrice,
          currency: variant.plan.currency
        },
        // Computed fields
        subscriptionCount,
        totalRevenue
      };
    });
  } catch (error) {
    console.error('Error getting active plan variants:', error);
    throw error;
  }
}

/**
 * Get plan variant statistics
 */
export async function getPlanVariantStats() {
  try {
    const [totalVariants, activeVariants, totalSubscriptions, activeSubscriptions, totalRevenue] = await Promise.all([
      prisma.planVariant.count(),
      prisma.planVariant.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalVariants,
      activeVariants,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue: totalRevenue._sum.amount || 0
    };
  } catch (error) {
    console.error('Error getting plan variant stats:', error);
    throw error;
  }
}

/**
 * Bulk operations for plan variants
 */

/**
 * Disable all variants for a plan
 */
export async function disableAllPlanVariants(planId: string) {
  try {
    const result = await prisma.planVariant.updateMany({
      where: { planId },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    });

    return {
      planId,
      disabledCount: result.count,
      disabledAt: new Date()
    };
  } catch (error) {
    console.error('Error disabling all plan variants:', error);
    throw error;
  }
}

/**
 * Enable all variants for a plan
 */
export async function enableAllPlanVariants(planId: string) {
  try {
    const result = await prisma.planVariant.updateMany({
      where: { planId },
      data: { 
        isActive: true,
        deletedAt: null
      }
    });

    return {
      planId,
      enabledCount: result.count,
      enabledAt: new Date()
    };
  } catch (error) {
    console.error('Error enabling all plan variants:', error);
    throw error;
  }
}

/**
 * Apply discount to all variants of a plan
 */
export async function applyDiscountToAllVariants(planId: string, discount: number) {
  try {
    // Get all variants for the plan
    const variants = await prisma.planVariant.findMany({
      where: { planId },
      include: { plan: true }
    });

    // Update each variant with new discount
    const updatePromises = variants.map(variant => {
      const basePrice = variant.plan.basePrice;
      const newPrice = basePrice * (1 - discount / 100);
      const newSavings = basePrice - newPrice;

      return prisma.planVariant.update({
        where: { id: variant.id },
        data: {
          discount: discount,
          price: newPrice,
          savings: newSavings
        }
      });
    });

    await Promise.all(updatePromises);

    return {
      planId,
      discount,
      updatedCount: variants.length,
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error applying discount to all variants:', error);
    throw error;
  }
}
