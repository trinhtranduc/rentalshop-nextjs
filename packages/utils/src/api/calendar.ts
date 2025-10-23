import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

// Types for calendar API
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
}

export interface DayOrders {
  pickups: CalendarOrderSummary[];
  total: number;
}

export interface CalendarResponse {
  [dateKey: string]: DayOrders;
}

export interface CalendarMeta {
  month: number;
  year: number;
  totalDays: number;
  stats: {
    totalPickups: number;
    totalOrders: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

export interface CalendarApiResponse {
  success: boolean;
  data: CalendarResponse;
  meta: CalendarMeta;
  message: string;
}

export interface CalendarQuery {
  month: number;
  year: number;
  outletId?: number;
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
   * Get calendar orders for a specific month
   * 
   * @param query - Calendar query parameters
   * @returns Promise with calendar data grouped by date
   */
  async getCalendarOrders(query: CalendarQuery): Promise<CalendarApiResponse> {
    const searchParams = new URLSearchParams({
      month: query.month.toString(),
      year: query.year.toString(),
      ...(query.outletId && { outletId: query.outletId.toString() }),
      ...(query.limit && { limit: query.limit.toString() })
    });

    const response = await authenticatedFetch(`${apiUrls.calendar.orders}?${searchParams}`);
    const result = await parseApiResponse<CalendarApiResponse>(response);
    
    // Return the calendar response data directly
    if (result.success && result.data) {
      return result.data;
    }
    
    // Fallback structure if backend returns different format
    return {
      success: result.success,
      data: {} as CalendarResponse,
      meta: {
        month: query.month,
        year: query.year,
        totalDays: 30,
        stats: { totalPickups: 0, totalOrders: 0 },
        dateRange: { start: '', end: '' }
      },
      message: result.message || 'Calendar data loaded'
    };
  },

  /**
   * Get calendar orders for current month
   */
  async getCurrentMonthOrders(outletId?: number): Promise<CalendarApiResponse> {
    const now = new Date();
    return this.getCalendarOrders({
      month: now.getMonth() + 1, // JavaScript months are 0-based
      year: now.getFullYear(),
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
    return this.getCalendarOrders({
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear(),
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
    return this.getCalendarOrders({
      month: prevMonth.getMonth() + 1,
      year: prevMonth.getFullYear(),
      outletId,
      limit: 4
    });
  }
};

export default calendarApi;
