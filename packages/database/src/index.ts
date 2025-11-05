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
// import { simplifiedMerchants } from './merchant'; // TEMPORARY: Disabled for multi-tenant migration
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
  // Note: merchantId removed - tenant databases are already isolated per tenant
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
  // PRISMA CLIENT (for transactions)
  // ============================================================================
  prisma,

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
  // merchants: simplifiedMerchants, // TEMPORARY: Disabled for multi-tenant migration

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
 * Generate next order number (simplified) - Random 8 digits
 */
const generateOrderNumber = async (outletId: number): Promise<string> => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }

  // Generate random 8-digit number
  const generateRandom8Digits = (): string => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const randomSequence = generateRandom8Digits();
    const orderNumber = randomSequence; // Just 8 random digits, no prefix
    
    // Check if order number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    });

    if (!existingOrder) {
      return orderNumber;
    }
  }

  throw new Error('Failed to generate unique order number after maximum retries');
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
// Note: getSubscriptionByMerchantId removed - tenant databases are already isolated per tenant
export { createSubscriptionPayment, updateSubscription, getExpiredSubscriptions, getSubscriptionById } from './subscription';
export { AuditLogger, getAuditLogger, extractAuditContext } from './audit';
export type { AuditContext } from './audit';
export { getOutletOrderStats, createOrderNumberWithFormat } from './order-number-generator';
export { getDefaultOutlet } from './outlet';
export type { OrderNumberFormat } from './order-number-generator';
export { searchOrders } from './order'; // Legacy order search function

// Registration functions
// Note: registerMerchantWithTrial removed - use registerTenantWithTrial instead
export { registerUser, registerTenantWithTrial } from './registration';
export type { RegistrationInput, RegistrationResult } from './registration';

// Email verification functions
export * from './email-verification';

// Multi-tenant functions
export { 
  getTenantDb, 
  createTenantDatabase,
  clearTenantCache,
  getCachedTenants
} from './tenant-db';

// Main DB functions
export {
  getMainDbClient,
  getTenantBySubdomain,
  getTenantById,
  subdomainExists,
  tenantEmailExists,
  createTenant,
  updateTenant,
  listAllTenants,
  getPlanById,
  listActivePlans,
  getDefaultPlan
} from './main-db';

export type { Tenant, Plan } from './main-db';

// Subdomain utilities
export {
  sanitizeSubdomain,
  validateSubdomain,
  generateSubdomain,
  getRootDomain,
  getProtocol,
  buildTenantUrl,
  extractSubdomain,
  isReservedSubdomain,
  getReservedSubdomains
} from './subdomain-utils';

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
const users = await db.users.search({ page: 1, limit: 20 }); // Note: merchantId not needed - tenant isolation
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
