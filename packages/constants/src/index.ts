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

// Export all constant modules
export * from './pagination';
export * from './search';
export * from './validation';
export * from './ui';
export * from './business';
export * from './environment';
export * from './api';
export * from './orders';

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
} as const;

// Re-export the main constants object
export { CONSTANTS as default };
