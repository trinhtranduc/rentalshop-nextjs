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

// Export unified ApiResponse type from errors.ts (re-exported from response-builder)
export type { 
  ApiResponse,
  ErrorCode,
  ErrorResponse
} from './errors';

// Export types from common.ts
export type { StoredUser } from './common';

// Export type guards and helpers for type-safe response handling
export { 
  isSuccessResponse, 
  isErrorResponse,
  hasErrorCode,
  parseErrorResponse,
  getErrorCode,
  getErrorMessage
} from './errors';

// Tenant helpers (multi-tenant support)
export { getTenantKeyFromHost, getTenantKeyFromRequest } from './tenant';

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