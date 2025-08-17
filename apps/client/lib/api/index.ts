/**
 * API Client Index
 * 
 * Central export point for all API clients
 * Import from here: import { usersApi, productsApi, profileApi } from '@/lib/api'
 */

// Domain-specific API clients
export { usersApi } from './users';
export { ordersApi } from './orders';
export { productsApi } from './products';
export { customersApi } from './customers';
export { shopsApi } from './shops';
export { profileApi } from './profile';
export { outletsApi } from './outlets';
export { categoriesApi } from './categories';
export { analyticsApi } from './analytics';
export { notificationsApi } from './notifications';

// Core API utilities and shared interfaces
export { 
  apiClient
} from './client';

// Re-export types for convenience
export type { UsersResponse } from './users';
export type { OrdersResponse, OrderFilters } from './orders';
export type { ProductsResponse, ProductFilters } from './products';
export type { CustomersResponse, CustomerFilters } from './customers';
export type { ShopsResponse, ShopFilters } from './shops';
export type { ProfileData, ProfileUpdateInput, PasswordChangeInput } from './profile';
export type { OutletsResponse, OutletFilters } from './outlets';
export type { CategoriesResponse, CategoryFilters } from './categories';
export type { 
  DashboardStats, 
  RevenueAnalytics, 
  OrderAnalytics, 
  CustomerAnalytics, 
  ProductAnalytics 
} from './analytics';
export type { 
  NotificationsResponse, 
  NotificationFilters, 
  NotificationPreferences 
} from './notifications';
export type { ApiResponse } from './client';
