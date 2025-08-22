import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from "../common";

/**
 * Outlets API Client - Outlet Management Operations
 * 
 * This file handles all outlet operations:
 * - Fetching outlets with filters
 * - Outlet CRUD operations
 * - Outlet inventory management
 * - Outlet statistics and analytics
 */

export interface OutletsResponse {
  outlets: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface OutletFilters {
  search?: string;
  shopId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Outlets API client for authenticated outlet operations
 */
export const outletsApi = {
  /**
   * Get all outlets with optional filters and pagination
   */
  async getOutlets(filters?: OutletFilters): Promise<ApiResponse<OutletsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔍 getOutlets called with filters:', filters);
    console.log('📡 API endpoint:', `/api/outlets?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/outlets?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = await parseApiResponse<OutletsResponse>(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get outlet by ID
   */
  async getOutletById(outletId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/outlets/${outletId}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Create a new outlet
   */
  async createOutlet(outletData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/outlets', {
      method: 'POST',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update an existing outlet
   */
  async updateOutlet(outletId: string, outletData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/outlets/${outletId}`, {
      method: 'PUT',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Delete an outlet
   */
  async deleteOutlet(outletId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/outlets/${outletId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get outlet inventory
   */
  async getOutletInventory(outletId: string, filters?: {
    search?: string;
    categoryId?: string;
    available?: boolean;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/outlets/${outletId}/inventory?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get outlet orders
   */
  async getOutletOrders(outletId: string, filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/outlets/${outletId}/orders?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get outlet statistics
   */
  async getOutletStats(outletId?: string): Promise<ApiResponse<any>> {
    const endpoint = outletId ? `/api/outlets/${outletId}/stats` : '/api/outlets/stats';
    const response = await authenticatedFetch(endpoint);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get outlet analytics
   */
  async getOutletAnalytics(outletId: string, filters?: {
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

    const response = await authenticatedFetch(`/api/outlets/${outletId}/analytics?${params.toString()}`);
    return await parseApiResponse<any>(response);
  }
};
