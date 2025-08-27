/**
 * Order Constants
 * 
 * These constants define order types, statuses, and related business rules
 */

// ============================================================================
// ORDER TYPES
// ============================================================================
export const ORDER_TYPES = {
  RENT: 'RENT',
  SALE: 'SALE'
} as const;

export type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES];

// ============================================================================
// ORDER STATUSES
// ============================================================================
export const ORDER_STATUSES = {
  // RENT order statuses
  BOOKED: 'BOOKED',       // mới cục (new order) - Most professional
  ACTIVE: 'ACTIVE',       // đang thuê (currently renting)
  RETURNED: 'RETURNED',   // đã trả (returned)
  
  // SALE order statuses
  COMPLETED: 'COMPLETED', // completed sale
  
  // Common statuses
  CANCELLED: 'CANCELLED'  // hủy (cancelled) - applies to both types
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

// ============================================================================
// ORDER STATUS MAPPING BY TYPE
// ============================================================================
export const ORDER_STATUS_BY_TYPE = {
  [ORDER_TYPES.RENT]: [
    ORDER_STATUSES.BOOKED,
    ORDER_STATUSES.ACTIVE,
    ORDER_STATUSES.RETURNED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_TYPES.SALE]: [
    ORDER_STATUSES.COMPLETED,
    ORDER_STATUSES.CANCELLED
  ]
} as const;

// ============================================================================
// ORDER STATUS LABELS (Vietnamese)
// ============================================================================
export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.BOOKED]: 'Mới cục',
  [ORDER_STATUSES.ACTIVE]: 'Đang thuê',
  [ORDER_STATUSES.RETURNED]: 'Đã trả',
  [ORDER_STATUSES.COMPLETED]: 'Hoàn thành',
  [ORDER_STATUSES.CANCELLED]: 'Hủy'
} as const;

// ============================================================================
// ORDER TYPE LABELS (Vietnamese)
// ============================================================================
export const ORDER_TYPE_LABELS = {
  [ORDER_TYPES.RENT]: 'Thuê',
  [ORDER_TYPES.SALE]: 'Bán'
} as const;

// ============================================================================
// ORDER STATUS COLORS
// ============================================================================
export const ORDER_STATUS_COLORS = {
  [ORDER_STATUSES.BOOKED]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUSES.ACTIVE]: 'bg-green-100 text-green-800',
  [ORDER_STATUSES.RETURNED]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUSES.COMPLETED]: 'bg-gray-100 text-gray-800',
  [ORDER_STATUSES.CANCELLED]: 'bg-red-100 text-red-800'
} as const;

// ============================================================================
// ORDER TYPE COLORS
// ============================================================================
export const ORDER_TYPE_COLORS = {
  [ORDER_TYPES.RENT]: 'bg-blue-100 text-blue-800',
  [ORDER_TYPES.SALE]: 'bg-green-100 text-green-800'
} as const;

// ============================================================================
// ORDER STATUS ICONS
// ============================================================================
export const ORDER_STATUS_ICONS = {
  [ORDER_STATUSES.BOOKED]: '📋',
  [ORDER_STATUSES.ACTIVE]: '⏳',
  [ORDER_STATUSES.RETURNED]: '✅',
  [ORDER_STATUSES.COMPLETED]: '🎉',
  [ORDER_STATUSES.CANCELLED]: '❌'
} as const;

// ============================================================================
// ORDER TYPE ICONS
// ============================================================================
export const ORDER_TYPE_ICONS = {
  [ORDER_TYPES.RENT]: '🔄',
  [ORDER_TYPES.SALE]: '💰'
} as const;

// ============================================================================
// ORDER STATUS FLOW
// ============================================================================
export const ORDER_STATUS_FLOW = {
  [ORDER_TYPES.RENT]: [
    ORDER_STATUSES.BOOKED,
    ORDER_STATUSES.ACTIVE,
    ORDER_STATUSES.RETURNED
  ],
  [ORDER_TYPES.SALE]: [
    ORDER_STATUSES.COMPLETED
  ]
} as const;

// ============================================================================
// VALID STATUS TRANSITIONS
// ============================================================================
export const VALID_STATUS_TRANSITIONS = {
  [ORDER_STATUSES.BOOKED]: [ORDER_STATUSES.ACTIVE, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ACTIVE]: [ORDER_STATUSES.RETURNED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.RETURNED]: [ORDER_STATUSES.CANCELLED], // Can still be cancelled after return
  [ORDER_STATUSES.COMPLETED]: [], // Terminal status
  [ORDER_STATUSES.CANCELLED]: [] // Terminal status
} as const;

// ============================================================================
// ORDER DEFAULTS
// ============================================================================
export const ORDER_DEFAULTS = {
  STATUS: ORDER_STATUSES.BOOKED,
  TYPE: ORDER_TYPES.RENT,
  DEPOSIT_AMOUNT: 0,
  SECURITY_DEPOSIT: 0,
  DAMAGE_FEE: 0,
  LATE_FEE: 0
} as const;
