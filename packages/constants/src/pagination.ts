/**
 * Pagination and List Constants
 * 
 * These constants define limits for various list operations across the application
 */

export const PAGINATION = {
  // Search and List Limits
  SEARCH_LIMIT: 20,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 20,
  
  // Dashboard Limits
  DASHBOARD_ITEMS: 10,
  RECENT_ORDERS: 5,
  TOP_PRODUCTS: 8,
  TOP_CUSTOMERS: 6,
  
  // Mobile Limits
  MOBILE_SEARCH_LIMIT: 15,
  MOBILE_PAGE_SIZE: 20,
  
  // API Limits
  API_MAX_LIMIT: 1000,
  API_DEFAULT_LIMIT: 50,
} as const;

// Type for pagination values
export type PaginationValue = typeof PAGINATION[keyof typeof PAGINATION];
