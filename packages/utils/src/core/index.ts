// ============================================================================
// CORE UTILITIES EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================

// Basic utilities
export * from './string-utils';
export * from './function-utils';

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

// Export unified ApiResponse types from errors.ts
export type { 
  ApiResponse, 
  ApiErrorResponse, 
  ApiSuccessResponse,
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
  type ErrorType
} from './errors';

// Unified error handling (consolidated from api-errors.ts)
export * from './errors';

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
export * from './subscription-manager';

// Subscription renewal functionality (now consolidated in subscription-manager.ts)
export type {
  SubscriptionRenewalConfig,
  SubscriptionRenewalResult,
  RenewalStats
} from './subscription-manager';

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
export * from './validation';

// Export assertPlanLimit specifically for API routes
export { assertPlanLimit } from './validation';

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