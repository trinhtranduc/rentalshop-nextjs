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
  address?: string;
  isActive: boolean;
  planId?: string;
  subscriptionStatus?: string;
  trialEndsAt?: Date | string;
  totalRevenue?: number;
  lastActiveAt?: Date | string;
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

export interface MerchantSearchFilters {
  q?: string;
  status?: string;
  plan?: string;
  isActive?: boolean;
  subscriptionStatus?: string;
  minRevenue?: number;
  maxRevenue?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
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
   * Search merchants with filters
   */
  async searchMerchants(filters: MerchantSearchFilters): Promise<ApiResponse<MerchantsResponse>> {
    const params = new URLSearchParams();
    
    if (filters.q) params.append('q', filters.q);
    if (filters.status) params.append('status', filters.status);
    if (filters.plan) params.append('plan', filters.plan);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.subscriptionStatus) params.append('subscriptionStatus', filters.subscriptionStatus);
    if (filters.minRevenue !== undefined) params.append('minRevenue', filters.minRevenue.toString());
    if (filters.maxRevenue !== undefined) params.append('maxRevenue', filters.maxRevenue.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants?${params.toString()}`);
    return await parseApiResponse<MerchantsResponse>(response);
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
   * Get merchant detail with full data (subscriptions, outlets, users, etc.)
   */
  async getMerchantDetail(publicId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${publicId}`);
    const result = await parseApiResponse<any>(response);
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
  },

  /**
   * Update merchant plan
   */
  async updateMerchantPlan(merchantId: number, planData: {
    planId: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${merchantId}/plan`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planData),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Get merchant plan history
   */
  async getMerchantPlanHistory(merchantId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${merchantId}/plan`);
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Disable merchant plan
   */
  async disableMerchantPlan(merchantId: number, subscriptionId: number, reason: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${merchantId}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'disable',
        subscriptionId,
        reason
      }),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Delete merchant plan
   */
  async deleteMerchantPlan(merchantId: number, subscriptionId: number, reason: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/merchants/${merchantId}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        subscriptionId,
        reason
      }),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  }
};
