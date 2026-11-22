import { authenticatedFetch, parseApiResponse } from '../core';
import { buildApiUrl } from '../config/api';
import type { ApiResponse } from '../core';

/** #1631 what the web may buy through Polar (`GET /api/polar/offers`) */
export type PolarCheckoutDecision = 'ok' | 'SUBSCRIPTION_RENEWS_IN_STORE' | 'POLAR_MANAGE_IN_PORTAL' | 'PLAN_NOT_PURCHASABLE';

export interface PolarOffer {
  planId: number;
  tier: 'basic' | 'professional';
  interval: 'semi_annual' | 'annual';
  months: 6 | 12;
  amount: number;
  currency: string;
  decision: PolarCheckoutDecision;
}

export interface PolarOffersResponse {
  /** false: Polar is not configured; the web keeps its old flow */
  enabled: boolean;
  offers: PolarOffer[];
  /** the shop pays through Polar: "Quản lý / huỷ gói" opens Polar's portal */
  manage: boolean;
  channel: string;
  autoRenew: boolean;
}

export const polarApi = {
  async getOffers(): Promise<ApiResponse<PolarOffersResponse>> {
    const response = await authenticatedFetch(buildApiUrl('api/polar/offers'), { method: 'GET' });
    return await parseApiResponse<PolarOffersResponse>(response);
  },

  async createCheckout(data: {
    planId: number;
    interval: 'semi_annual' | 'annual';
    successUrl: string;
    returnUrl?: string;
  }): Promise<ApiResponse<{ url: string }>> {
    const response = await authenticatedFetch(buildApiUrl('api/polar/checkout'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<{ url: string }>(response);
  },

  async createPortal(data: { returnUrl?: string } = {}): Promise<ApiResponse<{ url: string }>> {
    const response = await authenticatedFetch(buildApiUrl('api/polar/portal'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<{ url: string }>(response);
  },
};
