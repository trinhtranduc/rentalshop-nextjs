// ============================================================================
// CENTRALIZED STATUS CONSTANTS
// ============================================================================
// This file centralizes all status definitions used across the rental shop system.
// All status-related constants should be defined here and imported where needed.

// ============================================================================
// SUBSCRIPTION STATUSES
// ============================================================================
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED'
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// ============================================================================
// ORDER STATUSES
// ============================================================================
export const ORDER_STATUS = {
  // RENT order statuses
  RESERVED: 'RESERVED',   // New order, scheduled for pickup
  PICKUPED: 'PICKUPED',   // Currently being rented
  RETURNED: 'RETURNED',   // Rental completed
  
  // SALE order statuses
  COMPLETED: 'COMPLETED', // Sale finalized
  
  // Common statuses
  CANCELLED: 'CANCELLED'  // Order cancelled (applies to both types)
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// ============================================================================
// PAYMENT STATUSES
// ============================================================================
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',     // Payment initiated but not confirmed
  COMPLETED: 'COMPLETED', // Payment fully processed and confirmed
  FAILED: 'FAILED',       // Payment processing failed
  REFUNDED: 'REFUNDED',   // Payment was refunded
  CANCELLED: 'CANCELLED'  // Payment was cancelled before processing
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// ============================================================================
// PAYMENT METHODS
// ============================================================================
export const PAYMENT_METHOD = {
  STRIPE: 'STRIPE',
  TRANSFER: 'TRANSFER',
  MANUAL: 'MANUAL',
  CASH: 'CASH',
  CHECK: 'CHECK',
  PAYPAL: 'PAYPAL'
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

// ============================================================================
// PAYMENT TYPES
// ============================================================================
export const PAYMENT_TYPE = {
  ORDER_PAYMENT: 'ORDER_PAYMENT',
  SUBSCRIPTION_PAYMENT: 'SUBSCRIPTION_PAYMENT',
  PLAN_CHANGE: 'PLAN_CHANGE',
  PLAN_EXTENSION: 'PLAN_EXTENSION'
} as const;

export type PaymentType = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];

// ============================================================================
// ORDER TYPES
// ============================================================================
export const ORDER_TYPE = {
  RENT: 'RENT',
  SALE: 'SALE'
} as const;

export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];

// ============================================================================
// USER ROLES
// ============================================================================
export const USER_ROLE = {
  ADMIN: 'ADMIN',                    // System Administrator
  MERCHANT: 'MERCHANT',              // Business Owner
  OUTLET_ADMIN: 'OUTLET_ADMIN',      // Outlet Manager
  OUTLET_STAFF: 'OUTLET_STAFF'       // Outlet Employee
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// ============================================================================
// ENTITY STATUSES (Active/Inactive)
// ============================================================================
export const ENTITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type EntityStatus = typeof ENTITY_STATUS[keyof typeof ENTITY_STATUS];

// ============================================================================
// MERCHANT STATUSES
// ============================================================================
export const MERCHANT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED'
} as const;

export type MerchantStatus = typeof MERCHANT_STATUS[keyof typeof MERCHANT_STATUS];

// ============================================================================
// PRODUCT AVAILABILITY STATUSES
// ============================================================================
export const PRODUCT_AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out-of-stock',
  UNAVAILABLE: 'unavailable',
  DATE_CONFLICT: 'date-conflict'
} as const;

export type ProductAvailabilityStatus = typeof PRODUCT_AVAILABILITY_STATUS[keyof typeof PRODUCT_AVAILABILITY_STATUS];

// ============================================================================
// BILLING INTERVALS
// ============================================================================
export const BILLING_INTERVAL = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SIX_MONTHS: 'sixMonths',
  YEARLY: 'yearly'
} as const;

export type BillingInterval = typeof BILLING_INTERVAL[keyof typeof BILLING_INTERVAL];

// ============================================================================
// AUDIT LOG ACTIONS
// ============================================================================
export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  CANCEL: 'CANCEL',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT'
} as const;

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

// ============================================================================
// AUDIT LOG ENTITY TYPES
// ============================================================================
export const AUDIT_ENTITY_TYPE = {
  USER: 'USER',
  MERCHANT: 'MERCHANT',
  OUTLET: 'OUTLET',
  CUSTOMER: 'CUSTOMER',
  PRODUCT: 'PRODUCT',
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  SUBSCRIPTION: 'SUBSCRIPTION',
  PLAN: 'PLAN',
  CATEGORY: 'CATEGORY'
} as const;

export type AuditEntityType = typeof AUDIT_ENTITY_TYPE[keyof typeof AUDIT_ENTITY_TYPE];

// ============================================================================
// STATUS VALIDATION HELPERS
// ============================================================================

/**
 * Check if a subscription status is active (trial or active)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === SUBSCRIPTION_STATUS.TRIAL || status === SUBSCRIPTION_STATUS.ACTIVE;
}

/**
 * Type guard to validate if a string is a valid SubscriptionStatus
 * Useful for runtime validation when receiving data from API
 */
export function isValidSubscriptionStatus(value: string): value is SubscriptionStatus {
  const validStatuses = Object.values(SUBSCRIPTION_STATUS);
  return validStatuses.includes(value.toUpperCase() as SubscriptionStatus);
}

/**
 * Normalize a string to SubscriptionStatus enum value
 * Returns the enum value if valid, or null if invalid
 */
