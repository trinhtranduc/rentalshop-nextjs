// ============================================================================
// CORE UTILITIES EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================

// Basic utilities
export * from './common';
export * from './string-utils';
export * from './function-utils';
export * from './error-handling';
export * from './errors';

// Main subscription manager (consolidates all subscription functionality)
export * from './subscription-manager';

// Subscription renewal functionality
export * from './subscription-renewal';

// Individual utilities (only export unique functions to avoid conflicts)
export {
  calculateProration,
  formatProration,
  shouldApplyProration,
  type ProrationCalculation
} from './proration';

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

// Validation
export * from './validation';
export * from './plan-limits-validation';

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