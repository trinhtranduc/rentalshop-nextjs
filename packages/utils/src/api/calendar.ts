import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

// Types for calendar API
export interface CalendarOrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  // Flattened product data
  productId?: number;
  productName?: string;
  productBarcode?: string;
  productImages?: string[] | string | null; // Can be array, JSON string, or null
  productRentPrice?: number;
  productDeposit?: number;
}

export interface CalendarOrderSummary {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  status: string;
  outletName?: string;
  notes?: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  isOverdue?: boolean;
  duration?: number;
  // Product summary for calendar display
  productName?: string;
  productCount?: number;
  // Order items with product details
  orderItems: CalendarOrderItem[];
}

export interface DayOrders {
  pickups: CalendarOrderSummary[];
  total: number;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD format
  orders: CalendarOrderSummary[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalPickups: number;
    totalReturns: number;
    averageOrderValue: number;
  };
}

export interface CalendarResponse {
  calendar: CalendarDay[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalPickups: number;
    totalReturns: number;
    averageOrderValue: number;
  };
}

export interface CalendarMeta {
  totalDays: number;
  stats: {
    totalPickups: number;
    totalOrders: number;
    totalRevenue: number;
    totalReturns: number;
    averageOrderValue: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

export interface CalendarApiResponse {
  success: boolean;
  data?: CalendarResponse;
  meta?: CalendarMeta;
  code?: string; // API response code
  message?: string;
}

export interface CalendarQuery {
  startDate: string; // ISO date format (YYYY-MM-DD)
  endDate: string;   // ISO date format (YYYY-MM-DD)
  outletId?: number;
  merchantId?: number;
  status?: string;
  orderType?: string;
  limit?: number;
}

/**
 * 🎯 Calendar API Client
 * 
 * Specialized API for calendar display
 * - Optimized for monthly calendar views
 * - Groups orders by date
 * - Limits orders per day for performance
 */
export const calendarApi = {
  /**
   * Get calendar orders for a specific date range
   * 
   * @param query - Calendar query parameters
   * @returns Promise with calendar data grouped by date
   */
  async getCalendarOrders(query: CalendarQuery): Promise<CalendarApiResponse> {
    const searchParams = new URLSearchParams({
      startDate: query.startDate,
      endDate: query.endDate,
      ...(query.outletId && { outletId: query.outletId.toString() }),
      ...(query.merchantId && { merchantId: query.merchantId.toString() }),
      ...(query.status && { status: query.status }),
      ...(query.orderType && { orderType: query.orderType }),
      ...(query.limit && { limit: query.limit.toString() })
    });

    const response = await authenticatedFetch(`${apiUrls.calendar.orders}?${searchParams}`);
    const result = await parseApiResponse<CalendarResponse>(response);
    
    // parseApiResponse unwraps the data, so result.data is CalendarResponse
    const defaultMeta: CalendarMeta = {
      totalDays: 0,
      stats: { 
        totalPickups: 0, 
        totalOrders: 0, 
        totalRevenue: 0, 
        totalReturns: 0, 
        averageOrderValue: 0 
      },
      dateRange: { start: query.startDate, end: query.endDate }
    };

    if (result.success && result.data) {
      return {
        success: true,
        data: result.data,
        meta: defaultMeta,
        code: 'CALENDAR_DATA_SUCCESS',
        message: 'Calendar data loaded'
      };
    }
    
    // Fallback structure if backend returns different format
    return {
      success: false,
      data: { calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } },
      meta: defaultMeta,
      message: result.message || 'Failed to load calendar data'
    };
  },

  /**
   * Get calendar orders for current month
   */
  async getCurrentMonthOrders(outletId?: number): Promise<CalendarApiResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.getCalendarOrders({
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      outletId,
      limit: 4
    });
  },

  /**
   * Get calendar orders for next month
   */
  async getNextMonthOrders(outletId?: number): Promise<CalendarApiResponse> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    const endOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    
    return this.getCalendarOrders({
      startDate: startOfNextMonth.toISOString().split('T')[0],
      endDate: endOfNextMonth.toISOString().split('T')[0],
      outletId,
      limit: 4
    });
  },

  /**
   * Get calendar orders for previous month
   */
  async getPreviousMonthOrders(outletId?: number): Promise<CalendarApiResponse> {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const endOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    
    return this.getCalendarOrders({
      startDate: startOfPrevMonth.toISOString().split('T')[0],
      endDate: endOfPrevMonth.toISOString().split('T')[0],
      outletId,
      limit: 4
    });
  },

  /**
   * Get calendar orders for a specific month
   * @param year - Year (e.g., 2025)
   * @param month - Month (1-12)
   * @param outletId - Optional outlet filter
   */
  async getMonthOrders(year: number, month: number, outletId?: number): Promise<CalendarApiResponse> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    return this.getCalendarOrders({
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      outletId,
      limit: 4
    });
  },

  /**
   * Get calendar orders for a custom date range
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param outletId - Optional outlet filter
   * @param options - Additional options
   */
  async getDateRangeOrders(
    startDate: string, 
    endDate: string, 
    outletId?: number,
    options?: {
      merchantId?: number;
      status?: string;
      orderType?: string;
      limit?: number;
    }
  ): Promise<CalendarApiResponse> {
    return this.getCalendarOrders({
      startDate,
      endDate,
      outletId,
      ...options
    });
  }
};

export default calendarApi;
