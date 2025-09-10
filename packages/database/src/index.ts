// ============================================================================
// DATABASE PACKAGE EXPORTS - DUAL ID SYSTEM
// ============================================================================

// Database client
export { prisma } from './client';

// Dual ID utility functions (RECOMMENDED)
export {
  // Entity lookup functions
  findOutletByPublicId,
  findCustomerByPublicId,
  findProductByPublicId,
  findUserByPublicId,
  findMerchantByPublicId,
  findCategoryByPublicId,
  findOrderByPublicId,
  
  // Public ID generation functions
  generateNextUserPublicId,
  generateNextMerchantPublicId,
  generateNextOutletPublicId,
  generateNextProductPublicId,
  generateNextCustomerPublicId,
  generateNextCategoryPublicId,
  generateNextOrderPublicId,
  
  // Utility functions
  checkDatabaseConnection,
  
  // ID conversion functions
  convertOutletPublicIdToDatabaseId,
  convertCustomerPublicIdToDatabaseId,
  convertProductPublicIdToDatabaseId,
  convertUserPublicIdToDatabaseId,
  convertMerchantPublicIdToDatabaseId,
  convertCategoryPublicIdToDatabaseId,
  convertOrderPublicIdToDatabaseId,
} from './utils';

// Dual ID order functions (RECOMMENDED)
export {
  getOrderByPublicId,
  getOrderByNumber,
  createOrder,
  updateOrder,
  searchOrders,
  getOrderStats,
  cancelOrder,
  getOverdueRentals,
} from './order';

// Order number generation system
export {
  generateOrderNumber,
  validateOrderNumber,
  parseOrderNumber,
  getOutletOrderStats,
  createOrderNumber,
  createOrderNumberWithFormat,
  generateTestOrderNumbers,
  analyzeOrderNumber,
  ORDER_NUMBER_CONFIG,
  FORMAT_CONFIGS,
  getOrderNumberConfig,
  updateOrderNumberConfig,
  getFormatInfo,
  getAllFormats,
  validateOrderNumberConfig,
  getRecommendedFormat,
  type OrderNumberFormat,
  type OrderNumberConfig,
  type OrderNumberResult,
} from './order-number-generator';

// Dual ID customer functions (RECOMMENDED)
export {
  getCustomerByPublicId,
  getCustomerByEmail,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  searchCustomers,
  getCustomersByMerchant,
  customerExistsByEmail,
  customerExistsByPhone,
} from './customer';

// Dual ID product functions (RECOMMENDED)
export {
  getProductByPublicId,
  getProductByBarcode,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByMerchant,
  getProductsByCategory,
  updateProductStock,
} from './product';

// Dual ID outlet functions (RECOMMENDED)
export {
  getOutletByPublicId,
  searchOutlets,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletsByMerchant,
} from './outlet';

// Dual ID user functions (RECOMMENDED)
export {
  findUserById,
  getUserByPublicId,
  createUser,
  updateUser,
  getUsersByMerchant,
  getUsersByOutlet,
  softDeleteUser,
  restoreUser,
} from './user';

// Dual ID merchant functions (RECOMMENDED)
export {
  updateMerchant,
} from './merchant';

// Dual ID plan functions (RECOMMENDED)
export {
  getPlanByPublicId,
  searchPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getActivePlans,
  getPlanStats,
} from './plan';

// Plan variant functions removed - Using modern subscription system with dynamic pricing

// Modern subscription functions (Following Stripe/Shopify patterns)
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
  getPlanById,
  calculatePlanPricing,
} from './subscription';

// Merchant registration with trial enrollment
export {
  registerMerchantWithTrial,
  getTrialPlan,
  isMerchantOnTrial,
  getMerchantTrialStatus,
  type MerchantRegistrationInput,
  type MerchantRegistrationResult,
} from './merchant-registration';

// Smart registration system for all user roles
export {
  registerUser,
  type RegistrationInput,
  type RegistrationResult,
} from './registration';

// Audit logging system
export {
  AuditLogger,
  getAuditLogger,
  extractAuditContext,
  type AuditContext,
  type AuditLogData,
  type AuditLogFilter,
} from './audit';

// ============================================================================
// LEGACY FUNCTIONS - DEPRECATED
// ============================================================================
// These are kept for backward compatibility but should not be used in new code
// Use the new dual ID functions above instead

// export * from './utils';
// export * from './order';
// export * from './customer';
// export * from './product'; 