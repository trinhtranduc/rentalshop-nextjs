import { prisma } from './client';
import type { Prisma } from '@prisma/client';

/**
 * Create payment
 */
export async function createPayment(data: Prisma.PaymentCreateInput) {
  return await prisma.payment.create({
    data,
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}

/**
 * Find payment by ID
 */
export async function findById(id: number) {
  return await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}

/**
 * Find payments by subscription ID
 */
export async function findBySubscriptionId(subscriptionId: number, options: { limit?: number } = {}) {
  const { limit = 20 } = options;
  
  return await prisma.payment.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Search payments with pagination
 */
export async function searchPayments(filters: any) {
  const { where, include, orderBy, take = 20, skip = 0 } = filters;
  
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include,
      orderBy,
      take,
      skip
    }),
    prisma.payment.count({ where })
  ]);

  return {
    data: payments,
    total,
    page: Math.floor(skip / take) + 1,
    limit: take,
    hasMore: skip + take < total
  };
}

// ============================================================================
// SIMPLIFIED PAYMENTS API
// ============================================================================

export const simplifiedPayments = {
  /**
   * Create payment (simplified API)
   */
  create: createPayment,

  /**
   * Find payment by ID (simplified API)
   */
  findById,

  /**
   * Find payments by subscription ID (simplified API)
   */
  findBySubscriptionId,

  /**
   * Search payments (simplified API)
   */
  search: searchPayments,

  /**
   * Find first payment matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.payment.findFirst({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true
          }
        }
      }
    });
  },

  /**
   * Get payment statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.payment.count({ where });
  },

  /**
   * Group payments by field (simplified API)
   */
  groupBy: async (args: any) => {
    return await prisma.payment.groupBy(args);
  },

  /**
   * Aggregate payments (simplified API)
   */
  aggregate: async (args: any) => {
    return await prisma.payment.aggregate(args);
  }
};
