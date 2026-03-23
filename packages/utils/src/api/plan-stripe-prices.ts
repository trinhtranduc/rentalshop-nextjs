import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';

export type PlanBillingInterval = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface PlanStripePriceItem {
  billingInterval: PlanBillingInterval;
  stripePriceId: string;
  currency?: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface PlanStripePricesResponse {
  planId: number;
  items: PlanStripePriceItem[];
}

export const planStripePricesApi = {
  async get(planId: number): Promise<ApiResponse<PlanStripePricesResponse>> {
    const response = await authenticatedFetch(apiUrls.plans.stripePrices(planId));
    return await parseApiResponse<PlanStripePricesResponse>(response);
  },

  async upsert(
    planId: number,
    data: {
      currency?: string;
      prices: Partial<Record<PlanBillingInterval, string>>;
    }
  ): Promise<ApiResponse<PlanStripePricesResponse>> {
    const response = await authenticatedFetch(apiUrls.plans.stripePrices(planId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<PlanStripePricesResponse>(response);
  },
};

