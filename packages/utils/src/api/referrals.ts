import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';

// ============================================================================
// TYPES
// ============================================================================

export interface Referral {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  tenantKey: string | null;
  referralCode: string | null;
  referredBy: {
    id: number;
    name: string;
    email: string;
    tenantKey: string | null;
    referralCode: string | null;
  } | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  createdAt: string | null;
  isActive: boolean;
}

export interface ReferralsResponse {
  referrals: Referral[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ReferralFilters {
  merchantId?: number;
  page?: number;
  limit?: number;
}

// ============================================================================
// REFERRALS API CLIENT
// ============================================================================

/**
 * Referrals API client for referral tracking operations
 */
export const referralsApi = {
  /**
   * Get all referrals with optional filters
   */
  async getReferrals(filters?: ReferralFilters): Promise<ApiResponse<ReferralsResponse>> {
    const params = new URLSearchParams();
    
    if (filters?.merchantId) {
      params.append('merchantId', filters.merchantId.toString());
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const url = filters && Object.keys(filters).length > 0
      ? `${apiUrls.referrals.list}?${params.toString()}`
      : apiUrls.referrals.list;

    const response = await authenticatedFetch(url);
    const result = await parseApiResponse<ReferralsResponse>(response);
    return result;
  },

  /**
   * Get referrals by specific merchant ID
   */
  async getReferralsByMerchant(merchantId: number, page: number = 1, limit: number = 20): Promise<ApiResponse<ReferralsResponse>> {
    return this.getReferrals({ merchantId, page, limit });
  },
};

