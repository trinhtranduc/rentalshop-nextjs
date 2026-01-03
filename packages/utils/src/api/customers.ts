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
      limit: limit.toString(),
      _t: Date.now().toString() // Cache-busting parameter
    });
    
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse<CustomerListResponse>(response);
    return result; // Return the ApiResponse directly - let consumers use type guards
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
    return result; // Return the ApiResponse directly - let consumers use type guards
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
    params.append('_t', Date.now().toString()); // Cache-busting parameter

    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse<CustomerSearchResponse>(response);
    return result; // Return the ApiResponse directly - let consumers use type guards
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: number): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId));
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Get customer by phone number
   * Used for duplicate checking before creating new customer
   */
  async getCustomerByPhone(phone: string): Promise<CustomerApiResponse> {
    const params = new URLSearchParams({
      q: phone,
      limit: '10',
      _t: Date.now().toString() // Cache-busting parameter
    });
    
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Create new customer
   */
  async createCustomer(customerData: CustomerInput): Promise<CustomerApiResponse> {
    // Debug: Log data being sent to API
    console.log('🔍 customersApi.createCustomer - Sending data:', {
      hasMerchantId: 'merchantId' in customerData,
      merchantId: (customerData as any).merchantId,
      customerDataKeys: Object.keys(customerData),
      fullData: customerData
    });
    
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
    const response = await authenticatedFetch(`${apiUrls.customers.list}?id=${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Export customers to Excel or CSV
   */
  async exportCustomers(params: {
    period?: '1month' | '3months' | '6months' | '1year' | 'custom';
    startDate?: string;
    endDate?: string;
    format?: 'excel' | 'csv';
    customerIds?: number[];
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.format) queryParams.append('format', params.format);
    
    // Add customer IDs if provided
    if (params.customerIds && params.customerIds.length > 0) {
      params.customerIds.forEach(id => {
        queryParams.append('customerIds', id.toString());
      });
    }

    const url = `${apiUrls.customers.export}?${queryParams.toString()}`;
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to export customers');
    }
    
    return await response.blob();
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

  /**
   * Bulk import customers
   */
  async bulkImport(customers: CustomerInput[]): Promise<CustomerApiResponse> {
    const response = await authenticatedFetch('/api/customers/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
    return await parseApiResponse<CustomerApiResponse>(response);
  },

  /**
   * Download sample file for import
   */
  async downloadSampleFile(): Promise<Blob> {
    const response = await authenticatedFetch('/api/import/sample/customers');
    
    if (!response.ok) {
      throw new Error('Failed to download sample file');
    }
    
    return await response.blob();
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
    // lastName is optional - only firstName is required
    // email is optional
    // phone is optional - no constraint required
    if (!data.merchantId) errors.push('Merchant ID is required');

    // Email validation (only if provided)
    if (data.email && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation (only if provided)
    if (data.phone && data.phone.trim() && !/^[0-9+\-\s()]+$/.test(data.phone)) {
      errors.push('Phone number contains invalid characters');
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
