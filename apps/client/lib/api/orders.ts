import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Orders API Client - Order Management Operations
 * 
 * This file handles all order operations:
 * - Fetching orders with filters
 * - Calendar-specific order queries
 * - Order status management
 * - Order details and history
 */

export interface OrdersResponse {
  orders: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  orderType?: string;
  status?: string | string[];
  outletId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Orders API client for authenticated order operations
 */
export const ordersApi = {
  /**
   * Get orders with optional filters and pagination
   */
  async getOrders(filters?: OrderFilters): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Handle array values (like status)
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    console.log('🔍 getOrders called with filters:', filters);
    console.log('📡 API endpoint:', `/api/orders?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/orders?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get orders for calendar view (monthly pickup/return data)
   */
  async getCalendarOrders(filters: {
    startDate: string;
    endDate: string;
    orderType?: string;
    status?: string | string[];
    limit?: number;
  }): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    
    // Optional parameters
    if (filters.orderType) params.append('orderType', filters.orderType);
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    // Handle status array
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }

    console.log('📅 getCalendarOrders called with filters:', filters);
    console.log('📡 API endpoint:', `/api/orders?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/orders?${params.toString()}`);
    console.log('📡 Raw calendar API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed calendar API response:', result);
    
    return result;
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/orders/${orderId}`);
    return handleApiResponse(response);
  },

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/orders/by-number/${orderNumber}`);
    return handleApiResponse(response);
  },

  /**
   * Get order statistics
   */
  async getOrderStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/orders/stats');
    return handleApiResponse(response);
  }
};
