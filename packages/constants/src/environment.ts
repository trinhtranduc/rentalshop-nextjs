/**
 * Environment-Specific Constants
 * 
 * These constants can vary based on the environment (development, staging, production)
 */

export const ENVIRONMENT = {
  // API Configuration
  API_TIMEOUT: process.env.NODE_ENV === 'production' ? 10000 : 30000,
  API_RETRY_ATTEMPTS: process.env.NODE_ENV === 'production' ? 3 : 1,
  
  // Search and Pagination (Production vs Development)
  SEARCH_LIMIT: process.env.NODE_ENV === 'production' ? 50 : 20,
  DASHBOARD_ITEMS: process.env.NODE_ENV === 'production' ? 20 : 10,
  
  // Caching
  CACHE_TTL: process.env.NODE_ENV === 'production' ? 300 : 60, // seconds
  CACHE_MAX_SIZE: process.env.NODE_ENV === 'production' ? 1000 : 100,
  
  // Logging
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  LOG_RETENTION: process.env.NODE_ENV === 'production' ? 30 : 7, // days
  
  // Performance
  DEBOUNCE_DELAY: process.env.NODE_ENV === 'production' ? 500 : 300,
  THROTTLE_DELAY: process.env.NODE_ENV === 'production' ? 200 : 100,
  
  // Security
  SESSION_TIMEOUT: process.env.NODE_ENV === 'production' ? 3600 : 7200, // seconds
  MAX_LOGIN_ATTEMPTS: process.env.NODE_ENV === 'production' ? 5 : 10,
  
  // Feature Flags
  ENABLE_ANALYTICS: process.env.NODE_ENV === 'production',
  ENABLE_DEBUG_MODE: process.env.NODE_ENV !== 'production',
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'production',
} as const;

// Type for environment values
export type EnvironmentValue = typeof ENVIRONMENT[keyof typeof ENVIRONMENT];
