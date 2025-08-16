import { authenticatedFetch, handleApiResponse } from '../auth/auth';

/**
 * Main API Client - Centralized API utilities and shared interfaces
 * 
 * This file contains:
 * - Shared interfaces (ApiResponse)
 * - Generic API utilities (apiClient)
 * - Core business APIs (products, categories, outlets, profile)
 * 
 * Domain-specific APIs are organized in separate files:
 * - users.ts - User management operations
 * - (future) orders.ts - Order operations
 * - (future) customers.ts - Customer operations
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Products API
 */
export const productsApi = {
  /**
   * Get all products with optional filters
   */
  async getProducts(filters?: {
    search?: string;
    categoryId?: string;
    outletId?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/products?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${id}`);
    return handleApiResponse(response);
  },

  /**
   * Check product availability
   */
  async checkAvailability(id: string): Promise<ApiResponse<{ isAvailable: boolean }>> {
    const response = await authenticatedFetch(`/api/products/${id}/availability`);
    return handleApiResponse(response);
  },
};

/**
 * Categories API
 */
export const categoriesApi = {
  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Array<{ id: string; name: string; description?: string }>>> {
    const response = await authenticatedFetch('/api/categories');
    return handleApiResponse(response);
  },
};

/**
 * Outlets API
 */
export const outletsApi = {
  /**
   * Get all outlets
   */
  async getOutlets(): Promise<ApiResponse<Array<{ id: string; name: string; address: string }>>> {
    const response = await authenticatedFetch('/api/outlets');
    return handleApiResponse(response);
  },
};

/**
 * Profile API (for current user operations)
 */
export const profileApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/auth/me');
    return handleApiResponse(response);
  },

  /**
   * Update user profile
   */
  async updateProfile(data: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleApiResponse(response);
  },
};

/**
 * Generic API client for other endpoints
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response = await authenticatedFetch(url);
    return handleApiResponse(response);
  },

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleApiResponse(response);
  },

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleApiResponse(response);
  },

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });
    return handleApiResponse(response);
  },
}; 