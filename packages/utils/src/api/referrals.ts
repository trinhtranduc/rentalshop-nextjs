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

export interface AffiliateStat {
  referrer: {
    id: number;
    name: string;
    email: string;
    tenantKey: string | null;
    isActive: boolean;
    createdAt: Date | string;
  } | null;
  referralCount: number;
  referredMerchantIds: number[];
}

export interface AffiliateStatsResponse {
  stats: AffiliateStat[];
  totalReferrers: number;
  totalReferrals: number;
}

export interface ReferredMerchant {
  id: number;
  name: string;
  email: string;
  tenantKey: string | null;
  isActive: boolean;
  createdAt: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
}

export interface ReferredMerchantsResponse {
  referredMerchants: ReferredMerchant[];
  total: number;
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

  /**
   * Get affiliate statistics - merchants who referred others
   */
  async getAffiliateStats(): Promise<ApiResponse<AffiliateStatsResponse>> {
    const response = await authenticatedFetch(apiUrls.affiliate.stats);
    const result = await parseApiResponse<AffiliateStatsResponse>(response);
    return result;
  },

  /**
   * Get list of merchants referred by a specific merchant
   */
  async getReferredMerchants(referrerId: number): Promise<ApiResponse<ReferredMerchantsResponse>> {
    const url = `${apiUrls.affiliate.referredMerchants}?referrerId=${referrerId}`;
    const response = await authenticatedFetch(url);
    const result = await parseApiResponse<ReferredMerchantsResponse>(response);
    return result;
  },
};

