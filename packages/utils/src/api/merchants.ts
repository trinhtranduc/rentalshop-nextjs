import { authenticatedFetch, parseApiResponse, apiUrls } from '../index';
import type { ApiResponse } from '../index';

// ============================================================================
// TYPES
// ============================================================================

export interface Merchant {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MerchantsResponse {
  merchants: Merchant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// MERCHANTS API CLIENT
// ============================================================================

/**
 * Merchants API client for merchant management operations
 */
export const merchantsApi = {
  /**
   * Get all merchants
   */
  async getMerchants(): Promise<ApiResponse<MerchantsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants`);
    const result = await parseApiResponse<MerchantsResponse>(response);
    return result;
  },

  /**
   * Get merchants with pagination
   */
  async getMerchantsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<MerchantsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants?page=${page}&limit=${limit}`);
    const result = await parseApiResponse<MerchantsResponse>(response);
    return result;
  },

  /**
   * Get merchant by ID
   */
  async getMerchantById(id: number): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${id}`);
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Get merchant by public ID
   */
  async getMerchantByPublicId(publicId: number): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants?publicId=${publicId}`);
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Create new merchant
   */
  async createMerchant(merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(merchantData),
    });
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Update merchant
   */
  async updateMerchant(id: number, merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(merchantData),
    });
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Delete merchant
   */
  async deleteMerchant(id: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${id}`, {
      method: 'DELETE',
    });
    const result = await parseApiResponse<void>(response);
    return result;
  },

  /**
   * Get merchant statistics
   */
  async getMerchantStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/stats`);
    const result = await parseApiResponse<any>(response);
    return result;
  }
};
