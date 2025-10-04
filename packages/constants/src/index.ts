/**
 * Centralized Constants for Rental Shop Monorepo
 * 
 * This package provides all constants used across the application
 * to ensure consistency and maintainability.
 */

// Import all constant modules
import { PAGINATION } from './pagination';
import { SEARCH } from './search';
import { VALIDATION } from './validation';
import { UI } from './ui';
import { BUSINESS } from './business';
import { ENVIRONMENT } from './environment';
import { API } from './api';
import * as ORDERS from './orders';
import * as BILLING_CYCLES from './billing-cycles';
import * as STATUS from './status';

// Export all constant modules
export * from './pagination';
export * from './search';
export * from './validation';
export * from './ui';
export * from './business';
export * from './environment';
export * from './api';
export * from './orders';
export * from './status';
export * from './subscription';

// Explicit exports for status constants
export { 
  SUBSCRIPTION_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
  ORDER_TYPE,
  USER_ROLE,
  ENTITY_STATUS,
  PRODUCT_AVAILABILITY_STATUS,
  BILLING_INTERVAL,
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE
} from './status';

// Export status types
export type {
  SubscriptionStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  OrderType,
  UserRole,
  EntityStatus,
  ProductAvailabilityStatus,
  BillingInterval,
  AuditAction,
  AuditEntityType
} from './status';

// Explicit exports for critical constants
export { 
  ORDER_STATUS_COLORS,
  ORDER_TYPE_COLORS,
  ORDER_STATUSES,
  ORDER_TYPES,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS
} from './orders';


// Explicit API export to fix import issues
export { API } from './api';

// Convenience exports for easy access
export const CONSTANTS = {
  PAGINATION,
  SEARCH,
  VALIDATION,
  UI,
  BUSINESS,
  ENVIRONMENT,
  API,
  ORDERS,
  STATUS,
} as const;

// Re-export the main constants object
export { CONSTANTS as default };

// Re-export status functions directly
export { 
  getStatusColor,
  getStatusLabel,
  getStatusOptions,
  isSubscriptionActive,
  isOrderCompleted,
  isPaymentSuccessful,
  isPaymentPending,
  isPaymentFailed,
  isEntityActive
} from './status';
