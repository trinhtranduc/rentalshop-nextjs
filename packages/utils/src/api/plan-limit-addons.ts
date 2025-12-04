// ============================================================================
// PLAN LIMIT ADDONS API CLIENT
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { 
  PlanLimitAddon, 
  PlanLimitAddonCreateInput, 
  PlanLimitAddonUpdateInput 
} from '@rentalshop/types';
import type { PlanLimitAddonsQuery } from '../core/validation';

export interface PlanLimitAddonsResponse {
  addons: PlanLimitAddon[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Plan Limit Addons API client for managing plan limit addons
 */
export const planLimitAddonsApi = {
  /**
   * Get all plan limit addons
   */
  async getPlanLimitAddons(filters?: PlanLimitAddonsQuery): Promise<ApiResponse<PlanLimitAddonsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const url = `${apiUrls.planLimitAddons.list}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    const result = await parseApiResponse<PlanLimitAddonsResponse>(response);
    return result;
  },

  /**
   * Get plan limit addons for a specific merchant
   */
  async getMerchantPlanLimitAddons(
    merchantId: number,
    filters?: Omit<PlanLimitAddonsQuery, 'merchantId'>
  ): Promise<ApiResponse<PlanLimitAddonsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const url = `${apiUrls.planLimitAddons.getByMerchant(merchantId)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    const result = await parseApiResponse<PlanLimitAddonsResponse>(response);
    return result;
  },

  /**
   * Get a specific plan limit addon by ID
   */
  async getPlanLimitAddon(id: number): Promise<ApiResponse<PlanLimitAddon>> {
    const response = await authenticatedFetch(apiUrls.planLimitAddons.get(id));
    const result = await parseApiResponse<PlanLimitAddon>(response);
    return result;
  },

  /**
   * Create a new plan limit addon
   */
  async createPlanLimitAddon(data: PlanLimitAddonCreateInput): Promise<ApiResponse<PlanLimitAddon>> {
    const response = await authenticatedFetch(apiUrls.planLimitAddons.create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await parseApiResponse<PlanLimitAddon>(response);
    return result;
  },

  /**
   * Create a plan limit addon for a specific merchant
   */
  async createMerchantPlanLimitAddon(
    merchantId: number,
    data: Omit<PlanLimitAddonCreateInput, 'merchantId'>
  ): Promise<ApiResponse<PlanLimitAddon>> {
    const response = await authenticatedFetch(apiUrls.planLimitAddons.createByMerchant(merchantId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        merchantId,
      }),
    });
    const result = await parseApiResponse<PlanLimitAddon>(response);
    return result;
  },

  /**
   * Update a plan limit addon
   */
  async updatePlanLimitAddon(
    id: number,
    data: PlanLimitAddonUpdateInput
  ): Promise<ApiResponse<PlanLimitAddon>> {
    const response = await authenticatedFetch(apiUrls.planLimitAddons.update(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await parseApiResponse<PlanLimitAddon>(response);
    return result;
  },

  /**
   * Delete a plan limit addon
   */
  async deletePlanLimitAddon(id: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.planLimitAddons.delete(id), {
      method: 'DELETE',
    });
    const result = await parseApiResponse<void>(response);
    return result;
  },
};

