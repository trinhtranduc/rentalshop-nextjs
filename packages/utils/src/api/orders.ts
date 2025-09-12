import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { Order, OrderCreateInput, OrderUpdateInput, OrderFilters } from '@rentalshop/types';

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  totalPages: number;
}

/**
 * Orders API client for order management operations
 */
export const ordersApi = {
  /**
   * Get all orders
   */
  async getOrders(): Promise<ApiResponse<Order[]>> {
    const response = await authenticatedFetch(apiUrls.orders.list);
    const result = await parseApiResponse<Order[]>(response);
    return result;
  },

  /**
   * Get orders with pagination
   */
  async getOrdersPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.orders.list}?${params.toString()}`);
    return await parseApiResponse<OrdersResponse>(response);
  },

  /**
   * Search orders with filters
   */
  async searchOrders(filters: OrderFilters): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('q', filters.search);
    if (filters.status) {
      // Handle both single status and array of statuses
      if (Array.isArray(filters.status)) {
        filters.status.forEach(status => params.append('status', status));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.customerId) params.append('customerId', filters.customerId.toString());
    if (filters.productId) params.append('productId', filters.productId.toString());
    
    // Handle date fields - convert to ISO string if it's a Date object
    if (filters.startDate) {
      const startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      params.append('startDate', startDate);
    }
    if (filters.endDate) {
      const endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      params.append('endDate', endDate);
    }
    
    if (filters.orderType) params.append('orderType', filters.orderType);
    
    // Add pagination parameters
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.page) params.append('page', filters.page.toString());
    
    // Add sorting parameters
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const response = await authenticatedFetch(`${apiUrls.orders.list}?${params.toString()}`);
    return await parseApiResponse<OrdersResponse>(response);
  },

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.update(orderId));
    return await parseApiResponse<Order>(response);
  },

  /**
   * Get order by order number (e.g., "ORD-2110")
   */
  async getOrderByNumber(orderNumber: string): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.getByNumber(orderNumber));
    return await parseApiResponse<Order>(response);
  },

  /**
   * Create a new order
   */
  async createOrder(orderData: OrderCreateInput): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.create, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return await parseApiResponse<Order>(response);
  },

  /**
   * Update an existing order
   */
  async updateOrder(orderId: number, orderData: OrderUpdateInput): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
    return await parseApiResponse<Order>(response);
  },

  /**
   * Delete an order
   */
  async deleteOrder(orderId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.orders.delete(orderId), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(customerId: number): Promise<ApiResponse<Order[]>> {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?customerId=${customerId}`);
    return await parseApiResponse<Order[]>(response);
  },

  /**
   * Get orders by outlet
   */
  async getOrdersByOutlet(outletId: number): Promise<ApiResponse<Order[]>> {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?outletId=${outletId}`);
    return await parseApiResponse<Order[]>(response);
  },

  /**
   * Get orders by product ID
   */
  async getOrdersByProduct(productId: number): Promise<ApiResponse<Order[]>> {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?productId=${productId}`);
    return await parseApiResponse<Order[]>(response);
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.updateStatus(orderId), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return await parseApiResponse<Order>(response);
  },

  /**
   * Pickup order (change status to PICKUPED)
   */
  async pickupOrder(orderId: number): Promise<ApiResponse<Order>> {
    return this.updateOrderStatus(orderId, 'PICKUPED');
  },

  /**
   * Return order (change status to RETURNED)
   */
  async returnOrder(orderId: number): Promise<ApiResponse<Order>> {
    return this.updateOrderStatus(orderId, 'RETURNED');
  },

  /**
   * Cancel order (change status to CANCELLED)
   */
  async cancelOrder(orderId: number): Promise<ApiResponse<Order>> {
    return this.updateOrderStatus(orderId, 'CANCELLED');
  },

  /**
   * Update order settings (damage fee, security deposit, collateral, notes)
   */
  async updateOrderSettings(orderId: number, settings: {
    damageFee?: number;
    securityDeposit?: number;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
  }): Promise<ApiResponse<Order>> {
    const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return await parseApiResponse<Order>(response);
  },

  /**
   * Get order statistics
   */
  async getOrderStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.orders.stats);
    return await parseApiResponse<any>(response);
  },
};
