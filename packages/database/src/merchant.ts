// ============================================================================
// SIMPLIFIED MERCHANT OPERATIONS
// ============================================================================
// Consistent with other simplified database operations

import { prisma } from './client';
import type { SimpleFilters, SimpleResponse } from './index';

// ============================================================================
// TYPES
// ============================================================================

export interface MerchantFilters extends SimpleFilters {
  businessType?: string;
  subscriptionStatus?: string;
  planId?: number;
  isActive?: boolean;
}

export interface MerchantCreateData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  pricingType?: string;
  taxId?: string;
  website?: string;
  description?: string;
  pricingConfig?: string;
  planId?: number;
  subscriptionStatus?: string;
}

export interface MerchantUpdateData extends Partial<MerchantCreateData> {
  totalRevenue?: number;
  lastActiveAt?: Date;
  isActive?: boolean;
}

// ============================================================================
// MERCHANT OPERATIONS
// ============================================================================

/**
 * Find merchant by ID
 */
export async function findById(id: number) {
  return await prisma.merchant.findUnique({
    where: { id },
    include: {
      Plan: true,
      subscription: {
        include: {
          plan: true
        }
      },
      outlets: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      },
      _count: {
        select: {
          outlets: true,
          users: true,
          products: true,
          customers: true
        }
      }
    }
  });
}

/**
 * Find merchant by email
 */
export async function findByEmail(email: string) {
  return await prisma.merchant.findUnique({
    where: { email },
    include: {
      Plan: true,
      subscription: true
    }
  });
}

/**
 * Search merchants with filtering and pagination
 */
export async function search(filters: MerchantFilters): Promise<SimpleResponse<any>> {
  const {
    page = 1,
    limit = 20,
    search,
    businessType,
    subscriptionStatus,
    planId,
    isActive
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { businessType: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (businessType) {
    where.businessType = businessType;
  }

  if (subscriptionStatus) {
    where.subscriptionStatus = subscriptionStatus;
  }

  if (planId !== undefined) {
    where.planId = planId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Execute query
  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        Plan: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            amount: true
          }
        },
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true,
            customers: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.merchant.count({ where })
  ]);

  return {
    data: merchants,
    total,
    page,
    limit,
    hasMore: skip + limit < total
  };
}

/**
 * Create new merchant
 */
export async function create(data: MerchantCreateData) {
  return await prisma.merchant.create({
    data: {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      Plan: true,
      subscription: true
    }
  });
}

/**
 * Update merchant
 */
export async function update(id: number, data: MerchantUpdateData) {
  return await prisma.merchant.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    },
    include: {
      Plan: true,
      subscription: true
    }
  });
}

/**
 * Delete merchant (soft delete)
 */
export async function remove(id: number) {
  return await prisma.merchant.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date()
    }
  });
}

/**
 * Get merchant statistics
 */
export async function getStats(id: number) {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true,
            customers: true
          }
        }
    }
  });

  if (!merchant) {
    return null;
  }

  // Get revenue from orders
  const revenueResult = await prisma.order.aggregate({
    where: {
      outlet: {
        merchantId: id
      },
      status: { in: ['COMPLETED', 'RETURNED'] }
    },
    _sum: {
      totalAmount: true
    }
  });

  return {
    totalOutlets: merchant._count.outlets,
    totalUsers: merchant._count.users,
    totalProducts: merchant._count.products,
    totalCustomers: merchant._count.customers,
    totalOrders: 0, // Will be calculated separately
    totalRevenue: revenueResult._sum.totalAmount || 0
  };
}

/**
 * Count merchants with optional where clause
 */
export async function count(options?: { where?: any }) {
  const where = options?.where || {};
  return await prisma.merchant.count({ where });
}

// ============================================================================
// EXPORT SIMPLIFIED INTERFACE
// ============================================================================

export const simplifiedMerchants = {
  findById,
  findByEmail,
  search,
  create,
  update,
  remove,
  getStats,
  count
};