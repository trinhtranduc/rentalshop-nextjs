// ============================================================================
// ORDER CONSTANTS
// ============================================================================

import { ORDER_STATUS, OrderStatus } from './status';

// Re-export from centralized status constants
export { ORDER_STATUS as ORDER_STATUSES } from './status';
export type { OrderStatus } from './status';

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
  RESERVED: 'bg-red-100 text-red-800',
  PICKUPED: 'bg-[#f19920] text-white',
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
  RESERVED: '📋',
  PICKUPED: '⏳',
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
  RESERVED: 'Mới cọc',
  PICKUPED: 'Đang thuê',
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
