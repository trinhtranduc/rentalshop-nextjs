import { authenticatedFetch, parseApiResponse, apiUrls } from '../index';
import type { ApiResponse } from '../index';

// ============================================================================
// TYPES
// ============================================================================

export interface Subscription {
  id: number;
  merchantId: number;
  planId: number;
  planVariantId?: number;
  status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  startDate: Date | string;
  endDate?: Date | string;
  trialEndDate?: Date | string;
  nextBillingDate?: Date | string;
  amount: number;
  currency: string;
  autoRenew: boolean;
  cancelledAt?: Date | string;
  cancellationReason?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  plan?: {
    id: number;
    name: string;
    basePrice: number;
    currency: string;
  };
  planVariant?: {
    id: number;
    name: string;
    duration: number;
    price: number;
    discount: number;
    savings: number;
  };
  merchant?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface SubscriptionFilters {
  merchantId?: number;
  planId?: number;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}

// The actual API response structure
export interface SubscriptionsResponse {
  data: Subscription[];
  pagination: {
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
  };
}

export interface SubscriptionCreateInput {
  merchantId: number;
  planId: number;
  planVariantId?: number;
  status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  startDate: Date | string;
  endDate?: Date | string;
  trialEndDate?: Date | string;
  nextBillingDate?: Date | string;
  amount: number;
  currency: string;
  autoRenew: boolean;
  cancellationReason?: string;
}

export interface SubscriptionUpdateInput extends Partial<SubscriptionCreateInput> {
  id: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Search subscriptions with filters
 */
export async function searchSubscriptions(filters: SubscriptionFilters = {}): Promise<ApiResponse<SubscriptionsResponse>> {
  const params = new URLSearchParams();
  
  if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
  if (filters.planId) params.append('planId', filters.planId.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate.toString());
  if (filters.endDate) params.append('endDate', filters.endDate.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
  return parseApiResponse<SubscriptionsResponse>(response);
}

/**
 * Get subscription by ID
 */
export async function getSubscription(id: number): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(apiUrls.subscriptions.get(id));
  return parseApiResponse<Subscription>(response);
}

/**
 * Create new subscription
 */
export async function createSubscription(data: SubscriptionCreateInput): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(apiUrls.subscriptions.create, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Update subscription
 */
export async function updateSubscription(id: number, data: SubscriptionUpdateInput): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(apiUrls.subscriptions.update(id), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Cancel subscription (soft delete)
 */
export async function cancelSubscription(id: number, reason: string): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(apiUrls.subscriptions.delete(id), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Suspend subscription
 */
export async function suspendSubscription(id: number, reason: string): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/suspend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(id: number): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/reactivate`, {
    method: 'PATCH',
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Change subscription plan
 */
export async function changeSubscriptionPlan(id: number, newPlanId: number): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/change-plan`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newPlanId }),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Extend subscription
 */
export async function extendSubscription(id: number, data: {
  newEndDate: Date | string;
  amount: number;
  method: string;
  description?: string;
}): Promise<ApiResponse<Subscription>> {
  const response = await authenticatedFetch(apiUrls.subscriptions.extend(id), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return parseApiResponse<Subscription>(response);
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(merchantId: number): Promise<ApiResponse<{
  status: string;
  planName: string;
  endDate?: Date | string;
  trialEndDate?: Date | string;
  nextBillingDate?: Date | string;
  amount: number;
  currency: string;
  autoRenew: boolean;
}>> {
  const response = await authenticatedFetch(`${apiUrls.subscriptions.status}?merchantId=${merchantId}`);
  return parseApiResponse(response);
}
