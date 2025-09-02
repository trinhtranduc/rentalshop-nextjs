// ============================================================================
// BILLING CYCLES API CLIENT
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../common';
import { apiUrls } from '../config/api';

// ============================================================================
// BILLING CYCLE TYPES
// ============================================================================

export interface BillingCycle {
  id: number;
  name: string;
  value: string;
  months: number;
  discount: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCycleCreateInput {
  name: string;
  value: string;
  months: number;
  discount?: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BillingCycleUpdateInput {
  name?: string;
  value?: string;
  months?: number;
  discount?: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BillingCycleFilters {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'value' | 'months' | 'discount' | 'sortOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BillingCyclesResponse {
  billingCycles: BillingCycle[];
  total: number;
  hasMore: boolean;
}

/**
 * Billing Cycles API client for billing cycle management operations
 */
export const billingCyclesApi = {
  /**
   * Get all billing cycles with filtering and pagination
   */
  async getBillingCycles(filters: BillingCycleFilters = {}): Promise<ApiResponse<BillingCyclesResponse>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.billingCycles.list}?${queryString}` : apiUrls.billingCycles.list;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<BillingCyclesResponse>(response);
  },

  /**
   * Get a specific billing cycle by ID
   */
  async getBillingCycle(id: number): Promise<ApiResponse<BillingCycle>> {
    const response = await authenticatedFetch(apiUrls.billingCycles.get(id));
    return await parseApiResponse<BillingCycle>(response);
  },

  /**
   * Create a new billing cycle
   */
  async createBillingCycle(input: BillingCycleCreateInput): Promise<ApiResponse<BillingCycle>> {
    const response = await authenticatedFetch(apiUrls.billingCycles.create, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<BillingCycle>(response);
  },

  /**
   * Update an existing billing cycle
   */
  async updateBillingCycle(id: number, input: BillingCycleUpdateInput): Promise<ApiResponse<BillingCycle>> {
    const response = await authenticatedFetch(apiUrls.billingCycles.update(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<BillingCycle>(response);
  },

  /**
   * Delete a billing cycle
   */
  async deleteBillingCycle(id: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.billingCycles.delete(id), {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get active billing cycles (for dropdowns and forms)
   */
  async getActiveBillingCycles(): Promise<ApiResponse<BillingCycle[]>> {
    const response = await this.getBillingCycles({ 
      isActive: true, 
      sortBy: 'sortOrder', 
      sortOrder: 'asc' 
    });
    
    return {
      success: response.success,
      data: response.data?.billingCycles || [],
      message: response.message
    };
  },

  /**
   * Get billing cycle by value (for internal use)
   */
  async getBillingCycleByValue(value: string): Promise<ApiResponse<BillingCycle>> {
    const response = await this.getBillingCycles({ 
      search: value,
      isActive: true 
    });
    
    const cycle = response.data?.billingCycles.find(c => c.value === value);
    
    if (!cycle) {
      throw new Error(`Billing cycle with value '${value}' not found`);
    }

    return {
      success: true,
      data: cycle,
      message: 'Billing cycle found'
    };
  }
};
