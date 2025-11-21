// ============================================================================
// CENTRALIZED COLOR SYSTEM - OCEAN BLUE THEME
// ============================================================================
// This file defines all colors used across the rental shop system.
// Use these constants for consistent theming throughout the application.

// ============================================================================
// BRAND COLORS - Green Theme
// ============================================================================
export const BRAND_COLORS = {
  primary: '#22C55E',       // Green 500 - primary green
  secondary: '#4ADE80',     // Green 400 - lighter green
  dark: '#15803D',          // Green 700 - deep green
  light: '#86EFAC',         // Green 300 - light green
  lightest: '#DCFCE7',      // Green 100 - very light green background
} as const;

// ============================================================================
// ACTION COLORS
// ============================================================================
export const ACTION_COLORS = {
  primary: '#22C55E',       // Green 500 (same as brand primary)
  success: '#10B981',       // Emerald green
  danger: '#EF4444',        // Red
  warning: '#F59E0B',       // Amber
  info: '#3B82F6',          // Blue 500
} as const;

// ============================================================================
// TEXT COLORS
// ============================================================================
export const TEXT_COLORS = {
  primary: '#1E293B',       // Slate 800 - main text
  secondary: '#64748B',     // Slate 500 - secondary text
  tertiary: '#94A3B8',      // Slate 400 - tertiary text
  inverted: '#FFFFFF',      // White text
  muted: '#CBD5E1',         // Slate 300 - muted text
} as const;

// ============================================================================
// BACKGROUND COLORS
// ============================================================================
export const BACKGROUND_COLORS = {
  primary: '#F8FAFC',       // Slate 50 - main background
  secondary: '#F1F5F9',     // Slate 100 - secondary background
  tertiary: '#E2E8F0',      // Slate 200 - tertiary background
  card: '#FFFFFF',          // White - card background
  dark: '#0F172A',          // Slate 900 - dark background
} as const;

// ============================================================================
// NAVIGATION COLORS
// ============================================================================
export const NAVIGATION_COLORS = {
  background: '#0F172A',    // Dark slate
  backgroundHover: '#1E293B', // Slate 800
  text: '#FFFFFF',          // White
  textActive: '#86EFAC',    // Green 300 - light green
  textHover: '#DCFCE7',     // Green 100 - very light green
  border: '#334155',        // Slate 700
  icon: '#94A3B8',          // Slate 400
  iconActive: '#22C55E',    // Green 500
} as const;

// ============================================================================
// BORDER COLORS
// ============================================================================
export const BORDER_COLORS = {
  default: '#E2E8F0',       // Slate 200
  light: '#F1F5F9',         // Slate 100
  dark: '#CBD5E1',          // Slate 300
  focus: '#22C55E',         // Green 500
} as const;

