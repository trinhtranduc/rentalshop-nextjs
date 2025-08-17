import type { 
  CustomerInput, 
  CustomerUpdateInput, 
  CustomerFilters, 
  CustomerSearchFilter 
} from '@rentalshop/database';

// ============================================================================
// CUSTOMER API CLIENT
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

export class CustomerApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<CustomerApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          message: data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        message: 'Request failed'
      };
    }
  }

  // ============================================================================
  // CUSTOMER CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new customer
   */
  async createCustomer(customerData: CustomerInput): Promise<CustomerApiResponse<any>> {
    return this.request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  /**
   * Get customers with filtering and pagination
   */
  async getCustomers(
    filters: CustomerFilters = {}, 
    page = 1, 
    limit = 20
  ): Promise<CustomerApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams();
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.country) params.append('country', filters.country);
    if (filters.idType) params.append('idType', filters.idType);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request(`/api/customers?${params.toString()}`);
  }

  /**
   * Search customers with advanced filters
   */
  async searchCustomers(filters: CustomerSearchFilter): Promise<CustomerApiResponse<CustomerSearchResponse>> {
    const params = new URLSearchParams();
    
    if (filters.q) params.append('q', filters.q);
    if (filters.merchantId) params.append('merchantId', filters.merchantId);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.country) params.append('country', filters.country);
    if (filters.idType) params.append('idType', filters.idType);
    
    params.append('limit', (filters.limit || 20).toString());
    params.append('offset', (filters.offset || 0).toString());

    return this.request(`/api/customers?${params.toString()}`);
  }

  /**
   * Get a specific customer by ID
   */
  async getCustomerById(customerId: string): Promise<CustomerApiResponse<any>> {
    return this.request(`/api/customers?customerId=${customerId}`);
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string, 
    updateData: CustomerUpdateInput
  ): Promise<CustomerApiResponse<any>> {
    return this.request(`/api/customers?customerId=${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Delete a customer (soft delete)
   */
  async deleteCustomer(customerId: string): Promise<CustomerApiResponse<void>> {
    return this.request(`/api/customers?customerId=${customerId}`, {
      method: 'DELETE'
    });
  }

  // ============================================================================
  // TESTING AND DEBUG ENDPOINTS
  // ============================================================================

  /**
   * Test customer creation payload validation
   */
  async testCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse<any>> {
    return this.request('/api/customers/test', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  /**
   * Debug customer creation payload
   */
  async debugCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse<any>> {
    return this.request('/api/customers/debug', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

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
    if (!data.merchantId?.trim()) errors.push('Merchant ID is required');

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
  }

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
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createCustomerApiClient(baseUrl: string, token: string): CustomerApiClient {
  return new CustomerApiClient(baseUrl, token);
}

// ============================================================================
// DEFAULT INSTANCE (for direct usage)
// ============================================================================

export const customerApiClient = {
  create: (baseUrl: string, token: string) => createCustomerApiClient(baseUrl, token),
  
  // Helper methods for common operations
  async createCustomer(baseUrl: string, token: string, data: CustomerInput) {
    const client = createCustomerApiClient(baseUrl, token);
    return client.createCustomer(data);
  },
  
  async getCustomers(baseUrl: string, token: string, filters?: CustomerFilters, page = 1, limit = 20) {
    const client = createCustomerApiClient(baseUrl, token);
    return client.getCustomers(filters, page, limit);
  },
  
  async searchCustomers(baseUrl: string, token: string, filters: CustomerSearchFilter) {
    const client = createCustomerApiClient(baseUrl, token);
    return client.searchCustomers(filters);
  }
};