export function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return isValidSubscriptionStatus(normalized) ? normalized : null;
}

/**
 * Check if an order status is completed (returned for rent, completed for sale)
 */
export function isOrderCompleted(status: OrderStatus, orderType: OrderType): boolean {
  if (orderType === ORDER_TYPE.RENT) {
    return status === ORDER_STATUS.RETURNED;
  }
  return status === ORDER_STATUS.COMPLETED;
}

/**
 * Check if a payment status is successful
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === PAYMENT_STATUS.COMPLETED;
}

/**
 * Check if a payment status is pending
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return status === PAYMENT_STATUS.PENDING;
}

/**
 * Check if a payment status is failed
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return status === PAYMENT_STATUS.FAILED;
}

/**
 * Check if an entity is active
 */
export function isEntityActive(status: EntityStatus): boolean {
  return status === ENTITY_STATUS.ACTIVE;
}

// ============================================================================
// STATUS DISPLAY HELPERS
// ============================================================================

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string, type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability'): string {
  switch (type) {
    case 'subscription':
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    case 'order':
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case 'payment':
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case 'entity':
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case 'availability':
      return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    default:
      return status;
  }
}

/**
 * Get status color class for UI components - Ocean Blue Theme
 */
export function getStatusColor(status: string, type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability'): string {
  switch (type) {
    case 'subscription':
      switch (status) {
        case SUBSCRIPTION_STATUS.TRIAL:
          return 'text-green-700 bg-green-100';
        case SUBSCRIPTION_STATUS.ACTIVE:
          return 'text-emerald-800 bg-emerald-100';
        case SUBSCRIPTION_STATUS.PAST_DUE:
          return 'text-amber-900 bg-amber-100';
        case SUBSCRIPTION_STATUS.CANCELLED:
          return 'text-red-800 bg-red-100';
        case SUBSCRIPTION_STATUS.EXPIRED:
          return 'text-slate-600 bg-slate-100';
        case SUBSCRIPTION_STATUS.PAUSED:
          return 'text-purple-800 bg-purple-100';
        default:
          return 'text-slate-600 bg-slate-100';
      }
    case 'order':
      switch (status) {
        case ORDER_STATUS.RESERVED:
          return 'text-blue-700 bg-blue-50 border-blue-200';
        case ORDER_STATUS.PICKUPED:
          return 'text-green-700 bg-green-50 border-green-200';
        case ORDER_STATUS.RETURNED:
          return 'text-green-700 bg-green-50 border-green-200';
        case ORDER_STATUS.COMPLETED:
          return 'text-green-700 bg-green-50 border-green-200';
        case ORDER_STATUS.CANCELLED:
          return 'text-red-700 bg-red-50 border-red-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    case 'payment':
      switch (status) {
        case PAYMENT_STATUS.PENDING:
          return 'text-amber-900 bg-amber-100';
        case PAYMENT_STATUS.COMPLETED:
          return 'text-emerald-800 bg-emerald-100';
        case PAYMENT_STATUS.FAILED:
          return 'text-red-800 bg-red-100';
        case PAYMENT_STATUS.REFUNDED:
          return 'text-blue-800 bg-blue-100';
        case PAYMENT_STATUS.CANCELLED:
          return 'text-slate-600 bg-slate-100';
        default:
          return 'text-slate-600 bg-slate-100';
      }
    case 'entity':
      switch (status) {
        case ENTITY_STATUS.ACTIVE:
          return 'text-emerald-800 bg-emerald-100';
        case ENTITY_STATUS.INACTIVE:
          return 'text-slate-600 bg-slate-100';
        default:
          return 'text-slate-600 bg-slate-100';
      }
    case 'availability':
      switch (status) {
        case PRODUCT_AVAILABILITY_STATUS.AVAILABLE:
          return 'text-emerald-800 bg-emerald-100';
        case PRODUCT_AVAILABILITY_STATUS.OUT_OF_STOCK:
          return 'text-red-800 bg-red-100';
        case PRODUCT_AVAILABILITY_STATUS.UNAVAILABLE:
          return 'text-slate-600 bg-slate-100';
        case PRODUCT_AVAILABILITY_STATUS.DATE_CONFLICT:
          return 'text-amber-900 bg-amber-100';
        default:
          return 'text-slate-600 bg-slate-100';
      }
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

// ============================================================================
// STATUS FILTER OPTIONS
// ============================================================================

/**
 * Get all status options for dropdowns/filters
 */
export function getStatusOptions(type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability') {
  switch (type) {
    case 'subscription':
      return Object.values(SUBSCRIPTION_STATUS).map(status => ({
        value: status,
        label: getStatusLabel(status, 'subscription')
      }));
    case 'order':
      return Object.values(ORDER_STATUS).map(status => ({
        value: status,
        label: getStatusLabel(status, 'order')
      }));
    case 'payment':
      return Object.values(PAYMENT_STATUS).map(status => ({
        value: status,
        label: getStatusLabel(status, 'payment')
      }));
    case 'entity':
      return Object.values(ENTITY_STATUS).map(status => ({
        value: status,
        label: getStatusLabel(status, 'entity')
      }));
    case 'availability':
      return Object.values(PRODUCT_AVAILABILITY_STATUS).map(status => ({
        value: status,
        label: getStatusLabel(status, 'availability')
      }));
    default:
      return [];
  }
}
