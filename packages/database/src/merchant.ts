
// ============================================================================
// SIMPLIFIED MERCHANT OPERATIONS
// ============================================================================
// Consistent with other simplified database operations

import { prisma } from './client';
import { ORDER_STATUS } from '@rentalshop/constants';
import type { SimpleFilters, SimpleResponse } from './index';
import { removeVietnameseDiacritics } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

type BusinessTypeEnum = 'GENERAL' | 'VEHICLE' | 'CLOTHING' | 'EQUIPMENT';
type PricingTypeEnum = 'FIXED' | 'HOURLY' | 'DAILY';

export interface MerchantFilters extends SimpleFilters {
  businessType?: BusinessTypeEnum;
  // subscriptionStatus removed - use subscription.status instead
  planId?: number;
  isActive?: boolean;
}

export interface MerchantCreateData {
  name: string;
  email: string;
  phone?: string;
  tenantKey?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: BusinessTypeEnum;
  pricingType?: PricingTypeEnum;
  taxId?: string;
  website?: string;
  description?: string;
  currency?: string; // Currency code (USD, VND), defaults to USD
  pricingConfig?: string;
  planId?: number;
  // subscriptionStatus removed - use subscription.status instead
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
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      website: true,
      description: true,
      businessType: true,
      pricingType: true,
      pricingConfig: true,
      taxId: true,
      currency: true,
      tenantKey: true, // Include tenantKey for public product links
      isActive: true,
      createdAt: true,
      updatedAt: true,
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
 * Find merchant by tenantKey
 * Used for public product pages where merchant shares link with customers
 */
export async function findByTenantKey(tenantKey: string) {
  return await prisma.merchant.findUnique({
    where: { tenantKey },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      city: true,
      country: true,
      currency: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
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
    planId,
    isActive
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    const searchTerm = search.trim();
    const normalizedTerm = removeVietnameseDiacritics(searchTerm);
    
    const searchConditions: any[] = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } }
    ];
    
    // Add normalized search if different from original
    if (normalizedTerm !== searchTerm) {
      searchConditions.push(
        { name: { contains: normalizedTerm, mode: 'insensitive' } }
      );
    }
    
    where.OR = searchConditions;
  }

  if (businessType) {
    where.businessType = businessType;
  }

  // subscriptionStatus filter removed - use subscription.status instead
  // if (subscriptionStatus) {
  //   where.subscription = {
  //     status: subscriptionStatus
  //   };
  // }

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
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            trialStart: true,
            trialEnd: true,
            amount: true,
            currency: true,
            interval: true,
            period: true,
            discount: true,
            savings: true,
            cancelAtPeriodEnd: true,
            canceledAt: true,
            cancelReason: true,
            plan: {
              select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
                currency: true,
                trialDays: true
              }
            }
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
  const { planId, ...rest } = data;
  return await prisma.merchant.create({
    data: {
      ...rest,
      ...(planId !== undefined ? { Plan: { connect: { id: planId } } } : {}),
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
  const { planId, ...rest } = data;
  return await prisma.merchant.update({
    where: { id },
    data: {
      ...rest,
      ...(planId !== undefined ? { Plan: { connect: { id: planId } } } : {}),
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
      status: { in: [ORDER_STATUS.COMPLETED as any, ORDER_STATUS.RETURNED as any] }
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

/**
 * Check for duplicate merchant by email or phone
 */
export async function checkDuplicate(email?: string, phone?: string, excludeId?: number) {
  if (!email && !phone) {
    return null;
  }

  const conditions = [];
  
  if (email) {
    conditions.push({ email });
  }
  
  if (phone) {
    conditions.push({ phone });
  }

  const where: any = {
    OR: conditions
  };

  // Exclude specific merchant ID (for update operations)
  if (excludeId) {
    where.id = { not: excludeId };
  }

  return await prisma.merchant.findFirst({ where });
}

// ============================================================================
// EXPORT SIMPLIFIED INTERFACE
// ============================================================================

/**
 * Find first merchant matching criteria (simplified API)
 */
export const findFirst = async (whereClause: any) => {
  // Handle both direct where clause and object with where property
  const where = whereClause?.where || whereClause || {};
  return await prisma.merchant.findFirst({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      businessType: true,
      pricingType: true,
      pricingConfig: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

export const simplifiedMerchants = {
  findById,
  findByEmail,
  findByTenantKey,
  findFirst,
  search,
  create,
  update,
  remove,
  getStats,
  count,
  checkDuplicate
};


