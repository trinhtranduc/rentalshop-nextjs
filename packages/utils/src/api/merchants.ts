import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';

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
    const response = await authenticatedFetch(apiUrls.merchants.list);
    const result = await parseApiResponse<MerchantsResponse>(response);
    return result;
  },

  /**
   * Get merchants with pagination
   */
  async getMerchantsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<MerchantsResponse>> {
    const response = await authenticatedFetch(`${apiUrls.merchants.list}?page=${page}&limit=${limit}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.merchants.list}?${params.toString()}`);
    return await parseApiResponse<MerchantsResponse>(response);
  },

  /**
   * Get merchant by ID
   */
  async getMerchantById(id: number): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(apiUrls.merchants.get(id));
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Get merchant by public ID
   */
  async getMerchantByPublicId(publicId: number): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(`${apiUrls.merchants.list}?publicId=${publicId}`);
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Get merchant detail with full data (subscriptions, outlets, users, etc.)
   */
  async getMerchantDetail(publicId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.merchants.get(publicId));
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Create new merchant
   */
  async createMerchant(merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(apiUrls.merchants.create, {
      method: 'POST',
      body: JSON.stringify(merchantData),
    });
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Register new merchant (public endpoint)
   */
  async register(data: {
    merchantName: string;
    merchantEmail: string;
    merchantPhone: string;
    merchantDescription: string;
    userEmail: string;
    userPassword: string;
    userFirstName: string;
    userLastName: string;
    userPhone: string;
    outletName: string;
    outletAddress: string;
    outletDescription: string;
  }): Promise<ApiResponse<{ merchant: Merchant; user: any }>> {
    const response = await fetch(apiUrls.merchants.register, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<{ merchant: Merchant; user: any }>(response);
  },

  /**
   * Update merchant
   */
  async updateMerchant(id: number, merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>> {
    const response = await authenticatedFetch(apiUrls.merchants.update(id), {
      method: 'PUT',
      body: JSON.stringify(merchantData),
    });
    const result = await parseApiResponse<Merchant>(response);
    return result;
  },

  /**
   * Delete merchant
   */
  async deleteMerchant(id: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.merchants.delete(id), {
      method: 'DELETE',
    });
    const result = await parseApiResponse<void>(response);
    return result;
  },

  /**
   * Get merchant statistics
   */
  async getMerchantStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.merchants.list}/stats`);
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
    const response = await authenticatedFetch(apiUrls.merchants.updatePlan(merchantId), {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Get merchant plan history
   */
  async getMerchantPlanHistory(merchantId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.merchants.getPlan(merchantId));
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Disable merchant plan
   */
  async disableMerchantPlan(merchantId: number, subscriptionId: number, reason: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.merchants.extendPlan(merchantId), {
      method: 'PATCH',
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
    const response = await authenticatedFetch(apiUrls.merchants.cancelPlan(merchantId), {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'delete',
        subscriptionId,
        reason
      }),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  },

  // ============================================================================
  // MERCHANT-SPECIFIC ENDPOINTS
  // ============================================================================

  /**
   * Merchant Products
   */
  products: {
    list: async (merchantId: number) => {
      return authenticatedFetch(apiUrls.merchants.products.list(merchantId));
    },

    get: async (merchantId: number, productId: number) => {
      return authenticatedFetch(apiUrls.merchants.products.get(merchantId, productId));
    },

    create: async (merchantId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.products.create(merchantId), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (merchantId: number, productId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.products.update(merchantId, productId), {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (merchantId: number, productId: number) => {
      return authenticatedFetch(apiUrls.merchants.products.delete(merchantId, productId), {
        method: 'DELETE'
      });
    }
  },

  /**
   * Merchant Orders
   */
  orders: {
    list: async (merchantId: number, queryParams?: string) => {
      const url = queryParams 
        ? `${apiUrls.merchants.orders.list(merchantId)}?${queryParams}`
        : apiUrls.merchants.orders.list(merchantId);
      return authenticatedFetch(url);
    },

    get: async (merchantId: number, orderId: number) => {
      return authenticatedFetch(apiUrls.merchants.orders.get(merchantId, orderId));
    },

    create: async (merchantId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.orders.create(merchantId), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (merchantId: number, orderId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.orders.update(merchantId, orderId), {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (merchantId: number, orderId: number) => {
      return authenticatedFetch(apiUrls.merchants.orders.delete(merchantId, orderId), {
        method: 'DELETE'
      });
    }
  },

  /**
   * Merchant Users
   */
  users: {
    list: async (merchantId: number) => {
      return authenticatedFetch(apiUrls.merchants.users.list(merchantId));
    },

    get: async (merchantId: number, userId: number) => {
      return authenticatedFetch(apiUrls.merchants.users.get(merchantId, userId));
    },

    create: async (merchantId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.users.create(merchantId), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (merchantId: number, userId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.users.update(merchantId, userId), {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (merchantId: number, userId: number) => {
      return authenticatedFetch(apiUrls.merchants.users.delete(merchantId, userId), {
        method: 'DELETE'
      });
    }
  },

  /**
   * Merchant Outlets
   */
  outlets: {
    list: async (merchantId: number, queryParams?: string) => {
      const url = queryParams 
        ? `${apiUrls.merchants.outlets.list(merchantId)}?${queryParams}`
        : apiUrls.merchants.outlets.list(merchantId);
      return authenticatedFetch(url);
    },

    get: async (merchantId: number, outletId: number) => {
      return authenticatedFetch(apiUrls.merchants.outlets.get(merchantId, outletId));
    },

    create: async (merchantId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.outlets.create(merchantId), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (merchantId: number, outletId: number, data: any) => {
      return authenticatedFetch(apiUrls.merchants.outlets.update(merchantId, outletId), {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (merchantId: number, outletId: number) => {
      return authenticatedFetch(apiUrls.merchants.outlets.delete(merchantId, outletId), {
        method: 'DELETE'
      });
    }
  }
};
