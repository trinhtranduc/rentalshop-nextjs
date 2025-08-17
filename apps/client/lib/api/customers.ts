import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Customers API Client - Customer Management Operations
 * 
 * This file handles all customer operations:
 * - Fetching customers with filters
 * - Customer CRUD operations
 * - Customer search and history
 * - Customer order tracking
 */

export interface CustomersResponse {
  customers: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface CustomerFilters {
  search?: string;
  outletId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Customers API client for authenticated customer operations
 */
export const customersApi = {
  /**
   * Get all customers with optional filters and pagination
   */
  async getCustomers(filters?: CustomerFilters): Promise<ApiResponse<CustomersResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔍 getCustomers called with filters:', filters);
    console.log('📡 API endpoint:', `/api/customers?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/customers?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/customers/${customerId}`);
    return handleApiResponse(response);
  },

  /**
   * Get customer by phone number
   */
  async getCustomerByPhone(phone: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ phone });
    const response = await authenticatedFetch(`/api/customers?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ email });
    const response = await authenticatedFetch(`/api/customers?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get customer by public ID
   */
  async getCustomerByPublicId(publicId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/customers/${publicId}`);
    return handleApiResponse(response);
  },

  /**
   * Create a new customer
   */
  async createCustomer(customerData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return handleApiResponse(response);
  },

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId: string, customerData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return handleApiResponse(response);
  },

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/customers/${customerId}`, {
      method: 'DELETE',
    });
    return handleApiResponse(response);
  },

  /**
   * Get customer order history
   */
  async getCustomerOrders(customerId: string, filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/customers/${customerId}/orders?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/customers/stats');
    return handleApiResponse(response);
  }
};
