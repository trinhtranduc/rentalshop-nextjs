// ============================================================================
// ENTITY COUNTS VALIDATION
// ============================================================================
// Get current counts for all entities for a merchant

import { prisma } from '@rentalshop/database';
import { ApiError, ErrorCode } from '../errors';
import { USER_ROLE } from '@rentalshop/constants';
import { logger } from '../logger';

export interface EntityCounts {
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}

/**
 * Count merchant users toward plan limits.
 * Soft-deleted accounts (deletedAt) and system ADMIN users are excluded.
 */
export async function countMerchantUsersForPlanLimit(merchantId: number): Promise<number> {
  return prisma.user.count({
    where: {
      merchantId,
      deletedAt: null,
      role: { not: USER_ROLE.ADMIN },
    },
  });
}

/**
 * Get current counts for all entities for a merchant (plan limit enforcement).
 */
export async function getCurrentEntityCounts(merchantId: number): Promise<EntityCounts> {
  try {
    const allUsers = await prisma.user.findMany({
      where: { merchantId },
      select: { id: true, email: true, deletedAt: true, role: true, isActive: true },
    });
    const deletedUsers = allUsers.filter((u) => !!u.deletedAt);

    logger.debug({
      merchantId,
      totalUsersInDB: allUsers.length,
      deletedUsers: deletedUsers.length,
      userDetails: allUsers.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        deletedAt: u.deletedAt ? 'DELETED' : 'NOT_DELETED',
        countsTowardLimit: u.role !== USER_ROLE.ADMIN && !u.deletedAt,
      })),
    }, 'getCurrentEntityCounts - Merchant user details');

    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId } }),
      countMerchantUsersForPlanLimit(merchantId),
      prisma.product.count({ where: { merchantId } }),
      prisma.customer.count({ where: { merchantId } }),
      prisma.order.count({ where: { outlet: { merchantId } } }),
    ]);

    logger.debug({ merchantId, outlets, users, products, customers, orders }, 'Entity counts for merchant');

    return { outlets, users, products, customers, orders };
  } catch (error) {
    logger.error({ error, merchantId }, 'Error getting entity counts');
    throw new ApiError(ErrorCode.DATABASE_ERROR);
  }
}

/**
 * Entity counts for addon deletion validation.
 * Excludes soft-deleted user accounts and other deleted/inactive records from usage totals.
 */
export async function getEntityCountsForAddonDeletion(merchantId: number): Promise<EntityCounts> {
  try {
    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId, isActive: true } }),
      countMerchantUsersForPlanLimit(merchantId),
      prisma.product.count({ where: { merchantId, isActive: true } }),
      prisma.customer.count({ where: { merchantId, deletedAt: null } }),
      prisma.order.count({
        where: {
          outlet: { merchantId },
          deletedAt: null,
        },
      }),
    ]);

    logger.debug(
      { merchantId, outlets, users, products, customers, orders },
      'Entity counts for addon deletion validation'
    );

    return { outlets, users, products, customers, orders };
  } catch (error) {
    logger.error({ error, merchantId }, 'Error getting entity counts for addon deletion');
    throw new ApiError(ErrorCode.DATABASE_ERROR);
  }
}
