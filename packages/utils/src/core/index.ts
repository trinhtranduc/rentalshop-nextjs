// ============================================================================
// CORE UTILITIES EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================

// Basic utilities
export * from './string-utils';
export * from './function-utils';
// Note: tenant-utils.ts is NOT exported here - it's server-side only (imports PostgreSQL)
// API routes should import getTenantDbFromRequest directly from @rentalshop/database or @rentalshop/utils/api

// Export common utilities without conflicts
export { 
  authenticatedFetch, 
  publicFetch, 
  parseApiResponse,
  createApiUrl,
  getCurrentUser,
  getAuthToken,
  storeAuthData,
  clearAuthData,
  getStoredUser,
  getToastType,
  withErrorHandlingForUI,
  handleApiErrorForUI,
  isAuthenticated,
  handleApiResponse
} from './common';

// Export unified ApiResponse type from errors.ts (re-exported from response-builder)
export type { 
  ApiResponse,
  ErrorCode
} from './errors';

// Export types from common.ts
export type { StoredUser } from './common';

// Export type guards for type-safe response handling
export { 
  isSuccessResponse, 
  isErrorResponse 
} from './errors';

// Export error analysis and handling (now consolidated in errors.ts)
export { 
  analyzeError,
  isAuthError,
  isPermissionError,
  isNetworkError,
  isValidationError,
  type ErrorInfo,
  type ErrorType,
  handleApiError,
  getErrorTranslationKey,
  isValidErrorCode,
  ERROR_MESSAGES,
  ERROR_STATUS_CODES,
  // Error classes
  ApiError,
  ValidationError,
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  PlanLimitError,
  // Error handlers
  handlePrismaError,
  handleValidationError,
  handleBusinessError
} from './errors';

// Pricing resolver and validation (now consolidated in pricing-calculator.ts)
export {
  PricingResolver,
  PricingValidator,
  type PricingInfo,
  type CalculatedPricing,
  type ValidationResult,
  type RentalPeriodValidation
} from './pricing-calculator';

// Main subscription manager (consolidates all subscription functionality)
// Note: subscription-manager.ts imports @rentalshop/database (PostgreSQL) - server-only
// Exported from '@rentalshop/utils/api' instead of root exports
// export * from './subscription-manager'; // MOVED TO api/index.ts

// Subscription renewal functionality (now consolidated in subscription-manager.ts)
// Note: Moved to server-only exports (api/index.ts)
// export type {
//   SubscriptionRenewalConfig,
//   SubscriptionRenewalResult,
//   RenewalStats
// } from './subscription-manager'; // MOVED TO api/index.ts

// Individual utilities (only export unique functions to avoid conflicts)
export {
  calculateProration,
  formatProration,
  shouldApplyProration,
  type ProrationCalculation
} from './proration';

// Additional pricing utility functions for UI components
export {
  formatBillingCycle,
  getBillingCycleDiscount,
  calculateRenewalPrice,
  calculateSavings,
  getDiscountPercentage,
  calculateDiscountedPrice
} from './pricing-calculator';

export {
  calculateSubscriptionPrice,
  getPricingBreakdown,
  getAllPricingOptions,
  getPricingComparison,
  calculateProratedAmount,
  pricingCalculator,
  type PricingBreakdown,
  type PricingConfig
} from './pricing-calculator';

// UI utilities
export * from './badge-utils';
export * from './customer-utils';
export * from './product-utils';
export * from './user-utils';

// Validation (plan limits validation now consolidated in validation.ts)
// Note: validation.ts imports @rentalshop/database (PostgreSQL) - server-only
// Exported from '@rentalshop/utils/api' instead of root exports
// export * from './validation'; // MOVED TO api/index.ts
// export { assertPlanLimit } from './validation'; // MOVED TO api/index.ts

// Payment utilities
export * from './currency';
export * from './payment-gateways';

// Order utilities
export * from './order-number-manager';

// Date utilities
export * from './date';

// ID utilities - removed (using single id system)

// Audit utilities
export * from './audit-config';
export * from './audit-helper';