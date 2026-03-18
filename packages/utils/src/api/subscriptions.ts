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
  async search(filters: SubscriptionFilters = {}): Promise<ApiResponse<SubscriptionsResponse>> {
    const params = new URLSearchParams();
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.planId) params.append('planId', filters.planId.toString());
    if (filters.status) params.append('status', filters.status);
    // Handle date fields - convert Date objects to ISO string, use strings as-is
    if (filters.startDate) {
      const startDate = typeof filters.startDate === 'object' && filters.startDate instanceof Date 
        ? filters.startDate.toISOString() 
        : filters.startDate;
      params.append('startDate', String(startDate));
    }
    if (filters.endDate) {
      const endDate = typeof filters.endDate === 'object' && filters.endDate instanceof Date 
        ? filters.endDate.toISOString() 
        : filters.endDate;
      params.append('endDate', String(endDate));
    }
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.search) params.append('q', filters.search);

    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
    return await parseApiResponse<SubscriptionsResponse>(response);
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
  async changePlan(
    id: number,
    newPlanId: number,
    options?: {
      billingInterval?: string;
      startDate?: string | Date;
      reason?: string;
      sendEmail?: boolean;
      customPrice?: number;
    }
  ): Promise<ApiResponse<Subscription>> {
    const payload: any = { newPlanId };

    if (options?.billingInterval) payload.billingInterval = options.billingInterval;
    if (options?.startDate) {
      payload.startDate =
        options.startDate instanceof Date ? options.startDate.toISOString() : options.startDate;
    }
    if (options?.reason) payload.reason = options.reason;
    if (typeof options?.sendEmail === 'boolean') payload.sendEmail = options.sendEmail;
    if (typeof options?.customPrice === 'number') payload.customPrice = options.customPrice;

    const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/change-plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Calculate extension price for a subscription
   */
  async calculateExtensionPrice(
    id: number,
    newEndDate: Date | string
  ): Promise<ApiResponse<{
    subscriptionId: number;
    planId: number;
    planName: string;
    billingInterval: string;
    oldEndDate: string;
    newEndDate: string;
    extensionDays: number;
    monthlyPrice: number;
    dailyPrice: number;
    extensionPrice: number;
    currency: string;
    addons: {
      count: number;
      items: Array<{
        id: number;
        outlets: number;
        users: number;
        products: number;
        customers: number;
        orders: number;
        notes?: string;
        isActive: boolean;
      }>;
      totalLimits: {
        outlets: number;
        users: number;
        products: number;
        customers: number;
        orders: number;
      };
    };
  }>> {
    const dateStr = typeof newEndDate === 'string' 
      ? newEndDate 
      : newEndDate.toISOString().split('T')[0];
    
    const url = `${apiUrls.subscriptions.calculateExtension(id)}?newEndDate=${encodeURIComponent(dateStr)}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },

  /**
   * Extend subscription
   */
  async extend(id: number, data: {
    newEndDate: Date | string;
    amount?: number; // Optional: will be auto-calculated if not provided
    method: string;
    description?: string;
    sendEmail?: boolean; // Optional: default true
  }): Promise<ApiResponse<Subscription>> {
    const response = await authenticatedFetch(apiUrls.subscriptions.extend(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Subscription>(response);
  },

  /**
   * Get subscription status for current user
   * Returns computed subscription status with single source of truth
   */
  async getCurrentUserSubscriptionStatus(): Promise<ApiResponse<{
    // Merchant info
    merchantId: number;
    merchantName: string;
    merchantEmail: string;
    
    // Computed status (single source of truth)
    status: 'CANCELED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED' | 'TRIAL' | 'ACTIVE' | 'UNKNOWN';
    statusReason: string;
    hasAccess: boolean;
    daysRemaining: number | null;
    isExpiringSoon: boolean;
    
    // Database status (for reference)
    dbStatus: string;
    
    // Subscription details
    subscriptionId: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialStart: string | null;
    trialEnd: string | null;
    
    // Plan info
    planId: number | null;
    planName: string;
    planDescription: string;
    planPrice: number;
    planCurrency: string;
    planTrialDays: number;
    
    // Billing info
    billingAmount: number;
    billingCurrency: string;
    billingInterval: string;
    billingIntervalCount: number;
    
    // Cancellation info
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    cancelReason: string | null;
    
    // Limits & usage
    limits: Record<string, number>;
    usage: {
      outlets: number;
      users: number;
      products: number;
      customers: number;
    };
    
    // Features
    features: string[];
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
  },

  /**
   * Get subscription activities
   */
  async getActivities(id: number, limit: number = 20): Promise<ApiResponse<any[]>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/activities?limit=${limit}`);
    return await parseApiResponse<any[]>(response);
  },

  /**
   * Get subscription payments
   */
  async getPayments(id: number, limit: number = 20): Promise<ApiResponse<any[]>> {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/payments?limit=${limit}`);
    return await parseApiResponse<any[]>(response);
  }
};
