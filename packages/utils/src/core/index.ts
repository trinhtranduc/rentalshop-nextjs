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
// MOVED to server.ts - imports @rentalshop/database (server-only)
// Use: import { ... } from '@rentalshop/utils/server'
// export * from './subscription-manager';

// Subscription renewal functionality (now consolidated in subscription-manager.ts)
// MOVED to server.ts - imports @rentalshop/database (server-only)
// export type {
//   SubscriptionRenewalConfig,
//   SubscriptionRenewalResult,
//   RenewalStats
// } from './subscription-manager';

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

// Validation schemas (client-safe) - exported from separate file to avoid bundling server-only code
// Server-only validation functions (with NextResponse, prisma) are exported from server.ts
export * from './validation-schemas';

// Server-only validation functions are exported from server.ts
// Use: import { assertPlanLimit, checkPlanLimitIfNeeded } from '@rentalshop/utils/server'

// Payment utilities
export * from './currency';
export * from './payment-gateways';
export * from './billing-interval';
export * from './subscription-billing-calculations';

// Order utilities
// MOVED to server.ts - imports @rentalshop/database (server-only)
// Use: import { ... } from '@rentalshop/utils/server'
// export * from './order-number-manager';

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
// MOVED to server.ts - imports @rentalshop/database (server-only)
// Use: import { ... } from '@rentalshop/utils/server'
// export * from './audit-helper';

// Request logging utilities
// MOVED to server.ts - imports @rentalshop/database (server-only)
// Use: import { ... } from '@rentalshop/utils/server'
// export * from './request-logger';

// File logger utilities (Pino) - SERVER ONLY
// Note: Logger uses Node.js modules (fs, worker_threads) and should only be imported server-side
// Use conditional import: if (typeof window === 'undefined') { import('@rentalshop/utils/server').then(...) }
// Or import directly in API routes: import { logError } from '@rentalshop/utils/server'
// DO NOT export from here to avoid client-side bundling issues

// Revenue calculator utilities (single source of truth for revenue calculations)
export * from './revenue-calculator';