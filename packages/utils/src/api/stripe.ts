import { authenticatedFetch, parseApiResponse } from '../core';
import { buildApiUrl } from '../config/api';
import type { ApiResponse } from '../core';

export interface CreateCheckoutSessionInput {
  planId: number;
  successUrl: string;
  cancelUrl: string;
  // Admin-only override (optional)
  merchantId?: number;
}

export interface CreateBillingPortalInput {
  returnUrl: string;
  // Admin-only override (optional)
  merchantId?: number;
}

export const stripeApi = {
  async createCheckoutSession(
    data: CreateCheckoutSessionInput
  ): Promise<ApiResponse<{ id: string; url: string | null }>> {
    const response = await authenticatedFetch(buildApiUrl('api/stripe/checkout-session'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse(response);
  },

  async createBillingPortal(
    data: CreateBillingPortalInput
  ): Promise<ApiResponse<{ url: string }>> {
    const response = await authenticatedFetch(buildApiUrl('api/stripe/billing-portal'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse(response);
  },
};

