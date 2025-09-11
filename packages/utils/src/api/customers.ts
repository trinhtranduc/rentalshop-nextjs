import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { Customer, CustomerCreateInput, CustomerUpdateInput, CustomerFilters } from '@rentalshop/types';

export interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Customers API client for customer management operations
 */
export const customersApi = {
  /**
   * Get all customers
   */
  async getCustomers(): Promise<ApiResponse<Customer[]>> {
    const response = await authenticatedFetch(apiUrls.customers.list);
    const result = await parseApiResponse<Customer[]>(response);
    return result;
  },

  /**
   * Get customers with pagination
   */
  async getCustomersPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<CustomersResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    return await parseApiResponse<CustomersResponse>(response);
  },

  /**
   * Search customers with filters
   */
  async searchCustomers(filters: CustomerFilters): Promise<ApiResponse<Customer[]>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.phone) params.append('phone', filters.phone);
    if (filters.email) params.append('email', filters.email);
    
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    return await parseApiResponse<Customer[]>(response);
  },

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: number): Promise<ApiResponse<Customer>> {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId));
    return await parseApiResponse<Customer>(response);
  },

  /**
   * Get customer by public ID (number)
   */
  async getCustomerByPublicId(publicId: number): Promise<ApiResponse<Customer>> {
    const response = await authenticatedFetch(apiUrls.customers.update(publicId));
    return await parseApiResponse<Customer>(response);
  },

  /**
   * Create a new customer
   */
  async createCustomer(customerData: CustomerCreateInput): Promise<ApiResponse<Customer>> {
    const response = await authenticatedFetch(apiUrls.customers.create, {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return await parseApiResponse<Customer>(response);
  },

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId: number, customerData: CustomerUpdateInput): Promise<ApiResponse<Customer>> {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId), {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return await parseApiResponse<Customer>(response);
  },

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.customers.delete(customerId), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get customers by outlet
   */
  async getCustomersByOutlet(outletId: number): Promise<ApiResponse<Customer[]>> {
    const response = await authenticatedFetch(`${apiUrls.customers.list}?outletId=${outletId}`);
    return await parseApiResponse<Customer[]>(response);
  },

  /**
   * Get customer by phone number
   */
  async getCustomerByPhone(phone: string): Promise<ApiResponse<Customer | null>> {
    const response = await authenticatedFetch(`${apiUrls.customers.list}?phone=${phone}`);
    return await parseApiResponse<Customer | null>(response);
  },

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<ApiResponse<Customer | null>> {
    const response = await authenticatedFetch(`${apiUrls.customers.list}?email=${email}`);
    return await parseApiResponse<Customer | null>(response);
  },

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.customers.stats);
    return await parseApiResponse<any>(response);
  }
};
