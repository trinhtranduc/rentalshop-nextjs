import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
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
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.customerId) params.append('customerId', filters.customerId.toString());
    if (filters.productId) params.append('productId', filters.productId.toString());
    
    // Handle date fields - OrderFilters uses string dates (ISO format)
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
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
   * Supports both JSON and FormData formats
   * - JSON: For simple order creation without images
   * - FormData: For order creation with image uploads (notesImages, pickupNotesImages, etc.)
   */
  async createOrder(
    orderData: OrderCreateInput,
    files?: {
      notesImages?: File[];
      pickupNotesImages?: File[];
      returnNotesImages?: File[];
      damageNotesImages?: File[];
    }
  ): Promise<ApiResponse<Order>> {
    // If files are provided, use FormData
    if (files && (
      files.notesImages?.length || 
      files.pickupNotesImages?.length || 
      files.returnNotesImages?.length || 
      files.damageNotesImages?.length
    )) {
      const formData = new FormData();
      
      // Add order data as JSON string
      formData.append('data', JSON.stringify(orderData));
      
      // Add files if provided
      if (files.notesImages) {
        files.notesImages.forEach(file => {
          formData.append('notesImages', file);
        });
      }
      if (files.pickupNotesImages) {
        files.pickupNotesImages.forEach(file => {
          formData.append('pickupNotesImages', file);
        });
      }
      if (files.returnNotesImages) {
        files.returnNotesImages.forEach(file => {
          formData.append('returnNotesImages', file);
        });
      }
      if (files.damageNotesImages) {
        files.damageNotesImages.forEach(file => {
          formData.append('damageNotesImages', file);
        });
      }

      // Send multipart request
      const response = await authenticatedFetch(apiUrls.orders.create, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header for FormData - browser will set it with boundary
      });
      
      return await parseApiResponse<Order>(response);
    } else {
      // Use JSON for simple order creation
      const response = await authenticatedFetch(apiUrls.orders.create, {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      return await parseApiResponse<Order>(response);
    }
  },

  /**
   * Update an existing order
   * Supports both JSON and FormData formats
   * - JSON: For simple updates without images
   * - FormData: For updates with image uploads (notesImages, pickupNotesImages, etc.)
   */
  async updateOrder(
    orderId: number, 
    orderData: OrderUpdateInput, 
    files?: {
      notesImages?: File[];
      pickupNotesImages?: File[];
      returnNotesImages?: File[];
      damageNotesImages?: File[];
    }
  ): Promise<ApiResponse<Order>> {
    // If files are provided, use FormData
    if (files && (
      files.notesImages?.length || 
      files.pickupNotesImages?.length || 
      files.returnNotesImages?.length || 
      files.damageNotesImages?.length
    )) {
      const formData = new FormData();
      
      // Add order data as JSON string
      formData.append('data', JSON.stringify(orderData));
      
      // Add files if provided
      if (files.notesImages) {
        files.notesImages.forEach(file => {
          formData.append('notesImages', file);
        });
      }
      if (files.pickupNotesImages) {
        files.pickupNotesImages.forEach(file => {
          formData.append('pickupNotesImages', file);
        });
      }
      if (files.returnNotesImages) {
        files.returnNotesImages.forEach(file => {
          formData.append('returnNotesImages', file);
        });
      }
      if (files.damageNotesImages) {
        files.damageNotesImages.forEach(file => {
          formData.append('damageNotesImages', file);
        });
      }

      // Send multipart request
      const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
        method: 'PUT',
        body: formData,
        // Don't set Content-Type header for FormData - browser will set it with boundary
      });
      
      return await parseApiResponse<Order>(response);
    } else {
      // Use JSON for simple updates
      const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
        method: 'PUT',
        body: JSON.stringify(orderData),
      });
      return await parseApiResponse<Order>(response);
    }
  },

  /**
   * Export orders to Excel or CSV
   */
  async exportOrders(params: {
    period?: '1month' | '3months' | '6months' | '1year' | 'custom';
    startDate?: string;
    endDate?: string;
    format?: 'excel' | 'csv';
    dateField?: 'createdAt' | 'pickupPlanAt' | 'returnPlanAt';
    status?: string;
    orderType?: string;
    orderIds?: number[]; // Export specific orders by IDs
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.format) queryParams.append('format', params.format || 'excel');
    if (params.dateField) queryParams.append('dateField', params.dateField);
    if (params.status) queryParams.append('status', params.status);
    if (params.orderType) queryParams.append('orderType', params.orderType);
    
    // Add orderIds to query params if provided
    if (params.orderIds && params.orderIds.length > 0) {
      params.orderIds.forEach(id => queryParams.append('orderIds', id.toString()));
    }

    const url = `${apiUrls.orders.export}?${queryParams.toString()}`;
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to export orders');
    }
    
    return await response.blob();
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
   * Get orders by customer with pagination support
   * Uses dedicated endpoint: /api/customers/[id]/orders
   */
  async getOrdersByCustomer(
    customerId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Use dedicated endpoint for customer orders (better for role-based filtering)
    const base = apiUrls.base || '';
    const response = await authenticatedFetch(`${base}/api/customers/${customerId}/orders?${params.toString()}`);
    return await parseApiResponse<OrdersResponse>(response);
  },

  /**
   * Get orders by outlet
   */
  async getOrdersByOutlet(outletId: number): Promise<ApiResponse<Order[]>> {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?outletId=${outletId}`);
    return await parseApiResponse<Order[]>(response);
  },

  /**
   * Get orders by product ID with pagination support
   */
  async getOrdersByProduct(
    productId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<OrdersResponse>> {
    const params = new URLSearchParams({
      productId: productId.toString(),
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.orders.list}?${params.toString()}`);
    return await parseApiResponse<OrdersResponse>(response);
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
   * Update order settings (damage fee, security deposit, collateral, notes, notes images)
   */
  async updateOrderSettings(orderId: number, settings: {
    damageFee?: number;
    securityDeposit?: number;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
    notesImages?: string[];
    pickupNotes?: string;
    pickupNotesImages?: string[];
    returnNotes?: string;
    returnNotesImages?: string[];
    damageNotes?: string;
    damageNotesImages?: string[];
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

  /**
   * Batch delete CANCELLED orders
   * Only ADMIN, MERCHANT, and OUTLET_ADMIN can delete orders
   * OUTLET_STAFF cannot delete orders
   */
  async batchDeleteOrders(orderIds: number[]): Promise<ApiResponse<{
    deleted: number;
    total: number;
    deletedOrders: Array<{ id: number; orderNumber: string }>;
  }>> {
    const response = await authenticatedFetch(apiUrls.orders.batchDelete, {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    });
    return await parseApiResponse<{
      deleted: number;
      total: number;
      deletedOrders: Array<{ id: number; orderNumber: string }>;
    }>(response);
  },
};
