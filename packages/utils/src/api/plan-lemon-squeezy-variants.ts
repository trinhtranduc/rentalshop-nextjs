import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { PlanBillingInterval } from './plan-stripe-prices';

export interface PlanLemonSqueezyVariantItem {
  billingInterval: PlanBillingInterval;
  lemonVariantId: string;
  lemonStoreId?: string | null;
  currency?: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface PlanLemonSqueezyVariantsResponse {
  planId: number;
  items: PlanLemonSqueezyVariantItem[];
}

export const planLemonSqueezyVariantsApi = {
  async get(planId: number): Promise<ApiResponse<PlanLemonSqueezyVariantsResponse>> {
    const response = await authenticatedFetch(apiUrls.plans.lemonSqueezyVariants(planId));
    return await parseApiResponse<PlanLemonSqueezyVariantsResponse>(response);
  },

  async upsert(
    planId: number,
    data: {
      currency?: string;
      storeId?: string;
      variants: Partial<Record<PlanBillingInterval, string>>;
    }
  ): Promise<ApiResponse<PlanLemonSqueezyVariantsResponse>> {
    const response = await authenticatedFetch(apiUrls.plans.lemonSqueezyVariants(planId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<PlanLemonSqueezyVariantsResponse>(response);
  },
};

