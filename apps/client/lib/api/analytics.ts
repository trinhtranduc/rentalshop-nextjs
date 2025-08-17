import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Analytics API Client - Analytics and Reporting Operations
 * 
 * This file handles all analytics operations:
 * - Dashboard statistics
 * - Sales and revenue analytics
 * - Order analytics
 * - Customer analytics
 * - Product analytics
 */

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface RevenueAnalytics {
  period: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface OrderAnalytics {
  period: string;
  orders: number;
  revenue: number;
  status: string;
}

export interface CustomerAnalytics {
  period: string;
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
}

export interface ProductAnalytics {
  period: string;
  productId: string;
  productName: string;
  orders: number;
  revenue: number;
  popularity: number;
}

/**
 * Analytics API client for authenticated analytics operations
 */
export const analyticsApi = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(filters?: {
    startDate?: string;
    endDate?: string;
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<DashboardStats>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('📊 getDashboardStats called with filters:', filters);
    console.log('📡 API endpoint:', `/api/analytics/dashboard?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/analytics/dashboard?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(filters: {
    startDate: string;
    endDate: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<RevenueAnalytics[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/revenue?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get order analytics
   */
  async getOrderAnalytics(filters: {
    startDate: string;
    endDate: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    status?: string;
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<OrderAnalytics[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/orders?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(filters: {
    startDate: string;
    endDate: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<CustomerAnalytics[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/customers?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get top products analytics
   */
  async getTopProducts(filters: {
    startDate: string;
    endDate: string;
    limit?: number;
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<ProductAnalytics[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/top-products?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get top customers analytics
   */
  async getTopCustomers(filters: {
    startDate: string;
    endDate: string;
    limit?: number;
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/top-customers?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get recent orders analytics
   */
  async getRecentOrders(filters: {
    limit?: number;
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/analytics/recent-orders?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get income analytics
   */
  async getIncomeAnalytics(filters: {
    startDate: string;
    endDate: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    outletId?: string;
    shopId?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await authenticatedFetch(`/api/analytics/income?${params.toString()}`);
    return handleApiResponse(response);
  }
};
