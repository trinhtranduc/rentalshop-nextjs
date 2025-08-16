/**
 * API Client Index
 * 
 * Central export point for all API clients
 * Import from here: import { usersApi, productsApi, profileApi } from '@/lib/api'
 */

// Domain-specific API clients
export { usersApi } from './users';

// Core API utilities and shared interfaces
export { 
  apiClient,
  productsApi,
  categoriesApi,
  outletsApi,
  profileApi 
} from './client';

// Re-export types for convenience
export type { UsersResponse } from './users';
export type { ApiResponse } from './client';