// ============================================================================
// ORDER STATUS COLORS - Ocean Blue Theme
// ============================================================================
export const ORDER_STATUS_COLORS = {
  RESERVED: {
    bg: '#EFF6FF',          // Blue 50 - badge background (lighter, softer)
    text: '#1D4ED8',        // Blue 700 - badge text (better contrast)
    border: '#BFDBFE',      // Blue 200 - border
    hex: '#3B82F6',         // Blue 500 - primary color
    buttonBg: '#3B82F6',    // Blue 500 - button background
    buttonHover: '#2563EB', // Blue 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  PICKUPED: {
    bg: '#FFF7ED',          // Orange 50 - badge background (lighter, softer)
    text: '#C2410C',        // Orange 700 - badge text (better contrast)
    border: '#FED7AA',      // Orange 200 - border
    hex: '#F97316',         // Orange 500 - primary color
    buttonBg: '#F97316',    // Orange 500 - button background
    buttonHover: '#EA580C', // Orange 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  RETURNED: {
    bg: '#F0FDF4',          // Green 50 - badge background (lighter, softer)
    text: '#15803D',        // Green 700 - badge text (better contrast)
    border: '#BBF7D0',      // Green 200 - border
    hex: '#22C55E',         // Green 500 - primary color
    buttonBg: '#22C55E',    // Green 500 - button background
    buttonHover: '#16A34A', // Green 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  COMPLETED: {
    bg: '#F0FDF4',          // Green 50 - badge background (same as RETURNED - success)
    text: '#15803D',        // Green 700 - badge text (better contrast)
    border: '#BBF7D0',      // Green 200 - border
    hex: '#22C55E',         // Green 500 - primary color
    buttonBg: '#22C55E',    // Green 500 - button background
    buttonHover: '#16A34A', // Green 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  CANCELLED: {
    bg: '#FEF2F2',          // Red 50 - badge background (lighter, softer)
    text: '#B91C1C',        // Red 700 - badge text (better contrast)
    border: '#FECACA',      // Red 200 - border
    hex: '#EF4444',         // Red 500 - primary color
    buttonBg: '#EF4444',    // Red 500 - button background
    buttonHover: '#DC2626', // Red 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// ORDER TYPE COLORS - Ocean Blue Theme
// ============================================================================
export const ORDER_TYPE_COLORS = {
  RENT: {
    bg: '#DBEAFE',          // Blue 100 - badge background
    text: '#1E40AF',        // Blue 800 - badge text
    hex: '#3B82F6',         // Blue 500 - primary color
    buttonBg: '#3B82F6',    // Blue 500 - button background
    buttonHover: '#2563EB', // Blue 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  SALE: {
    bg: '#D1FAE5',          // Emerald 100 - badge background
    text: '#065F46',        // Emerald 800 - badge text
    hex: '#10B981',         // Emerald 500 - primary color
    buttonBg: '#10B981',    // Emerald 500 - button background
    buttonHover: '#059669', // Emerald 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// SUBSCRIPTION STATUS COLORS
// ============================================================================
export const SUBSCRIPTION_STATUS_COLORS = {
  TRIAL: {
    bg: '#DCFCE7',          // Green 100 - badge background
    text: '#15803D',        // Green 700 - badge text
    hex: '#22C55E',         // Green 500 - primary color
    buttonBg: '#22C55E',    // Green 500 - button background
    buttonHover: '#16A34A', // Green 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  ACTIVE: {
    bg: '#D1FAE5',          // Emerald 100 - badge background
    text: '#065F46',        // Emerald 800 - badge text
    hex: '#10B981',         // Emerald 500 - primary color
    buttonBg: '#10B981',    // Emerald 500 - button background
    buttonHover: '#059669', // Emerald 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  PAST_DUE: {
    bg: '#FEF3C7',          // Amber 100 - badge background
    text: '#92400E',        // Amber 900 - badge text
    hex: '#F59E0B',         // Amber 500 - primary color
    buttonBg: '#F59E0B',    // Amber 500 - button background
    buttonHover: '#D97706', // Amber 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  CANCELLED: {
    bg: '#FEE2E2',          // Red 100 - badge background
    text: '#991B1B',        // Red 800 - badge text
    hex: '#EF4444',         // Red 500 - primary color
    buttonBg: '#EF4444',    // Red 500 - button background
    buttonHover: '#DC2626', // Red 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  PAUSED: {
    bg: '#F3E8FF',          // Purple 100 - badge background
    text: '#6B21A8',        // Purple 800 - badge text
    hex: '#A855F7',         // Purple 500 - primary color
    buttonBg: '#A855F7',    // Purple 500 - button background
    buttonHover: '#9333EA', // Purple 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  EXPIRED: {
    bg: '#F1F5F9',          // Slate 100 - badge background
    text: '#475569',        // Slate 600 - badge text
    hex: '#64748B',         // Slate 500 - primary color
    buttonBg: '#64748B',    // Slate 500 - button background
    buttonHover: '#475569', // Slate 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// PAYMENT STATUS COLORS
// ============================================================================
export const PAYMENT_STATUS_COLORS = {
  PENDING: {
    bg: '#FEF3C7',          // Amber 100 - badge background
    text: '#92400E',        // Amber 900 - badge text
    hex: '#F59E0B',         // Amber 500 - primary color
    buttonBg: '#F59E0B',    // Amber 500 - button background
    buttonHover: '#D97706', // Amber 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  COMPLETED: {
    bg: '#D1FAE5',          // Emerald 100 - badge background
    text: '#065F46',        // Emerald 800 - badge text
    hex: '#10B981',         // Emerald 500 - primary color
    buttonBg: '#10B981',    // Emerald 500 - button background
    buttonHover: '#059669', // Emerald 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  FAILED: {
    bg: '#FEE2E2',          // Red 100 - badge background
    text: '#991B1B',        // Red 800 - badge text
    hex: '#EF4444',         // Red 500 - primary color
    buttonBg: '#EF4444',    // Red 500 - button background
    buttonHover: '#DC2626', // Red 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  REFUNDED: {
    bg: '#DBEAFE',          // Blue 100 - badge background
    text: '#1E40AF',        // Blue 800 - badge text
    hex: '#3B82F6',         // Blue 500 - primary color (keep blue for refunded)
    buttonBg: '#3B82F6',    // Blue 500 - button background
    buttonHover: '#2563EB', // Blue 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  CANCELLED: {
    bg: '#F1F5F9',          // Slate 100 - badge background
    text: '#475569',        // Slate 600 - badge text
    hex: '#64748B',         // Slate 500 - primary color
    buttonBg: '#64748B',    // Slate 500 - button background
    buttonHover: '#475569', // Slate 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// ENTITY STATUS COLORS
// ============================================================================
export const ENTITY_STATUS_COLORS = {
  ACTIVE: {
    bg: '#D1FAE5',          // Emerald 100 - badge background
    text: '#065F46',        // Emerald 800 - badge text
    hex: '#10B981',         // Emerald 500 - primary color
    buttonBg: '#10B981',    // Emerald 500 - button background
    buttonHover: '#059669', // Emerald 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  INACTIVE: {
    bg: '#F1F5F9',          // Slate 100 - badge background
    text: '#475569',        // Slate 600 - badge text
    hex: '#64748B',         // Slate 500 - primary color
    buttonBg: '#64748B',    // Slate 500 - button background
    buttonHover: '#475569', // Slate 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// PRODUCT AVAILABILITY COLORS
// ============================================================================
export const PRODUCT_AVAILABILITY_COLORS = {
  AVAILABLE: {
    bg: '#D1FAE5',          // Emerald 100 - badge background
    text: '#065F46',        // Emerald 800 - badge text
    hex: '#10B981',         // Emerald 500 - primary color
    buttonBg: '#10B981',    // Emerald 500 - button background
    buttonHover: '#059669', // Emerald 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  OUT_OF_STOCK: {
    bg: '#FEE2E2',          // Red 100 - badge background
    text: '#991B1B',        // Red 800 - badge text
    hex: '#EF4444',         // Red 500 - primary color
    buttonBg: '#EF4444',    // Red 500 - button background
    buttonHover: '#DC2626', // Red 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  UNAVAILABLE: {
    bg: '#F1F5F9',          // Slate 100 - badge background
    text: '#475569',        // Slate 600 - badge text
    hex: '#64748B',         // Slate 500 - primary color
    buttonBg: '#64748B',    // Slate 500 - button background
    buttonHover: '#475569', // Slate 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
  DATE_CONFLICT: {
    bg: '#FEF3C7',          // Amber 100 - badge background
    text: '#92400E',        // Amber 900 - badge text
    hex: '#F59E0B',         // Amber 500 - primary color
    buttonBg: '#F59E0B',    // Amber 500 - button background
    buttonHover: '#D97706', // Amber 600 - button hover
    buttonText: '#FFFFFF',  // White - button text
  },
} as const;

// ============================================================================
// BUTTON VARIANT COLORS
// ============================================================================
export const BUTTON_COLORS = {
  primary: {
    bg: '#22C55E',          // Green 500
    bgHover: '#16A34A',     // Green 600
    text: '#FFFFFF',        // White
  },
  secondary: {
    bg: '#F1F5F9',          // Slate 100
    bgHover: '#E2E8F0',     // Slate 200
    text: '#1E293B',        // Slate 800
  },
  success: {
    bg: '#10B981',          // Emerald
    bgHover: '#059669',     // Darker emerald
    text: '#FFFFFF',        // White
  },
  danger: {
    bg: '#EF4444',          // Red
    bgHover: '#DC2626',     // Darker red
    text: '#FFFFFF',        // White
  },
  warning: {
    bg: '#F59E0B',          // Amber
    bgHover: '#D97706',     // Darker amber
    text: '#FFFFFF',        // White
  },
  outline: {
    bg: 'transparent',
    bgHover: '#F8FAFC',     // Slate 50
    text: '#334155',        // Slate 700
    border: '#CBD5E1',      // Slate 300
  },
  ghost: {
    bg: 'transparent',
    bgHover: '#F1F5F9',     // Slate 100
    text: '#1E293B',        // Slate 800
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Tailwind class string for order status
 */
export function getOrderStatusClass(status: keyof typeof ORDER_STATUS_COLORS): string {
  const colors = ORDER_STATUS_COLORS[status];
  if (!colors) return 'bg-gray-50 text-gray-600 border border-gray-200';
  
  const bgClass = getBgClass(colors.bg);
  const textClass = getTextClass(colors.text);
  const borderClass = colors.border ? getBorderClass(colors.border) : '';
  return `${bgClass} ${textClass} ${borderClass}`.trim();
}

/**
 * Get Tailwind class string for order type
 */
export function getOrderTypeClass(type: keyof typeof ORDER_TYPE_COLORS): string {
  const colors = ORDER_TYPE_COLORS[type];
  if (!colors) return 'bg-slate-100 text-slate-800';
  
  const bgClass = getBgClass(colors.bg);
  const textClass = getTextClass(colors.text);
  return `${bgClass} ${textClass}`;
}

/**
 * Convert hex color to Tailwind background class
 */
function getBgClass(hex: string): string {
  const colorMap: Record<string, string> = {
    // New lighter backgrounds (50)
    '#EFF6FF': 'bg-blue-50',
    '#FFF7ED': 'bg-orange-50',
    '#F0FDF4': 'bg-green-50',
    '#FEF2F2': 'bg-red-50',
    // Old backgrounds (100) - kept for backward compatibility
    '#DBEAFE': 'bg-blue-100',
    '#FEF3C7': 'bg-amber-100',
    '#D1FAE5': 'bg-emerald-100',
    '#E0E7FF': 'bg-indigo-100',
    '#FEE2E2': 'bg-red-100',
    '#E0F2FE': 'bg-sky-100',
    '#F3E8FF': 'bg-purple-100',
    '#F1F5F9': 'bg-slate-100',
  };
  return colorMap[hex] || 'bg-gray-50';
}

/**
 * Convert hex color to Tailwind text class
 */
function getTextClass(hex: string): string {
  const colorMap: Record<string, string> = {
    // New text colors (700) - better contrast
    '#1D4ED8': 'text-blue-700',
    '#C2410C': 'text-orange-700',
    '#15803D': 'text-green-700',
    '#B91C1C': 'text-red-700',
    // Old text colors - kept for backward compatibility
    '#1E40AF': 'text-blue-800',
    '#92400E': 'text-amber-900',
    '#065F46': 'text-emerald-800',
    '#3730A3': 'text-indigo-800',
    '#991B1B': 'text-red-800',
    '#0369A1': 'text-sky-700',
    '#6B21A8': 'text-purple-800',
    '#475569': 'text-slate-600',
  };
  return colorMap[hex] || 'text-gray-700';
}

/**
 * Convert hex color to Tailwind border class
 */
function getBorderClass(hex: string): string {
  const colorMap: Record<string, string> = {
    '#BFDBFE': 'border border-blue-200',
    '#FED7AA': 'border border-orange-200',
    '#BBF7D0': 'border border-green-200',
    '#FECACA': 'border border-red-200',
  };
  return colorMap[hex] || 'border border-gray-200';
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type BrandColor = keyof typeof BRAND_COLORS;
export type ActionColor = keyof typeof ACTION_COLORS;
export type TextColor = keyof typeof TEXT_COLORS;
export type BackgroundColor = keyof typeof BACKGROUND_COLORS;
export type NavigationColor = keyof typeof NAVIGATION_COLORS;
export type BorderColor = keyof typeof BORDER_COLORS;
export type ButtonVariant = keyof typeof BUTTON_COLORS;

