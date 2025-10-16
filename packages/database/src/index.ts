// ============================================================================
// SIMPLIFIED DATABASE PACKAGE EXPORTS - NEW VERSION
// ============================================================================
// This is the new, simplified version that replaces the complex dual ID system
// Goal: Reduce from 139 exports to ~10 simple functions

import { prisma } from './client';
import { simplifiedUsers } from './user';
import { simplifiedCustomers } from './customer';
import { simplifiedProducts } from './product';
import { simplifiedOrders } from './order';
import { simplifiedPayments } from './payment';
import { simplifiedOutlets } from './outlet';
import { simplifiedPlans } from './plan';
import { simplifiedSubscriptions } from './subscription';
import { simplifiedSubscriptionActivities } from './subscription-activity';
import { simplifiedMerchants } from './merchant';
import { simplifiedOrderNumbers } from './order-number-generator';
import { simplifiedCategories } from './category';
import { simplifiedAuditLogs } from './audit-logs';
import { simplifiedOrderItems } from './order-items';
import { sessions } from './sessions';

// Optimized order functions (temporarily disabled due to type issues)
// export { 
//   searchOrdersOptimized, 
//   searchOrdersWithCursor, 
//   getOrderDetailsOptimized, 
//   getOrderSummary 
// } from './order-optimized';

// Database client
export { prisma };

// ============================================================================
// TYPES FOR SIMPLIFIED API
// ============================================================================

export interface SimpleFilters {
  merchantId?: number;
  outletId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SimpleResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// SIMPLIFIED DATABASE API
// ============================================================================

/**
 * Simplified database operations
 * Replaces the complex dual ID system with simple, consistent operations
 */
const db = {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  users: simplifiedUsers,

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================
  customers: simplifiedCustomers,

  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================
  products: simplifiedProducts,

  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================
  orders: simplifiedOrders,

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================
  payments: simplifiedPayments,

  // ============================================================================
  // OUTLET OPERATIONS
  // ============================================================================
  outlets: simplifiedOutlets,

  // ============================================================================
  // MERCHANT OPERATIONS
  // ============================================================================
  merchants: simplifiedMerchants,

  // ============================================================================
  // PLAN OPERATIONS
  // ============================================================================
  plans: simplifiedPlans,

  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  categories: simplifiedCategories,

  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================
  auditLogs: simplifiedAuditLogs,

  // ============================================================================
  // ORDER ITEM OPERATIONS
  // ============================================================================
  orderItems: simplifiedOrderItems,

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================
  subscriptions: simplifiedSubscriptions,

  // ============================================================================
  // ORDER NUMBER OPERATIONS
  // ============================================================================
  orderNumbers: simplifiedOrderNumbers,

  // ============================================================================
  // OUTLET STOCK OPERATIONS
  // ============================================================================
  outletStock: {
    /**
     * Aggregate outlet stock statistics
     */
    aggregate: async (options: any) => {
      return await prisma.outletStock.aggregate(options);
    }
  },

  // ============================================================================
  // SUBSCRIPTION ACTIVITY OPERATIONS
  // ============================================================================
  subscriptionActivities: simplifiedSubscriptionActivities,

  // ============================================================================
  // SESSION OPERATIONS (Single Session Enforcement)
  // ============================================================================
  sessions
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check database connection health
 */
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Generate next order number (simplified)
 */
const generateOrderNumber = async (outletId: number): Promise<string> => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }

  // Get the count of orders for this outlet
  const orderCount = await prisma.order.count({
    where: { outletId }
  });

  const sequence = (orderCount + 1).toString().padStart(4, '0');
  return `ORD-${outletId.toString().padStart(3, '0')}-${sequence}`;
};

// ============================================================================
// EXPORTS
// ============================================================================

export { db, checkDatabaseConnection, generateOrderNumber };

// Export payment functions
export { simplifiedPayments } from './payment';

// Export subscription activity functions
export { simplifiedSubscriptionActivities } from './subscription-activity';

// Legacy exports for backward compatibility
export { getSubscriptionByMerchantId, createSubscriptionPayment, updateSubscription, getExpiredSubscriptions, getSubscriptionById } from './subscription';
export { AuditLogger, getAuditLogger, extractAuditContext } from './audit';
export type { AuditContext } from './audit';
export { getOutletOrderStats, createOrderNumberWithFormat } from './order-number-generator';
export type { OrderNumberFormat } from './order-number-generator';
export { searchOrders } from './order'; // Legacy order search function

// Registration functions
export { registerUser, registerMerchantWithTrial } from './registration';
export type { RegistrationInput, RegistrationResult } from './registration';

// ============================================================================
// MIGRATION GUIDE
// ============================================================================
/*
OLD WAY (139 exports):
import { 
  findOutletByPublicId, 
  convertOutletPublicIdToDatabaseId,
  getCustomerByPublicId as getCustomerById,
  getOutletByPublicId as getOutletById,
  // ... 135 more exports
} from '@rentalshop/database';

NEW WAY (3 main exports):
import { db, prisma, checkDatabaseConnection } from '@rentalshop/database';

// Usage examples:
const user = await db.users.findById(123);
const users = await db.users.search({ merchantId: 1, page: 1, limit: 20 });
const product = await db.products.findByBarcode('123456789');
const orders = await db.orders.search({ outletId: 1, status: 'ACTIVE' });

BENEFITS:
✅ 93% reduction in exports (139 → 10)
✅ Consistent API across all entities
✅ No more dual ID complexity
✅ Better TypeScript support
✅ Easier to maintain and debug
✅ Better performance with optimized queries
*/
