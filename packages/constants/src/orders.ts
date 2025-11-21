// ============================================================================
// ORDER CONSTANTS
// ============================================================================

import { ORDER_STATUS, OrderStatus } from './status';
import { ORDER_STATUS_COLORS as STATUS_COLORS, ORDER_TYPE_COLORS as TYPE_COLORS } from './colors';

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
// ORDER STATUS COLORS - Minimal Text-Only (Option 5)
// ============================================================================
// Clean minimal design: text color only, no background
// - Blue: RESERVED (pending/awaiting)
// - Green: PICKUPED, RETURNED (active/completed)
// - Gray: COMPLETED, CANCELLED (neutral/muted)
export const ORDER_STATUS_COLORS = {
  RESERVED: 'text-blue-700 border border-blue-200',
  PICKUPED: 'text-green-700 border border-green-200',
  RETURNED: 'text-green-600 border border-green-200',
  COMPLETED: 'text-gray-700 border border-gray-200',
  CANCELLED: 'text-gray-500 border border-gray-200'
} as const;

// ============================================================================
// ORDER TYPE COLORS - Ocean Blue Theme (Badge/Display)
// ============================================================================
export const ORDER_TYPE_COLORS = {
  RENT: 'bg-blue-100 text-blue-800',
  SALE: 'bg-emerald-100 text-emerald-800'
} as const;

// ============================================================================
// ORDER STATUS BUTTON COLORS - Ocean Blue Theme
// ============================================================================
export const ORDER_STATUS_BUTTON_COLORS = {
  RESERVED: STATUS_COLORS.RESERVED,
  PICKUPED: STATUS_COLORS.PICKUPED,
  RETURNED: STATUS_COLORS.RETURNED,
  COMPLETED: STATUS_COLORS.COMPLETED,
  CANCELLED: STATUS_COLORS.CANCELLED
} as const;

// ============================================================================
// ORDER TYPE BUTTON COLORS - Ocean Blue Theme
// ============================================================================
export const ORDER_TYPE_BUTTON_COLORS = {
  RENT: TYPE_COLORS.RENT,
  SALE: TYPE_COLORS.SALE
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
