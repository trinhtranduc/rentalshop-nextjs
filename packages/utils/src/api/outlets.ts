import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { Outlet, OutletCreateInput, OutletUpdateInput } from '@rentalshop/types';

export interface OutletsResponse {
  outlets: Outlet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Outlets API client for outlet management operations
 */
export const outletsApi = {
  /**
   * Get all outlets
   */
  async getOutlets(): Promise<ApiResponse<OutletsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets`);
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
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets?${params.toString()}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Get outlet by ID
   */
  async getOutlet(outletId: number): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets/${outletId}`);
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Create a new outlet
   */
  async createOutlet(outletData: OutletCreateInput): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets`, {
      method: 'POST',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Update an existing outlet
   */
  async updateOutlet(outletId: number, outletData: OutletUpdateInput): Promise<ApiResponse<Outlet>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets?outletId=${outletId}`, {
      method: 'PUT',
      body: JSON.stringify(outletData),
    });
    return await parseApiResponse<Outlet>(response);
  },

  /**
   * Delete an outlet
   */
  async deleteOutlet(outletId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets?outletId=${outletId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get outlets by shop
   */
  async getOutletsByShop(shopId: number): Promise<ApiResponse<OutletsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets?shopId=${shopId}`);
    return await parseApiResponse<OutletsResponse>(response);
  },

  /**
   * Get outlets by merchant
   */
  async getOutletsByMerchant(merchantId: number): Promise<ApiResponse<OutletsResponse>> {
    console.log('🔍 Outlets API Client: Calling getOutletsByMerchant with merchantId:', merchantId);
    console.log('🔍 Outlets API Client: API URL:', `${apiUrls.base}/api/outlets?merchantId=${merchantId}&isActive=all`);
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets?merchantId=${merchantId}&isActive=all`);
    console.log('🔍 Outlets API Client: Raw response:', response);
    
    const result = await parseApiResponse<OutletsResponse>(response);
    console.log('🔍 Outlets API Client: Parsed result:', result);
    console.log('🔍 Outlets API Client: Result success:', result.success);
    console.log('🔍 Outlets API Client: Result data:', result.data);
    console.log('🔍 Outlets API Client: Result outlets count:', result.data?.outlets?.length || 0);
    
    return result;
  },

  /**
   * Get outlet statistics
   */
  async getOutletStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/outlets/stats`);
    return await parseApiResponse<any>(response);
  }
};
