// ============================================================================
// PLANS API CLIENT
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { Plan, PlanCreateInput, PlanUpdateInput, PlanFilters } from '@rentalshop/types';

/**
 * Public fetch function for unauthenticated requests
 */
const publicFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const defaultOptions: RequestInit = {
    method: 'GET',
    headers,
    ...options,
  };

  return await fetch(url, defaultOptions);
};

export interface PlansResponse {
  plans: Plan[];
  total: number;
  hasMore: boolean;
}

export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
}

/**
 * Plans API client for plan management operations
 */
export const plansApi = {
  /**
   * Get all plans with filters and pagination
   */
  async getPlans(filters: PlanFilters & { includeInactive?: boolean } = {}): Promise<ApiResponse<PlansResponse>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.isPopular !== undefined) params.append('isPopular', filters.isPopular.toString());
    if (filters.includeInactive) params.append('includeInactive', 'true');
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.plans.list}?${queryString}` : apiUrls.plans.list;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<PlansResponse>(response);
  },

  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId: number): Promise<ApiResponse<Plan>> {
    const response = await authenticatedFetch(apiUrls.plans.get(planId));
    return await parseApiResponse<Plan>(response);
  },

  /**
   * Create a new plan
   */
  async createPlan(planData: PlanCreateInput): Promise<ApiResponse<Plan>> {
    const response = await authenticatedFetch(apiUrls.plans.create, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    return await parseApiResponse<Plan>(response);
  },

  /**
   * Update an existing plan
   */
  async updatePlan(planId: number, planData: PlanUpdateInput): Promise<ApiResponse<Plan>> {
    const response = await authenticatedFetch(apiUrls.plans.update(planId), {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
    return await parseApiResponse<Plan>(response);
  },

  /**
   * Delete a plan (soft delete)
   */
  async deletePlan(planId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.plans.delete(planId), {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get plan statistics
   */
  async getPlanStats(): Promise<ApiResponse<PlanStats>> {
    const response = await authenticatedFetch(apiUrls.plans.stats);
    return await parseApiResponse<PlanStats>(response);
  },

  /**
   * Get public plans (for display to users)
   */
  async getPublicPlans(): Promise<ApiResponse<Plan[]>> {
    const response = await authenticatedFetch(apiUrls.plans.public);
    return await parseApiResponse<Plan[]>(response);
  }
};

/**
 * Public plans API client (no authentication required)
 */
export const publicPlansApi = {
  /**
   * Get public plans with variants (no authentication required)
   */
  async getPublicPlansWithVariants(): Promise<ApiResponse<Plan[]>> {
    const response = await publicFetch(apiUrls.plans.public);
    return await parseApiResponse<Plan[]>(response);
  }
};
