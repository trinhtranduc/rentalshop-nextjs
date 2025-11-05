// ============================================================================
// SERVER-SAFE CORE EXPORTS (No React imports)
// ============================================================================
// This file exports only server-safe utilities that don't import React
// Use this for server-side code (API routes, middleware, etc.)

// Basic utilities (no React)
export * from './string-utils';
export * from './function-utils';

// Common utilities (no React)
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
export type { StoredUser } from './common';

// Error handling (no React)
export type { 
  ApiResponse,
  ErrorCode
} from './errors';
export { 
  isSuccessResponse, 
  isErrorResponse 
} from './errors';
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
  ApiError,
  ValidationError,
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  PlanLimitError,
  handlePrismaError,
  handleValidationError,
  handleBusinessError
} from './errors';

// Pricing utilities (no React)
export {
  PricingResolver,
  PricingValidator,
  type PricingInfo,
  type CalculatedPricing,
  type ValidationResult,
  type RentalPeriodValidation
} from './pricing-calculator';
export {
  calculateProration,
  formatProration,
  shouldApplyProration,
  type ProrationCalculation
} from './proration';
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

// Payment utilities (no React)
export * from './currency';
export * from './payment-gateways';

// Order utilities (no React)
export * from './order-number-manager';

// Date utilities (no React)
export * from './date';

// Audit utilities (no React)
export * from './audit-config';
export * from './audit-helper';

// NOTE: UI utilities (badge-utils, customer-utils, product-utils, user-utils)
// are NOT exported here because they contain React components
// Import from '@rentalshop/utils' for client-side usage only

