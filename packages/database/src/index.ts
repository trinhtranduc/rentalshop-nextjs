// ============================================================================
// DATABASE PACKAGE EXPORTS - SIMPLIFIED
// ============================================================================

// Database client
export { prisma } from './client';

// NEW: Simplified Database API (Recommended)
export { db, checkDatabaseConnection, generateOrderNumber } from './db-new';

// Legacy utilities (deprecated - use db API instead)
// export { checkDatabaseConnection } from './utils';

// Order functions
export {
  getOrderById,
  getOrderByNumber,
  getOrdersByOutlet,
  getOrdersByCustomer,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderCount,
  type OrderWithRelations,
} from './order';

// Additional order functions
export {
  searchOrders,
} from './order-single-id';

// Order number generator functions
export {
  getOutletOrderStats,
  createOrderNumberWithFormat,
  type OrderNumberFormat,
} from './order-number-generator';

// Note: generateOrderNumber is now exported from db-new.ts above

// Customer functions
export {
  getCustomerByPublicId as getCustomerById,
  getCustomerByEmail,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  searchCustomers,
  getCustomersByMerchant,
  customerExistsByEmail,
  customerExistsByPhone,
} from './customer';

// Product functions
export {
  getProductById,
  getProductByBarcode,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByMerchant,
  getProductsByCategory,
  updateProductStock,
} from './product';

// Outlet functions
export {
  getOutletByPublicId as getOutletById,
  searchOutlets,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletsByMerchant,
} from './outlet';

// User functions
export {
  findUserById,
  getUserById,
  createUser,
  updateUser,
  getUsersByMerchant,
  getUsersByOutlet,
  softDeleteUser,
  restoreUser,
} from './user';

// Merchant functions
export {
  updateMerchant,
} from './merchant';

// Plan functions
export {
  getPlanById,
  searchPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getActivePlans,
  getPlanStats,
} from './plan';



// Subscription functions
export {
  getSubscriptionByMerchantId,
  getAllSubscriptions,
  searchSubscriptions,
  createSubscription,
  changePlan,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getAllPlans,
  calculatePlanPricing,
  getExpiredSubscriptions,
  getSubscriptionById,
  updateSubscription,
  createSubscriptionPayment,
  type SubscriptionPaymentCreateInput,
  type SubscriptionPayment,
} from './subscription';

// Registration functions
export {
  registerMerchantWithTrial,
  getTrialPlan,
  isMerchantOnTrial,
  getMerchantTrialStatus,
  type MerchantRegistrationInput,
  type MerchantRegistrationResult,
} from './merchant-registration';

export {
  registerUser,
  type RegistrationInput,
  type RegistrationResult,
} from './registration';

// Audit functions
export {
  AuditLogger,
  getAuditLogger,
  extractAuditContext,
  type AuditContext,
  type AuditLogData,
  type AuditLogFilter,
} from './audit';

// Plan variant and subscription placeholder functions
export {
  getPlanVariantByPublicId,
  updatePlanVariant,
  permanentlyDeletePlanVariant,
  deletePlanVariant,
  getDeletedPlanVariants,
  restorePlanVariant,
  searchPlanVariants,
  createPlanVariant,
  getPlanByPublicId,
  getActivePlanVariants,
  getPlanVariantStats,
  markSubscriptionAsExpired,
  extendSubscription,
} from './plan-variant-placeholders'; 