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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.revenue}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.orders}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.topProducts}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.topCustomers}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.inventory}?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.dashboard);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get system analytics (admin only)
   */
  async getSystemAnalytics(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.system);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get income analytics
   */
  async getIncomeAnalytics(filters: AnalyticsFilters = {}): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.analytics.income}?${queryString}` : apiUrls.analytics.income;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get order analytics summary
   */
  async getOrderAnalyticsSummary(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.orders);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get top products
   */
  async getTopProducts(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.topProducts);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get top customers
   */
  async getTopCustomers(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.topCustomers);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get recent orders
   */
  async getRecentOrders(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.analytics.recentOrders);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.outletPerformance}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.seasonalTrends}?${params.toString()}`);
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
    
    const response = await authenticatedFetch(`${apiUrls.analytics.export}?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get today's operational metrics
   */
  async getTodayMetrics(): Promise<ApiResponse<{
    todayPickups: number;
    todayReturns: number;
    overdueItems: number;
    productUtilization: number;
  }>> {
    const response = await authenticatedFetch(apiUrls.analytics.todayMetrics);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(): Promise<ApiResponse<{
    customerGrowth: number;
    revenueGrowth: number;
    customerBase: number;
  }>> {
    const response = await authenticatedFetch(apiUrls.analytics.growthMetrics);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get enhanced dashboard summary with all metrics
   */
  async getEnhancedDashboardSummary(): Promise<ApiResponse<{
    totalRevenue: number;
    totalOrders: number;
    futureIncome: number;
    todayPickups: number;
    todayReturns: number;
    overdueItems: number;
    productUtilization: number;
    customerGrowth: number;
    revenueGrowth: number;
    customerBase: number;
  }>> {
    const response = await authenticatedFetch(apiUrls.analytics.enhancedDashboard);
    return await parseApiResponse<any>(response);
  }
};
