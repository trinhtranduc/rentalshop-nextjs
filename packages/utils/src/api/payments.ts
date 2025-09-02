import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { SubscriptionPayment, SubscriptionPaymentCreateInput, SubscriptionPaymentUpdateInput } from '@rentalshop/types';

// Local type definitions for API responses
export interface PaymentFilters {
  search?: string;
  status?: string;
  method?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentsResponse {
  payments: SubscriptionPayment[];
  total: number;
  hasMore: boolean;
}

/**
 * Payments API client for subscription payment management operations
 */
export const paymentsApi = {
  /**
   * Get all payments with filtering and pagination
   */
  async getPayments(filters: PaymentFilters = {}): Promise<ApiResponse<PaymentsResponse>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.method) params.append('method', filters.method);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.payments.list}?${queryString}` : apiUrls.payments.list;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<PaymentsResponse>(response);
  },

  /**
   * Get a specific payment by ID
   */
  async getPayment(id: number): Promise<ApiResponse<SubscriptionPayment>> {
    const response = await authenticatedFetch(apiUrls.payments.get(id));
    return await parseApiResponse<SubscriptionPayment>(response);
  },

  /**
   * Create a new payment
   */
  async createPayment(input: SubscriptionPaymentCreateInput): Promise<ApiResponse<SubscriptionPayment>> {
    const response = await authenticatedFetch(apiUrls.payments.create, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<SubscriptionPayment>(response);
  },

  /**
   * Update an existing payment
   */
  async updatePayment(id: number, input: SubscriptionPaymentUpdateInput): Promise<ApiResponse<SubscriptionPayment>> {
    const response = await authenticatedFetch(apiUrls.payments.update(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<SubscriptionPayment>(response);
  },

  /**
   * Delete a payment
   */
  async deletePayment(id: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.payments.delete(id), {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Process payment
   */
  async processPayment(id: number): Promise<ApiResponse<SubscriptionPayment>> {
    const response = await authenticatedFetch(apiUrls.payments.process(id), {
      method: 'POST',
    });
    return await parseApiResponse<SubscriptionPayment>(response);
  },

  /**
   * Refund payment
   */
  async refundPayment(id: number, reason?: string): Promise<ApiResponse<SubscriptionPayment>> {
    const response = await authenticatedFetch(apiUrls.payments.refund(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return await parseApiResponse<SubscriptionPayment>(response);
  },

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.payments.stats);
    return await parseApiResponse<any>(response);
  },

  /**
   * Export payments
   */
  async exportPayments(filters: PaymentFilters = {}): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.method) params.append('method', filters.method);
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.payments.export}?${queryString}` : apiUrls.payments.export;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<{ downloadUrl: string }>(response);
  }
};
