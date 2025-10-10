/**
 * UI and User Experience Constants
 * 
 * These constants define UI behavior, animations, and user experience settings
 */

export const UI = {
  // Animation and Timing
  ANIMATION_DURATION: 200,
  TRANSITION_DURATION: 150,
  HOVER_DELAY: 100,
  
  // Toast and Notifications
  TOAST_DURATION: 5000,
  TOAST_DURATION_LONG: 10000,
  TOAST_DURATION_SHORT: 3000,
  
  // Loading States
  LOADING_DELAY: 1000,
  SKELETON_DURATION: 1500,
  
  // Debounce and Throttle
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  
  // Scroll and Pagination
  INFINITE_SCROLL_THRESHOLD: 100,
  SCROLL_TO_TOP_THRESHOLD: 500,
  
  // Breakpoints (in pixels)
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
    LARGE_DESKTOP: 1536,
  },
  
  // Z-Index Layers
  Z_INDEX: {
    DROPDOWN: 1000,
    MODAL: 2000,
    TOOLTIP: 3000,
    TOAST: 4000,
    OVERLAY: 5000,
  },
} as const;

// Type for UI values
export type UIValue = typeof UI[keyof typeof UI];
