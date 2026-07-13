import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type {
  LoyaltyAdjustInput,
  LoyaltyCalculateEarnInput,
  LoyaltyCustomerSummary,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyTransaction,
  LoyaltyValidateRedeemInput,
} from '@rentalshop/types';

export const loyaltyApi = {
  async getProgram() {
    const response = await authenticatedFetch(apiUrls.loyalty.program);
    return parseApiResponse<LoyaltyProgram | null>(response);
  },

  async upsertProgram(data: Partial<LoyaltyProgram> & { name: string }) {
    const response = await authenticatedFetch(apiUrls.loyalty.program, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return parseApiResponse<LoyaltyProgram>(response);
  },

  async getTiers() {
    const response = await authenticatedFetch(apiUrls.loyalty.tiers);
    return parseApiResponse<LoyaltyTier[]>(response);
  },

  async createTier(data: Omit<LoyaltyTier, 'id' | 'programId' | 'createdAt' | 'updatedAt'>) {
    const response = await authenticatedFetch(apiUrls.loyalty.tiers, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseApiResponse<LoyaltyTier>(response);
  },

  async updateTier(id: number, data: Partial<LoyaltyTier>) {
    const response = await authenticatedFetch(apiUrls.loyalty.tier(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return parseApiResponse<LoyaltyTier>(response);
  },

  async deleteTier(id: number) {
    const response = await authenticatedFetch(apiUrls.loyalty.tier(id), {
      method: 'DELETE',
    });
    return parseApiResponse<{ deletedTierId: number; customersReassigned: number; newTierId: number }>(response);
  },

  async getCustomerSummary(customerId: number) {
    const response = await authenticatedFetch(apiUrls.loyalty.customerSummary(customerId));
    return parseApiResponse<LoyaltyCustomerSummary>(response);
  },

  async getCustomerTransactions(
    customerId: number,
    params: { page?: number; limit?: number; type?: string } = {}
  ) {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.type) search.set('type', params.type);

    const query = search.toString();
    const url = query
      ? `${apiUrls.loyalty.customerTransactions(customerId)}?${query}`
      : apiUrls.loyalty.customerTransactions(customerId);

    const response = await authenticatedFetch(url);
    return parseApiResponse<{
      transactions: LoyaltyTransaction[];
      total: number;
      page: number;
      limit: number;
    }>(response);
  },

  async validateRedeem(data: LoyaltyValidateRedeemInput) {
    const response = await authenticatedFetch(apiUrls.loyalty.validateRedeem, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  async calculateEarn(data: LoyaltyCalculateEarnInput) {
    const response = await authenticatedFetch(apiUrls.loyalty.calculateEarn, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  async adjustPoints(data: LoyaltyAdjustInput) {
    const response = await authenticatedFetch(apiUrls.loyalty.adjust, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  async syncHistory() {
    const response = await authenticatedFetch(apiUrls.loyalty.syncHistory, {
      method: 'POST',
    });
    return parseApiResponse<{ customersProcessed: number; totalPointsIssued: number }>(response);
  },
};
