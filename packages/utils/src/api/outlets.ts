import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { Outlet, OutletCreateInput, OutletUpdateInput, OutletFilters } from '@rentalshop/types';

export interface OutletsResponse {
  outlets: Outlet[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Outlets API client for outlet management operations
 */
export const outletsApi = {
  /**
   * Get all outlets
   */
  async getOutlets(): Promise<ApiResponse<OutletsResponse>> {
    const response = await authenticatedFetch(apiUrls.outlets.list);
    const result = await parseApiResponse<OutletsResponse>(response);
    return result;
  },

  /**
   * Get outlets with pagination
   */
  async getOutletsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<OutletsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?${params.toString()}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Search outlets by name with filters
   */
  async searchOutlets(filters: OutletFilters): Promise<ApiResponse<OutletsResponse>> {
    const params = new URLSearchParams();
    
    // Search by outlet name (primary)
    const searchQuery = filters.q || filters.search;
    if (searchQuery) params.append('q', searchQuery);
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    // Add pagination parameters
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.page) params.append('page', filters.page.toString());
    
    // Add sorting parameters
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?${params.toString()}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Get outlet by ID
   */
  async getOutlet(outletId: number): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(apiUrls.outlets.get(outletId));
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Create a new outlet
   */
  async createOutlet(outletData: OutletCreateInput): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(apiUrls.outlets.create, {
      method: 'POST',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Update an existing outlet
   */
  async updateOutlet(outletId: number, outletData: OutletUpdateInput): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(apiUrls.outlets.update(outletId), {
      method: 'PUT',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Delete an outlet
   */
  async deleteOutlet(outletId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.outlets.delete(outletId), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get outlets by shop
   */
  async getOutletsByShop(shopId: number): Promise<ApiResponse<OutletsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?shopId=${shopId}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Get outlets by merchant
   */
  async getOutletsByMerchant(merchantId: number): Promise<ApiResponse<OutletsResponse>> {
    console.log('🔍 Outlets API Client: Calling getOutletsByMerchant with merchantId:', merchantId);
    console.log('🔍 Outlets API Client: API URL:', apiUrls.merchants.outlets.list(merchantId));
    
    const response = await authenticatedFetch(apiUrls.merchants.outlets.list(merchantId));
    console.log('🔍 Outlets API Client: Raw response:', response);
    
    const result = await parseApiResponse<OutletsResponse>(response);
    console.log('🔍 Outlets API Client: Parsed result:', result);
    console.log('🔍 Outlets API Client: Result success:', result.success);
    if (result.success) {
      console.log('🔍 Outlets API Client: Result data:', result.data);
      console.log('🔍 Outlets API Client: Result outlets count:', result.data?.outlets?.length || 0);
    } else {
      console.log('🔍 Outlets API Client: Error:', result.message);
    }
    
    return result;
  },

  /**
   * Get outlet statistics
   */
  async getOutletStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.outlets.stats);
    return await parseApiResponse<any>(response);
  }
};
