import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from '../common';

export interface Outlet {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  merchantId: string;
  merchant?: {
    id: string;
    name: string;
  };
}

export interface OutletsResponse {
  outlets: Outlet[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface OutletFilters {
  search?: string;
  merchantId?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Outlets API client for outlet management operations
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

    const response = await authenticatedFetch(`/api/outlets?${params.toString()}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Get outlet by ID
   */
  async getOutletById(outletId: string): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(`/api/outlets/${outletId}`);
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Get outlets by merchant ID
   */
  async getOutletsByMerchant(merchantId: string): Promise<ApiResponse<Outlet[]>> {
    const response = await authenticatedFetch(`/api/outlets?merchantId=${merchantId}`);
    const result = await parseApiResponse<Outlet[]>(response);
    return result;
  },

  /**
   * Create a new outlet
   */
  async createOutlet(outletData: Partial<Outlet>): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch('/api/outlets', {
      method: 'POST',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Update an existing outlet
   */
  async updateOutlet(outletId: string, outletData: Partial<Outlet>): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(`/api/outlets/${outletId}`, {
      method: 'PUT',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
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
   * Get outlet statistics
   */
  async getOutletStats(outletId?: string): Promise<ApiResponse<any>> {
    const endpoint = outletId ? `/api/outlets/${outletId}/stats` : '/api/outlets/stats';
    const response = await authenticatedFetch(endpoint);
    return await parseApiResponse<any>(response);
  }
};
