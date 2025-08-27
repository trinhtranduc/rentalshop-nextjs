import type { CustomerWithMerchant, CustomerInput, CustomerUpdateInput } from '@rentalshop/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CustomerApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CustomerListResponse {
  customers: CustomerWithMerchant[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface CustomerSearchParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  idType?: string;
}

class CustomerApiClient {
  private getAuthToken(): string {
    if (typeof window === 'undefined') {
      throw new Error('Auth token not available in server context');
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    return token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CustomerApiResponse<T>> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `API request failed with status ${response.status}`);
    }

    return result;
  }

  /**
   * Get customers with pagination and filters
   */
  async getCustomers(params: CustomerSearchParams = {}): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params.city) searchParams.append('city', params.city);
    if (params.state) searchParams.append('state', params.state);
    if (params.country) searchParams.append('country', params.country);
    if (params.idType) searchParams.append('idType', params.idType);

    const queryString = searchParams.toString();
    const endpoint = `/api/customers${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.makeRequest<CustomerListResponse>(endpoint);
    return response.data!;
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(customerId: number): Promise<CustomerWithMerchant> {
    const response = await this.makeRequest<CustomerWithMerchant>(
      `/api/customers?customerId=${customerId}`
    );
    return response.data!;
  }

  /**
   * Create a new customer
   */
  async createCustomer(customerData: CustomerInput): Promise<CustomerWithMerchant> {
    const response = await this.makeRequest<CustomerWithMerchant>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return response.data!;
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId: number, customerData: CustomerUpdateInput): Promise<CustomerWithMerchant> {
    const response = await this.makeRequest<CustomerWithMerchant>(`/api/customers?customerId=${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return response.data!;
  }

  /**
   * Delete a customer (soft delete)
   */
  async deleteCustomer(customerId: number): Promise<void> {
    await this.makeRequest(`/api/customers?customerId=${customerId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search customers with advanced filters
   */
  async searchCustomers(query: string, filters: Omit<CustomerSearchParams, 'search'> = {}): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('search', query);
    
    if (filters.page) searchParams.append('page', filters.page.toString());
    if (filters.limit) searchParams.append('limit', filters.limit.toString());
    if (filters.isActive !== undefined) searchParams.append('isActive', filters.isActive.toString());
    if (filters.city) searchParams.append('city', filters.city);
    if (filters.state) searchParams.append('state', filters.state);
    if (filters.country) searchParams.append('country', filters.country);
    if (filters.idType) searchParams.append('idType', filters.idType);

    const endpoint = `/api/customers?${searchParams.toString()}`;
    const response = await this.makeRequest<CustomerListResponse>(endpoint);
    return response.data!;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<any> {
    // This would need to be implemented in the API
    // For now, return mock data
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      inactiveCustomers: 0,
      newCustomersThisMonth: 0,
    };
  }
}

// Export singleton instance
export const customerApi = new CustomerApiClient();

// Export individual functions for convenience
export const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
} = customerApi;
