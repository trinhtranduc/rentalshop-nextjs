'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { Calendars, PageWrapper, Breadcrumb, Button, PageLoadingIndicator } from '@rentalshop/ui';
import { X } from 'lucide-react';
import { useAuth, useCommonTranslations, useCalendarTranslations, useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';
import { getUTCDateKey, getLocalDateKey, formatCurrencyAdvanced, formatPhoneNumberMasked } from '@rentalshop/utils';
import { calendarApi, type CalendarResponse, type DayOrders, type CalendarOrderSummary, type CalendarMeta } from "@rentalshop/utils";
import { ORDER_STATUS } from '@rentalshop/constants';
import type { PickupOrder } from '@rentalshop/ui';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const authenticated = !!user;
  const t = useCommonTranslations();
  const tcal = useCalendarTranslations();
  const to = useOrderTranslations();
  const locale = useNextIntlLocale() as 'en' | 'vi' | 'zh' | 'ko' | 'ja';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarResponse>({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
  const [calendarMeta, setCalendarMeta] = useState<CalendarMeta | null>(null);
  // Initialize to current month
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 🎯 NEW: State for orders count by date and status
  const [ordersCountByDate, setOrdersCountByDate] = useState<Map<string, Map<string, number>>>(new Map());
  const [selectedStatus, setSelectedStatus] = useState<string>(ORDER_STATUS.RESERVED); // Default to RESERVED
  const [loadingCounts, setLoadingCounts] = useState(false);
  
  // Handle month change from Calendars component
  // Use useRef to prevent unnecessary updates
  const handleMonthChange = useCallback((date: Date) => {
    setCurrentDate(prev => {
      // Only update if month/year actually changed
      if (prev.getMonth() !== date.getMonth() || prev.getFullYear() !== date.getFullYear()) {
        return date;
      }
      return prev;
    });
  }, []);
  
  // 🎯 NEW: State for daily order details modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyOrders, setDailyOrders] = useState<(CalendarOrderSummary & { type: 'pickup' | 'return' })[]>([]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [loadingDailyOrders, setLoadingDailyOrders] = useState(false);

  // Track previous month to avoid unnecessary fetches
  const prevMonthRef = useRef<{ year: number; month: number } | null>(null);
  const prevUserIdRef = useRef<number | null>(null);
  
  // 🎯 NEW: Fetch orders count for each day in the month
  const fetchOrdersCountByDate = useCallback(async () => {
    if (!authenticated || !user) return;
    
    try {
      setLoadingCounts(true);
      
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);
      
      // Format dates as YYYY-MM-DD
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Get all dates in the month
      const dates: string[] = [];
      const tempDate = new Date(startOfMonth);
      while (tempDate <= endOfMonth) {
        dates.push(formatDateForAPI(new Date(tempDate)));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Fetch counts for all statuses for each date
      const statuses = [ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED];
      const countMap = new Map<string, Map<string, number>>();
      
      // Fetch counts in parallel for better performance
      // Use getOrdersByDate to get count for each date and status
      const countPromises = dates.flatMap(date => 
        statuses.map(async (status) => {
          try {
            const byDateResult = await calendarApi.getOrdersByDate(date, {
              status,
              outletId: user?.outletId,
              limit: 1000 // Get all to count
            });
            
            if (!countMap.has(date)) {
              countMap.set(date, new Map());
            }
            const dateMap = countMap.get(date)!;
            dateMap.set(status, byDateResult.data?.orders.length || 0);
          } catch (error) {
            console.error(`Error fetching count for ${date} ${status}:`, error);
            if (!countMap.has(date)) {
              countMap.set(date, new Map());
            }
            const dateMap = countMap.get(date)!;
            dateMap.set(status, 0);
          }
        })
      );
      
      await Promise.all(countPromises);
      
      setOrdersCountByDate(countMap);
      console.log('📊 Orders count by date loaded:', countMap);
    } catch (error) {
      console.error('Error fetching orders count by date:', error);
    } finally {
      setLoadingCounts(false);
    }
  }, [authenticated, user, currentDate]);

  // 🎯 NEW: Fetch calendar data using specialized calendar API
  const fetchCalendarData = useCallback(async () => {
    if (!authenticated) {
      // Don't show error for unauthenticated users - just show empty calendar
      setCalendarData({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
      const currentYear = currentDate.getFullYear();
      
      console.log('📅 Calendar API Loading:', { 
        currentMonth, 
        currentYear,
        strategy: 'calendar-specialized-api',
        reason: 'Optimized for calendar display with date grouping'
      });
      console.log('📅 User info:', { 
        userId: user?.id, 
        userRole: user?.role, 
        userMerchantId: user?.merchantId,
        userOutletId: user?.outletId 
      });
      
      // 🎯 NEW: Use specialized calendar API with startDate and endDate
      // Use UTC date format (YYYY-MM-DD) to match backend API validation
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);
      
      // Format dates as YYYY-MM-DD for API (not YYYY/MM/DD from getUTCDateKey)
      const formatDateForAPI = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const result = await calendarApi.getCalendarOrders({
        startDate: formatDateForAPI(startOfMonth),
        endDate: formatDateForAPI(endOfMonth),
        outletId: user?.outletId,
        limit: 4 // Max 4 orders per day
      });
      
      console.log('📅 Calendar API response:', result);
      
      if (result.success && result.data) {
        console.log('📅 Calendar data received:', result.data);
        console.log('📅 Days with orders:', result.data.calendar.length);
        
        setCalendarData(result.data);
        setCalendarMeta(result.meta || null);
        
        if (result.data.calendar.length === 0) {
          console.log('📅 No orders found for the month');
        }
      } else {
        console.error('❌ Failed to fetch calendar data:', result.message);
        setError(result.message || 'Failed to fetch calendar data');
        setCalendarData({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
        setCalendarMeta(null);
      }
    } catch (error) {
      console.error('💥 Error fetching calendar data:', error);
      setError('An error occurred while fetching calendar data');
      setCalendarData({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
      setCalendarMeta(null);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  // Fetch calendar data when component mounts or when month/user actually changes
  useEffect(() => {
    if (!authenticated) {
      setCalendarData({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
      setLoading(false);
      return;
    }

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentUserId = user?.id || null;
    
    const prevMonth = prevMonthRef.current;
    const prevUserId = prevUserIdRef.current;

    // Only fetch if month/year or user actually changed
    const monthChanged = !prevMonth || prevMonth.year !== currentYear || prevMonth.month !== currentMonth;
    const userChanged = prevUserId !== currentUserId;

    if (monthChanged || userChanged) {
      prevMonthRef.current = { year: currentYear, month: currentMonth };
      prevUserIdRef.current = currentUserId;
      
      // Call fetchCalendarData directly (don't include in dependencies to avoid loops)
      fetchCalendarData();
      // 🎯 NEW: Also fetch orders count by date
      fetchOrdersCountByDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, currentDate, user?.id]);

  // Handle retry with better error handling
  const handleRetry = useCallback(() => {
    setError(null);
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Convert calendar data to the format expected by Calendars component
  const pickupOrders: PickupOrder[] = React.useMemo(() => {
    console.log('📅 Transforming calendar data:', { 
      calendarDays: calendarData.calendar.length,
      totalOrders: calendarData.summary.totalOrders
    });
    
    const orders: PickupOrder[] = [];
    
    // Flatten calendar data into pickup orders format
    for (const dayData of calendarData.calendar) {
      const date = new Date(dayData.date);
      
      // Add pickup orders
      dayData.orders.forEach((order: CalendarOrderSummary) => {
        orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          productName: order.productName || 'Unknown Product',
          productCount: order.productCount || 1,
          totalAmount: order.totalAmount,
          // Keep original field names for CalendarGrid compatibility
          pickupDate: new Date(order.pickupPlanAt || dayData.date),
          returnDate: new Date(order.returnPlanAt || dayData.date),
          status: order.status,
          outletName: order.outletName,
          notes: order.notes || '',
          isOverdue: order.status === ORDER_STATUS.PICKUPED && order.returnPlanAt ? new Date(order.returnPlanAt) < new Date() : false,
          duration: order.pickupPlanAt && order.returnPlanAt ? 
            Math.ceil((new Date(order.returnPlanAt).getTime() - new Date(order.pickupPlanAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          // Keep original fields for CalendarGrid to match dates correctly
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          pickedUpAt: (order as any).pickedUpAt // Include if available
        } as any);
      });
      
      // Only process pickup orders - no return orders needed
    }
    
    console.log('📅 Final pickupOrders:', {
      ordersCount: orders.length
    });
    
    return orders;
  }, [calendarData]);

  // 🎯 NEW: Handle date click to show daily orders - using new API
  const handleDateClick = useCallback(async (date: Date) => {
    console.log('📅 Date clicked:', date);
    
    if (!authenticated || !user) return;
    
    try {
      setLoadingDailyOrders(true);
      setSelectedDate(date);
      setShowDailyModal(true);
      
      // Format date as YYYY-MM-DD
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const dateStr = formatDateForAPI(date);
      
      // 🎯 NEW: Fetch orders by date and status using new API
      const result = await calendarApi.getOrdersByDate(dateStr, {
        status: selectedStatus,
        outletId: user?.outletId,
        limit: 100 // Get up to 100 orders
      });
      
      console.log('📅 Orders by date API response:', result);
      
      if (result.success && result.data) {
        const orders = result.data.orders.map(order => ({
          ...order,
          type: (order.status === ORDER_STATUS.RESERVED || order.status === ORDER_STATUS.PICKUPED) 
            ? 'pickup' as const 
            : 'return' as const
        }));
        
        setDailyOrders(orders);
        console.log('📅 Orders loaded for date:', {
          date: dateStr,
          status: selectedStatus,
          count: orders.length
        });
      } else {
        console.error('❌ Failed to fetch orders by date:', result.message);
        setDailyOrders([]);
      }
    } catch (error) {
      console.error('💥 Error fetching orders by date:', error);
      setDailyOrders([]);
    } finally {
      setLoadingDailyOrders(false);
    }
  }, [authenticated, user, selectedStatus]);

  return (
    <PageWrapper>
      {/* Page Loading Indicator - Floating, non-blocking */}
      <PageLoadingIndicator loading={loading || loadingCounts} />
      <div className="space-y-8">
      {/* 🎯 Status Filter - Hidden for now, default to RESERVED */}
      {/* {authenticated && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              {tcal('labels.filterByStatus') || 'Filter by Status:'}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={ORDER_STATUS.RESERVED}>{to(`status.${ORDER_STATUS.RESERVED}`)}</option>
              <option value={ORDER_STATUS.PICKUPED}>{to(`status.${ORDER_STATUS.PICKUPED}`)}</option>
              <option value={ORDER_STATUS.COMPLETED}>{to(`status.${ORDER_STATUS.COMPLETED}`)}</option>
              <option value={ORDER_STATUS.RETURNED}>{to(`status.${ORDER_STATUS.RETURNED}`)}</option>
              <option value={ORDER_STATUS.CANCELLED}>{to(`status.${ORDER_STATUS.CANCELLED}`)}</option>
            </select>
            {loadingCounts && (
              <span className="text-sm text-gray-500">Loading counts...</span>
            )}
          </div>
        </div>
      )} */}
      
      {/* Calendar Component - Always Visible */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <Calendars
          orders={pickupOrders}
          loading={loading}
          error={authenticated ? error : null} // Only show errors for authenticated users
          authenticated={authenticated}
          initialDate={currentDate} // Sync with page's currentDate state
          onMonthChange={handleMonthChange} // Update page's currentDate when user navigates months
          onDateSelect={handleDateClick} // 🎯 NEW: Use our enhanced date click handler
          onOrderClick={(order) => {
            if (authenticated) {
              console.log('Order clicked:', order);
            } else {
              console.log('Please log in to view order details');
            }
          }}
          onRetry={authenticated ? handleRetry : undefined} // Only show retry for authenticated users
          // Note: ordersCountByDate and selectedStatus will be used in future updates to display counts on calendar
        />
      </div>

      {/* 🎯 NEW: Daily Orders Modal */}
      {showDailyModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {(() => {
                    // Get translation value
                    let ordersForText = tcal('modal.ordersFor');
                    
                    // Map locale to Intl locale string
                    const intlLocaleMap: Record<string, string> = {
                      'vi': 'vi-VN',
                      'en': 'en-US',
                      'zh': 'zh-CN',
                      'ko': 'ko-KR',
                      'ja': 'ja-JP'
                    };
                    const intlLocale = intlLocaleMap[locale] || 'vi-VN';
                    
                    const dateText = selectedDate.toLocaleDateString(intlLocale, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    
                    // Fallback if translation key is not found
                    if (ordersForText === 'modal.ordersFor' || ordersForText === 'calendar.modal.ordersFor') {
                      ordersForText = 'Đơn hàng ngày {date}';
                    }
                    
                    return ordersForText.replace('{date}', dateText);
                  })()}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {dailyOrders.length} {dailyOrders.length === 1 ? tcal('modal.ordersFound') : tcal('modal.ordersFoundPlural')}
                </p>
              </div>
              <Button
                onClick={() => setShowDailyModal(false)}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingDailyOrders ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">{tcal('modal.loading') || 'Loading orders...'}</p>
                </div>
              ) : dailyOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{tcal('modal.noOrders')}</h4>
                  <p className="text-gray-600">{tcal('modal.noPickupReturnOrders')}</p>
                </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.order')}</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.customer')}</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.product')}</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.type')}</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.status')}</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tcal('labels.amount')}</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {dailyOrders.map((order) => (
                           <tr key={order.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="text-sm font-medium text-gray-900">#{order.orderNumber}</div>
                               <div className="text-sm text-gray-500">
                                 {order.pickupPlanAt ? useFormattedFullDate(order.pickupPlanAt) : 'N/A'}
                               </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                               {order.customerPhone && (
                                 <div className="text-sm text-gray-500">{formatPhoneNumberMasked(order.customerPhone)}</div>
                               )}
                             </td>
                             <td className="px-6 py-4">
                               <div className="text-sm font-medium text-gray-900">{order.productName}</div>
                               {(order.productCount && order.productCount > 1) && (
                                 <div className="text-sm text-gray-500">{order.productCount} {tcal('modal.items')}</div>
                               )}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                 order.type === 'pickup' ? 'bg-green-100 text-green-800' :
                                 order.type === 'return' ? 'bg-blue-100 text-blue-800' :
                                 'bg-gray-100 text-gray-800'
                               }`}>
                                 {order.type === 'pickup' ? tcal('labels.pickup') : tcal('labels.return')}
                               </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center gap-2">
                                 <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                   order.status === 'RESERVED' ? 'bg-red-100 text-red-800' :
                                   order.status === ORDER_STATUS.PICKUPED ? 'bg-green-100 text-green-800' :
                                   order.status === 'RETURNED' ? 'bg-blue-100 text-blue-800' :
                                   'bg-gray-100 text-gray-800'
                                 }`}>
                                   {to(`status.${order.status}`)}
                                 </span>
                                 {order.isOverdue && (
                                   <span className="px-2 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-800">
                                     {tcal('labels.overdue')}
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                               {(order.totalAmount && order.totalAmount > 0) && (
                                 <span className="font-semibold">
                                   {formatCurrencyAdvanced(order.totalAmount, { currency: 'VND', showSymbol: true })}
                                 </span>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </PageWrapper>
  );
}