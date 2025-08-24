/**
 * Search and Query Constants
 * 
 * These constants define search behavior and query limits
 */

export const SEARCH = {
  // Debounce and Timing
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  
  // Suggestion and Results
  SUGGESTION_LIMIT: 5,
  MAX_SEARCH_RESULTS: 1000,
  
  // Auto-complete
  AUTOCOMPLETE_DELAY: 200,
  AUTOCOMPLETE_MIN_CHARS: 1,
  
  // Search Types
  PRODUCT_SEARCH: 'product',
  CUSTOMER_SEARCH: 'customer',
  ORDER_SEARCH: 'order',
} as const;

// Type for search values
export type SearchValue = typeof SEARCH[keyof typeof SEARCH];
