import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { Shop, ShopCreateInput, ShopUpdateInput } from '@rentalshop/types';

export interface ShopsResponse {
  shops: Shop[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Shops API client for shop management operations
 */
export const shopsApi = {
  /**
   * Get all shops
   */
  async getShops(): Promise<ApiResponse<Shop[]>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops`);
    const result = await parseApiResponse<Shop[]>(response);
    return result;
  },

  /**
   * Get shops with pagination
   */
  async getShopsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<ShopsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops?${params.toString()}`);
    return await parseApiResponse<ShopsResponse>(response);
  },

  /**
   * Get shop by ID
   */
  async getShop(shopId: number): Promise<ApiResponse<Shop>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops/${shopId}`);
    return await parseApiResponse<Shop>(response);
  },

  /**
   * Create a new shop
   */
  async createShop(shopData: ShopCreateInput): Promise<ApiResponse<Shop>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops`, {
      method: 'POST',
      body: JSON.stringify(shopData),
    });
    return await parseApiResponse<Shop>(response);
  },

  /**
   * Update an existing shop
   */
  async updateShop(shopId: number, shopData: ShopUpdateInput): Promise<ApiResponse<Shop>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(shopData),
    });
    return await parseApiResponse<Shop>(response);
  },

  /**
   * Delete a shop
   */
  async deleteShop(shopId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops/${shopId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get shops by merchant
   */
  async getShopsByMerchant(merchantId: number): Promise<ApiResponse<Shop[]>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops?merchantId=${merchantId}`);
    return await parseApiResponse<Shop[]>(response);
  },

  /**
   * Get shop statistics
   */
  async getShopStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/shops/stats`);
    return await parseApiResponse<any>(response);
  }
};
