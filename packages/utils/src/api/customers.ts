import type { 
  CustomerInput, 
  CustomerUpdateInput, 
  CustomerFilters, 
  CustomerSearchFilter 
} from '@rentalshop/types';
import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

// ============================================================================
// CUSTOMER API TYPES
// ============================================================================

export interface CustomerApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

export interface CustomerSearchResponse {
  customers: any[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CustomerListResponse {
  customers: any[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// CUSTOMER API (MERGED FUNCTIONALITY)
// ============================================================================

export const customersApi = {
  // ============================================================================
  // CUSTOMER CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all customers
   */
  async getCustomers(): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.list);
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Get customers with pagination
   */
  async getCustomersPaginated(page: number = 1, limit: number = 50): Promise<CustomerApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse<CustomerListResponse>(response);
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  },

  /**
   * Get customers with filtering and pagination
   */
  async getCustomersWithFilters(
    filters: CustomerFilters = {}, 
    page = 1, 
    limit = 20
  ): Promise<CustomerApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams();
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.country) params.append('country', filters.country);
    if (filters.idType) params.append('idType', filters.idType);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse<CustomerListResponse>(response);
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  },

  /**
   * Search customers with advanced filters
   */
  async searchCustomers(filters: CustomerSearchFilter = {}): Promise<CustomerApiResponse<CustomerSearchResponse>> {
    const params = new URLSearchParams();
    
    if (filters.q) params.append('q', filters.q);
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.country) params.append('country', filters.country);
    if (filters.idType) params.append('idType', filters.idType);
    
    params.append('limit', (filters.limit || 20).toString());
    params.append('offset', (filters.offset || 0).toString());

    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse<CustomerSearchResponse>(response);
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: number): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId));
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Create new customer
   */
  async createCustomer(customerData: CustomerInput): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.create, {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Update customer
   */
  async updateCustomer(customerId: number, customerData: CustomerUpdateInput): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId), {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: number): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.delete(customerId), {
      method: 'DELETE',
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  // ============================================================================
  // TESTING AND DEBUG ENDPOINTS
  // ============================================================================

  /**
   * Test customer creation payload validation
   */
  async testCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch('/api/customers/test', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Debug customer creation payload
   */
  async debugCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch('/api/customers/debug', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate customer data before sending to API
   */
  validateCustomerData(data: CustomerInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.firstName?.trim()) errors.push('First name is required');
    if (!data.lastName?.trim()) errors.push('Last name is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!data.phone?.trim()) errors.push('Phone is required');
    if (!data.merchantId) errors.push('Merchant ID is required');

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (data.phone && !/^[0-9+\-\s()]+$/.test(data.phone)) {
      errors.push('Phone number contains invalid characters');
    }

    if (data.phone && data.phone.length < 8) {
      errors.push('Phone number must be at least 8 characters');
    }

    // ID Type validation
    if (data.idType && !['passport', 'drivers_license', 'national_id', 'other'].includes(data.idType)) {
      errors.push('Invalid ID type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Format customer data for API submission
   */
  formatCustomerData(data: CustomerInput): CustomerInput {
    return {
      ...data,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      email: data.email?.toLowerCase().trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      city: data.city?.trim(),
      state: data.state?.trim(),
      zipCode: data.zipCode?.trim(),
      country: data.country?.trim(),
      idNumber: data.idNumber?.trim(),
      notes: data.notes?.trim()
    };
  }
};
