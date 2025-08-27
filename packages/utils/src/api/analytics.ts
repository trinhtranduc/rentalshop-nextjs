import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  outletId?: number;
  merchantId?: number;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface ProductAnalytics {
  productId: number;
  productName: string;
  totalRentals: number;
  totalRevenue: number;
  averageRentalDuration: number;
  popularity: number;
}

export interface CustomerAnalytics {
  customerId: number;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
}

/**
 * Analytics API client for business intelligence and reporting
 */
export const analyticsApi = {
  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<RevenueData[]>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/revenue?${params.toString()}`);
    return await parseApiResponse<RevenueData[]>(response);
  },

  /**
   * Get order analytics
   */
  async getOrderAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/orders?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get product analytics
   */
  async getProductAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<ProductAnalytics[]>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/products?${params.toString()}`);
    return await parseApiResponse<ProductAnalytics[]>(response);
  },

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<CustomerAnalytics[]>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/customers?${params.toString()}`);
    return await parseApiResponse<CustomerAnalytics[]>(response);
  },

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/inventory?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/dashboard`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get outlet performance comparison
   */
  async getOutletPerformance(filters: AnalyticsFilters): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/outlet-performance?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get seasonal trends
   */
  async getSeasonalTrends(filters: AnalyticsFilters): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/seasonal-trends?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Export analytics data
   */
  async exportAnalytics(filters: AnalyticsFilters, format: 'csv' | 'excel' = 'csv'): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    params.append('format', format);
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/analytics/export?${params.toString()}`);
    return await parseApiResponse<any>(response);
  }
};
