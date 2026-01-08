// ============================================================================
// CORE UTILITIES EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================

// Basic utilities
export * from './string-utils';
export * from './function-utils';
export * from './tenant-key';

// Export common utilities without conflicts
export { 
  authenticatedFetch, 
  publicFetch, 
  parseApiResponse,
  createApiUrl,
  getCurrentUser,
  getAuthToken,
  storeAuthData,
  updateAuthToken,
  clearAuthData,
  getStoredUser,
  getToastType,
  withErrorHandlingForUI,
  handleApiErrorForUI,
  isAuthenticated,
  handleApiResponse
} from './common';

// Export mobile detection utilities
export {
  isMobileDevice,
  isIOS,
  isAndroid,
  getMobileDeepLink,
  getIOSUniversalLink,
  getAndroidAppLink,
  tryOpenMobileApp
} from './mobile-detection';

// Export unified ApiResponse type from errors.ts (re-exported from response-builder)
export type { 
  ApiResponse
} from './errors';

// Export ErrorCode enum as value (not type, since it's an enum)
export { ErrorCode } from './errors';

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
  parseProductDurationLimits,
  getEffectiveDurationLimits,
  calculateDurationInUnit,
  getDurationUnitLabel,
  type PricingInfo,
  type CalculatedPricing,
  // Note: ValidationResult is exported explicitly from index.ts to avoid conflicts
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

// UI utilities - MOVED to client.ts (React components should not be in server-side exports)
// These are now exported from '@rentalshop/utils/client' for client-side use only
// export * from './badge-utils';
// export * from './customer-utils';
// export * from './product-utils';
// export * from './user-utils';

// Export pure utility functions from badge-utils (safe for server-side use)
export { formatRoleDisplayName } from './badge-utils';

// Validation (plan limits validation now consolidated in validation.ts)
export * from './validation';

// Export assertPlanLimit and checkPlanLimitIfNeeded specifically for API routes
export { assertPlanLimit, checkPlanLimitIfNeeded } from './validation';

// Payment utilities
export * from './currency';
export * from './payment-gateways';

// Order utilities
export * from './order-number-manager';

// Date utilities
export * from './date';
export * from './date-range';

// Excel utilities
export * from './excel';

// CSV parser utilities
export * from './csvParser';

// Bank QR code utilities (Vietnam bank transfer)
export * from './bank-qr';

// ID utilities - removed (using single id system)

// Audit utilities
export * from './audit-config';
export * from './audit-helper';

// Request logging utilities
export * from './request-logger';