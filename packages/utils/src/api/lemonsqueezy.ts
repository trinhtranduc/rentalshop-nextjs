import { authenticatedFetch, parseApiResponse } from '../core';
import { buildApiUrl } from '../config/api';
import type { ApiResponse } from '../core';

export interface LemonSqueezyCheckoutResponse {
  url: string;
}

export const lemonsqueezyApi = {
  async createSubscriptionCheckout(data: {
    planId: number;
    billingInterval?: string;
    successUrl: string;
    cancelUrl?: string;
    merchantId?: number;
  }): Promise<ApiResponse<LemonSqueezyCheckoutResponse>> {
    const response = await authenticatedFetch(buildApiUrl('api/lemonsqueezy/subscription-checkout'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<LemonSqueezyCheckoutResponse>(response);
  },
};

