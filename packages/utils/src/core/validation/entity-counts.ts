// ============================================================================
// ENTITY COUNTS VALIDATION
// ============================================================================
// Get current counts for all entities for a merchant

import { prisma } from '@rentalshop/database';
import { ApiError, ErrorCode } from '../errors';
import { USER_ROLE } from '@rentalshop/constants';
import { logger } from '../logger';

/**
 * Get current counts for all entities for a merchant
 */
export async function getCurrentEntityCounts(merchantId: number): Promise<{
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}> {
  try {
    // Debug: Get detailed user count info
    const allUsers = await prisma.user.findMany({
      where: { merchantId },
      select: { id: true, email: true, deletedAt: true, role: true, isActive: true }
    });
    const nonDeletedUsers = allUsers.filter((u: { deletedAt: Date | null }): boolean => !u.deletedAt);
    const nonDeletedNonAdminUsers = nonDeletedUsers.filter((u: { role: string }): boolean => u.role !== USER_ROLE.ADMIN);
    const adminUsers = allUsers.filter((u: { role: string }): boolean => u.role === USER_ROLE.ADMIN);
    const deletedUsers = allUsers.filter((u: { deletedAt: Date | null }): boolean => !!u.deletedAt);
    
    logger.debug({
      merchantId,
      totalUsersInDB: allUsers.length,
      nonDeletedUsers: nonDeletedUsers.length,
      nonDeletedNonAdminUsers: nonDeletedNonAdminUsers.length,
      adminUsers: adminUsers.length,
      deletedUsers: deletedUsers.length,
      userDetails: allUsers.map((u: { id: number; email: string; role: string; deletedAt: Date | null; isActive: boolean }): { id: number; email: string; role: string; deletedAt: string; isActive: boolean; countsTowardLimit: boolean } => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        deletedAt: u.deletedAt ? 'DELETED' : 'NOT_DELETED',
        countsTowardLimit: u.role !== USER_ROLE.ADMIN && !u.deletedAt
      }))
    }, 'getCurrentEntityCounts - Merchant user details');

    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId } }),
      // Exclude soft-deleted users (deletedAt = null) and ADMIN users from count
      // Count both active and inactive users (isActive = true or false)
      // ADMIN users are system-wide and should not count toward merchant limits
      prisma.user.count({ 
        where: { 
          merchantId, 
          deletedAt: null, // Only exclude deleted users
          role: { not: USER_ROLE.ADMIN } // Exclude ADMIN users from limit count
        } 
      }),
      prisma.product.count({ where: { merchantId } }),
      prisma.customer.count({ where: { merchantId } }),
      // Count ALL orders including CANCELLED for plan limits
      prisma.order.count({ where: { outlet: { merchantId } } })
    ]);

    logger.debug({
      merchantId,
      outlets,
      users,
      products,
      customers,
      orders
    }, 'Entity counts for merchant');

    return {
      outlets,
      users,
      products,
      customers,
      orders
    };
  } catch (error) {
    logger.error({ error, merchantId }, 'Error getting entity counts');
    throw new ApiError(ErrorCode.DATABASE_ERROR);
  }
}
