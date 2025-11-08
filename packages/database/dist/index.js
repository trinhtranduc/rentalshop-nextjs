"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  AuditLogger: () => import_audit.AuditLogger,
  buildTenantUrl: () => import_subdomain_utils.buildTenantUrl,
  checkDatabaseConnection: () => checkDatabaseConnection,
  clearTenantCache: () => import_tenant_db.clearTenantCache,
  createOrderNumberWithFormat: () => import_order_number_generator2.createOrderNumberWithFormat,
  createSubscriptionPayment: () => import_subscription2.createSubscriptionPayment,
  createTenant: () => import_main_db.createTenant,
  createTenantDatabase: () => import_tenant_db.createTenantDatabase,
  db: () => db,
  extractAuditContext: () => import_audit.extractAuditContext,
  extractSubdomain: () => import_subdomain_utils.extractSubdomain,
  generateOrderNumber: () => generateOrderNumber,
  generateSubdomain: () => import_subdomain_utils.generateSubdomain,
  getAuditLogger: () => import_audit.getAuditLogger,
  getCachedTenants: () => import_tenant_db.getCachedTenants,
  getDefaultOutlet: () => import_outlet2.getDefaultOutlet,
  getDefaultPlan: () => import_main_db.getDefaultPlan,
  getExpiredSubscriptions: () => import_subscription2.getExpiredSubscriptions,
  getMainDb: () => import_tenant_db_manager.getMainDb,
  getMainDbClient: () => import_main_db.getMainDbClient,
  getOutletOrderStats: () => import_order_number_generator2.getOutletOrderStats,
  getPlanById: () => import_main_db.getPlanById,
  getProtocol: () => import_subdomain_utils.getProtocol,
  getReservedSubdomains: () => import_subdomain_utils.getReservedSubdomains,
  getRootDomain: () => import_subdomain_utils.getRootDomain,
  getSubscriptionById: () => import_subscription2.getSubscriptionById,
  getTenantById: () => import_main_db.getTenantById,
  getTenantBySubdomain: () => import_main_db.getTenantBySubdomain,
  getTenantDb: () => import_tenant_db.getTenantDb,
  isReservedSubdomain: () => import_subdomain_utils.isReservedSubdomain,
  listActivePlans: () => import_main_db.listActivePlans,
  listAllTenants: () => import_main_db.listAllTenants,
  prisma: () => import_client.prisma,
  registerTenantWithTrial: () => import_registration.registerTenantWithTrial,
  registerUser: () => import_registration.registerUser,
  sanitizeSubdomain: () => import_subdomain_utils.sanitizeSubdomain,
  searchOrders: () => import_order2.searchOrders,
  simplifiedPayments: () => import_payment2.simplifiedPayments,
  simplifiedSubscriptionActivities: () => import_subscription_activity2.simplifiedSubscriptionActivities,
  subdomainExists: () => import_main_db.subdomainExists,
  tenantEmailExists: () => import_main_db.tenantEmailExists,
  updateSubscription: () => import_subscription2.updateSubscription,
  updateTenant: () => import_main_db.updateTenant,
  validateSubdomain: () => import_subdomain_utils.validateSubdomain
});
module.exports = __toCommonJS(index_exports);
var import_client = require("./client");
var import_user = require("./user");
var import_customer = require("./customer");
var import_product = require("./product");
var import_order = require("./order");
var import_payment = require("./payment");
var import_outlet = require("./outlet");
var import_plan = require("./plan");
var import_subscription = require("./subscription");
var import_subscription_activity = require("./subscription-activity");
var import_order_number_generator = require("./order-number-generator");
var import_category = require("./category");
var import_audit_logs = require("./audit-logs");
var import_order_items = require("./order-items");
var import_sessions = require("./sessions");
var import_payment2 = require("./payment");
var import_subscription_activity2 = require("./subscription-activity");
var import_subscription2 = require("./subscription");
var import_audit = require("./audit");
var import_order_number_generator2 = require("./order-number-generator");
var import_outlet2 = require("./outlet");
var import_order2 = require("./order");
var import_registration = require("./registration");
__reExport(index_exports, require("./email-verification"), module.exports);
var import_tenant_db = require("./tenant-db");
var import_tenant_db_manager = require("./tenant-db-manager");
var import_main_db = require("./main-db");
var import_subdomain_utils = require("./subdomain-utils");
const db = {
  // ============================================================================
  // PRISMA CLIENT (for transactions)
  // ============================================================================
  prisma: import_client.prisma,
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  users: import_user.simplifiedUsers,
  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================
  customers: import_customer.simplifiedCustomers,
  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================
  products: import_product.simplifiedProducts,
  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================
  orders: import_order.simplifiedOrders,
  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================
  payments: import_payment.simplifiedPayments,
  // ============================================================================
  // OUTLET OPERATIONS
  // ============================================================================
  outlets: import_outlet.simplifiedOutlets,
  // ============================================================================
  // MERCHANT OPERATIONS
  // ============================================================================
  // merchants: simplifiedMerchants, // TEMPORARY: Disabled for multi-tenant migration
  // ============================================================================
  // PLAN OPERATIONS
  // ============================================================================
  plans: import_plan.simplifiedPlans,
  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  categories: import_category.simplifiedCategories,
  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================
  auditLogs: import_audit_logs.simplifiedAuditLogs,
  // ============================================================================
  // ORDER ITEM OPERATIONS
  // ============================================================================
  orderItems: import_order_items.simplifiedOrderItems,
  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================
  subscriptions: import_subscription.simplifiedSubscriptions,
  // ============================================================================
  // ORDER NUMBER OPERATIONS
  // ============================================================================
  orderNumbers: import_order_number_generator.simplifiedOrderNumbers,
  // ============================================================================
  // OUTLET STOCK OPERATIONS
  // ============================================================================
  outletStock: {
    /**
     * Aggregate outlet stock statistics
     */
    aggregate: async (options) => {
      return await import_client.prisma.outletStock.aggregate(options);
    }
  },
  // ============================================================================
  // SUBSCRIPTION ACTIVITY OPERATIONS
  // ============================================================================
  subscriptionActivities: import_subscription_activity.simplifiedSubscriptionActivities,
  // ============================================================================
  // SESSION OPERATIONS (Single Session Enforcement)
  // ============================================================================
  sessions: import_sessions.sessions
};
const checkDatabaseConnection = async () => {
  try {
    await import_client.prisma.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (error) {
    return { status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" };
  }
};
const generateOrderNumber = async (outletId) => {
  const outlet = await import_client.prisma.outlet.findUnique({
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
    const existingOrder = await import_client.prisma.order.findUnique({
      where: { orderNumber }
    });
    if (!existingOrder) {
      return orderNumber;
    }
  }
  throw new Error("Failed to generate unique order number after maximum retries");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  simplifiedPayments,
  simplifiedSubscriptionActivities,
  subdomainExists,
  tenantEmailExists,
  updateSubscription,
  updateTenant,
  validateSubdomain,
  ...require("./email-verification")
});
//# sourceMappingURL=index.js.map