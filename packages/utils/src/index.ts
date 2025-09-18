// ============================================================================
// UTILS PACKAGE EXPORTS
// ============================================================================

// API utilities
export * from './api';

// Common utilities
export * from './common';

// Function utilities
export * from './function-utils';

// Configuration
export * from './config';

// Validation schemas
export * from './validation';

// Error handling
export * from './errors';
export * from './error-handling';

// Business logic utilities
export { 
  SubscriptionManager,
  // Backward compatibility exports
  checkSubscriptionStatus,
  shouldThrowSubscriptionError,
  getSubscriptionError,
  validateSubscriptionAccess,
  canPerformOperation,
  getSubscriptionErrorMessage,
  getAllowedOperations,
  calculateSubscriptionPeriod,
  formatSubscriptionPeriod,
  getSubscriptionStatusBadge,
  calculateNewBillingDate,
  isSubscriptionExpired,
  isGracePeriodExceeded,
  validateForRenewal,
  getSubscriptionStatusPriority,
  sortSubscriptionsByStatus,
  subscriptionNeedsAttention,
  // Types
  type SubscriptionPeriod,
  type SubscriptionValidationResult,
  type SubscriptionValidationOptions,
  type RenewalConfig,
  type RenewalResult
} from './business/subscription-manager';

// Public ID utilities (only unique functions)
export { 
  getNextPublicId,
  parsePublicId,
  getEntityTypeFromPublicId,
  validatePublicId,
  formatPublicId,
  getPublicIdInfo,
  getAllEntityTypes,
  getEntityConfig,
  type EntityType
} from './publicId';

// Audit helper utilities
export * from './audit-helper';
export * from './audit-config';

// Badge utilities (centralized)
export * from './badge-utils';

// Proration utilities (only unique functions)
export {
  calculateProration,
  formatProration,
  shouldApplyProration,
  type ProrationCalculation
} from './proration';

// Pricing calculator utilities
export * from './pricing-calculator';

// ============================================================================
// INDIVIDUAL UTILITIES (FALLBACK)
// ============================================================================

// Individual utilities (only export what's not in consolidated)
export { 
  // String utilities (only unique functions)
  generateSlug,
  capitalizeWords,
  normalizeWhitespace,
  generateRandomString,
  isEmpty,
  getInitials
} from './string-utils';

export {
  // Currency utilities (only unique functions)
  formatCurrency,
  formatCurrencyAdvanced,
  parseCurrency,
  getCurrencyDisplay,
  isValidCurrencyCode,
  getExchangeRate,
  convertCurrency,
  getCurrency,
  getCurrentCurrency,
  DEFAULT_CURRENCY_SETTINGS
} from './currency';

export {
  // Date utilities (only unique functions)
  addDaysToDate,
  getDaysDifference,
  isDateAfter,
  isDateBefore,
  getCurrentDate,
  getTomorrow
} from './date';

export {
  // User utilities (only unique functions)
  getUserFullName,
  canCreateUsers
} from './user-utils';

export {
  // Customer utilities (only unique functions)
  getCustomerFullName,
  getCustomerAddress,
  getCustomerContactInfo,
  formatCustomerForDisplay,
  validateCustomer,
  getCustomerAge
} from './customer-utils';

export {
  // Product utilities (only unique functions)
  formatProductPrice,
  getProductImageUrl,
  calculateStockPercentage,
  getProductStockStatus,
  canRentProduct,
  canSellProduct,
  getProductDisplayName,
  getProductCategoryName,
  getProductOutletName,
  sortProducts
} from './product-utils';