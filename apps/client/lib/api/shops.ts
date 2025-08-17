import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Shops API Client - Shop Management Operations
 * 
 * This file handles all shop operations:
 * - Fetching shops with filters
 * - Shop CRUD operations
 * - Shop outlet management
 * - Shop statistics and analytics
 */

export interface ShopsResponse {
  shops: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface ShopFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Shops API client for authenticated shop operations
 */
export const shopsApi = {
  /**
   * Get all shops with optional filters and pagination
   */
  async getShops(filters?: ShopFilters): Promise<ApiResponse<ShopsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔍 getShops called with filters:', filters);
    console.log('📡 API endpoint:', `/api/shops?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/shops?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get shop by ID
   */
  async getShopById(shopId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/shops/${shopId}`);
    return handleApiResponse(response);
  },

  /**
   * Create a new shop
   */
  async createShop(shopData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/shops', {
      method: 'POST',
      body: JSON.stringify(shopData),
    });
    return handleApiResponse(response);
  },

  /**
   * Update an existing shop
   */
  async updateShop(shopId: string, shopData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/shops/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(shopData),
    });
    return handleApiResponse(response);
  },

  /**
   * Delete a shop
   */
  async deleteShop(shopId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/shops/${shopId}`, {
      method: 'DELETE',
    });
    return handleApiResponse(response);
  },

  /**
   * Get shop outlets
   */
  async getShopOutlets(shopId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/shops/${shopId}/outlets`);
    return handleApiResponse(response);
  },

  /**
   * Get shop statistics
   */
  async getShopStats(shopId?: string): Promise<ApiResponse<any>> {
    const endpoint = shopId ? `/api/shops/${shopId}/stats` : '/api/shops/stats';
    const response = await authenticatedFetch(endpoint);
    return handleApiResponse(response);
  },

  /**
   * Get shop analytics
   */
  async getShopAnalytics(shopId: string, filters?: {
    startDate?: string;
    endDate?: string;
    metric?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/shops/${shopId}/analytics?${params.toString()}`);
    return handleApiResponse(response);
  }
};
