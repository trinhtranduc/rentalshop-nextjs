import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { 
  Subscription, 
  SubscriptionFilters, 
  SubscriptionsResponse, 
  SubscriptionCreateInput, 
  SubscriptionUpdateInput 
} from '@rentalshop/types';

/**
 * Subscriptions API client for subscription management operations
 */
export const subscriptionsApi = {
  /**
   * Get all subscriptions
   */
  async getSubscriptions(): Promise<ApiResponse<Subscription[]>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.list);
    const result = await parseApiResponse<Subscription[]>(response);
    return result;
  },

  /**
   * Get subscriptions with pagination
   */
  async getSubscriptionsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<SubscriptionsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
    return await parseApiResponse<SubscriptionsResponse>(response);
  },

  /**
   * Search subscriptions with filters
   */
  async search(filters: SubscriptionFilters = {}): Promise<ApiResponse<Subscription[]>> {
    const params = new URLSearchParams();
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.planId) params.append('planId', filters.planId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) {
      const startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      params.append('startDate', startDate);
    }
    if (filters.endDate) {
      const endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      params.append('endDate', endDate);
    }
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
    return await parseApiResponse<Subscription[]>(response);
  },

  /**
   * Get subscription by ID
   */
  async getById(id: number): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.get(id));
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Create new subscription
   */
  async create(data: SubscriptionCreateInput): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Update subscription
   */
  async update(id: number, data: SubscriptionUpdateInput): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.update(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Cancel subscription (soft delete)
   */
  async cancel(id: number, reason: string): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Change subscription plan
   */
  async changePlan(id: number, newPlanId: number): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/change-plan`, {
      method: 'PATCH',
      body: JSON.stringify({ newPlanId }),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Extend subscription
   */
  async extend(id: number, data: {
    newEndDate: Date | string;
    amount: number;
    method: string;
    description?: string;
  }): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.extend(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Get subscription status for current user
   */
  async getCurrentUserSubscriptionStatus(): Promise<ApiResponse<{
    hasSubscription: boolean;
    status?: string;
    subscription?: any;
    isExpired?: boolean;
    isExpiringSoon?: boolean;
    daysUntilExpiry?: number;
    message?: string;
  }>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.status);
    return await parseApiResponse(response);
  },

  /**
   * Get subscription status by merchant ID
   */
  async getSubscriptionStatus(merchantId: number): Promise<ApiResponse<{
    status: string;
    planName: string;
    endDate?: Date | string;
    nextBillingDate?: Date | string;
    amount: number;
    currency: string;
    autoRenew: boolean;
  }>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.status}?merchantId=${merchantId}`);
    return await parseApiResponse(response);
  },

  /**
   * Get subscriptions by merchant
   */
  async getSubscriptionsByMerchant(merchantId: number): Promise<ApiResponse<Subscription[]>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?merchantId=${merchantId}`);
    return await parseApiResponse<Subscription[]>(response);
  },

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.stats);
    return await parseApiResponse<any>(response);
  },

  /**
   * Pause/Suspend subscription
   */
  async suspend(id: number, data: { reason?: string } = {}): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/pause`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Resume subscription
   */
  async resume(id: number, data: { reason?: string } = {}): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/resume`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  }
};
