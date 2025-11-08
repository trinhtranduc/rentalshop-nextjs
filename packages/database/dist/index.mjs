import { prisma } from "./client";
import { simplifiedUsers } from "./user";
import { simplifiedCustomers } from "./customer";
import { simplifiedProducts } from "./product";
import { simplifiedOrders } from "./order";
import { simplifiedPayments } from "./payment";
import { simplifiedOutlets } from "./outlet";
import { simplifiedPlans } from "./plan";
import { simplifiedSubscriptions } from "./subscription";
import { simplifiedSubscriptionActivities } from "./subscription-activity";
import { simplifiedOrderNumbers } from "./order-number-generator";
import { simplifiedCategories } from "./category";
import { simplifiedAuditLogs } from "./audit-logs";
import { simplifiedOrderItems } from "./order-items";
import { sessions } from "./sessions";
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
    aggregate: async (options) => {
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
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (error) {
    return { status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" };
  }
};
const generateOrderNumber = async (outletId) => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const generateRandom8Digits = () => {
    return Math.floor(1e7 + Math.random() * 9e7).toString();
  };
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const randomSequence = generateRandom8Digits();
    const orderNumber = randomSequence;
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    });
    if (!existingOrder) {
      return orderNumber;
    }
  }
  throw new Error("Failed to generate unique order number after maximum retries");
};
import { simplifiedPayments as simplifiedPayments2 } from "./payment";
import { simplifiedSubscriptionActivities as simplifiedSubscriptionActivities2 } from "./subscription-activity";
import { createSubscriptionPayment, updateSubscription, getExpiredSubscriptions, getSubscriptionById } from "./subscription";
import { AuditLogger, getAuditLogger, extractAuditContext } from "./audit";
import { getOutletOrderStats, createOrderNumberWithFormat } from "./order-number-generator";
import { getDefaultOutlet } from "./outlet";
import { searchOrders } from "./order";
import { registerUser, registerTenantWithTrial } from "./registration";
export * from "./email-verification";
import {
  getTenantDb,
  createTenantDatabase,
  clearTenantCache,
  getCachedTenants
} from "./tenant-db";
import { getMainDb } from "./tenant-db-manager";
import {
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
} from "./main-db";
import {
  sanitizeSubdomain,
  validateSubdomain,
  generateSubdomain,
  getRootDomain,
  getProtocol,
  buildTenantUrl,
  extractSubdomain,
  isReservedSubdomain,
  getReservedSubdomains
} from "./subdomain-utils";
export {
  AuditLogger,
  buildTenantUrl,
  checkDatabaseConnection,
  clearTenantCache,
  createOrderNumberWithFormat,
  createSubscriptionPayment,
  createTenant,
  createTenantDatabase,
  db,
  extractAuditContext,
  extractSubdomain,
  generateOrderNumber,
  generateSubdomain,
  getAuditLogger,
  getCachedTenants,
  getDefaultOutlet,
  getDefaultPlan,
  getExpiredSubscriptions,
  getMainDb,
  getMainDbClient,
  getOutletOrderStats,
  getPlanById,
  getProtocol,
  getReservedSubdomains,
  getRootDomain,
  getSubscriptionById,
  getTenantById,
  getTenantBySubdomain,
  getTenantDb,
  isReservedSubdomain,
  listActivePlans,
  listAllTenants,
  prisma,
  registerTenantWithTrial,
  registerUser,
  sanitizeSubdomain,
  searchOrders,
  simplifiedPayments2 as simplifiedPayments,
  simplifiedSubscriptionActivities2 as simplifiedSubscriptionActivities,
  subdomainExists,
  tenantEmailExists,
  updateSubscription,
  updateTenant,
  validateSubdomain
};
//# sourceMappingURL=index.mjs.map