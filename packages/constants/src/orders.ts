// ============================================================================
// ORDER CONSTANTS
// ============================================================================

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
// ORDER TYPES
// ============================================================================
export const ORDER_TYPES = {
  RENT: 'RENT',
  SALE: 'SALE'
} as const;

export type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES];

// ============================================================================
// ORDER STATUS COLORS - CENTRALIZED COLOR SYSTEM
// ============================================================================
export const ORDER_STATUS_COLORS = {
  BOOKED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-[#f19920] text-white',
  RETURNED: 'bg-[#0F9347] text-white',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-[#b22222] text-white'
} as const;

// ============================================================================
// ORDER TYPE COLORS
// ============================================================================
export const ORDER_TYPE_COLORS = {
  RENT: 'bg-blue-100 text-blue-800',
  SALE: 'bg-green-100 text-green-800'
} as const;

// ============================================================================
// ORDER STATUS ICONS
// ============================================================================
export const ORDER_STATUS_ICONS = {
  BOOKED: '📋',
  ACTIVE: '⏳',
  RETURNED: '✅',
  COMPLETED: '🎉',
  CANCELLED: '❌'
} as const;

// ============================================================================
// ORDER TYPE ICONS
// ============================================================================
export const ORDER_TYPE_ICONS = {
  RENT: '🔄',
  SALE: '💰'
} as const;

// ============================================================================
// ORDER STATUS LABELS (Vietnamese)
// ============================================================================
export const ORDER_STATUS_LABELS = {
  BOOKED: 'Mới cục',
  ACTIVE: 'Đang thuê',
  RETURNED: 'Đã trả',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy'
} as const;

// ============================================================================
// ORDER TYPE LABELS (Vietnamese)
// ============================================================================
export const ORDER_TYPE_LABELS = {
  RENT: 'Thuê',
  SALE: 'Bán'
} as const;
