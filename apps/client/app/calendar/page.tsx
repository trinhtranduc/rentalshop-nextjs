'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { Calendars, PageWrapper, Breadcrumb, Button, PageLoadingIndicator, Pagination } from '@rentalshop/ui';
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
  
  // 🎯 State for orders count by date and status
  const [ordersCountByDate, setOrdersCountByDate] = useState<Map<string, number>>(new Map()); // Map<date, count>
  const [selectedStatus, setSelectedStatus] = useState<string>(ORDER_STATUS.RESERVED); // Default to RESERVED
  const [loadingCounts, setLoadingCounts] = useState(false);
  
  // Handle month change from Calendars component
  const handleMonthChange = useCallback((date: Date) => {
    setCurrentDate(prev => {
      // Only update if month/year actually changed
      if (prev.getMonth() !== date.getMonth() || prev.getFullYear() !== date.getFullYear()) {
        // Update URL immediately when month changes
        const newMonth = date.getMonth() + 1;
        const newYear = date.getFullYear();
        const url = new URL(window.location.href);
        // Remove legacy from/to parameters
        url.searchParams.delete('from');
        url.searchParams.delete('to');
        // Set new month/year
        url.searchParams.set('month', newMonth.toString());
        url.searchParams.set('year', newYear.toString());
        window.history.replaceState({}, '', url.toString());
        
        return date;
      }
      return prev;
    });
  }, []);
  
  // 🎯 State for daily order details modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyOrders, setDailyOrders] = useState<(CalendarOrderSummary & { type: 'pickup' | 'return' })[]>([]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [loadingDailyOrders, setLoadingDailyOrders] = useState(false);
  // 🎯 Pagination state for daily orders
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 20;

  // Track previous month to avoid unnecessary fetches
  const prevMonthRef = useRef<{ year: number; month: number } | null>(null);
  const prevUserIdRef = useRef<number | null>(null);

  // 🎯 Fetch orders count for each day in the month by status
  const fetchOrdersCountByDate = useCallback(async () => {
    if (!authenticated || !user) return;
    
    try {
      setLoadingCounts(true);
      
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      const currentYear = currentDate.getFullYear();
      
      // 🎯 Update URL with month/year query params (remove from/to if exists)
      const url = new URL(window.location.href);
      // Remove legacy from/to parameters
      url.searchParams.delete('from');
      url.searchParams.delete('to');
      // Set month/year parameters
      url.searchParams.set('month', currentMonth.toString());
      url.searchParams.set('year', currentYear.toString());
      if (selectedStatus) url.searchParams.set('status', selectedStatus);
      if (user?.outletId) url.searchParams.set('outletId', user.outletId.toString());
      window.history.replaceState({}, '', url.toString());
      
      // 🎯 Fetch count for entire month using new month parameter API
      const countResult = await calendarApi.getOrdersCount({
        status: selectedStatus,
        outletId: user?.outletId,
        month: currentMonth, // 1-12
        year: currentYear
      });
      
      // Parse countByDate from API response
      // API now returns ALL dates in the month with count (0 if no orders)
      const countMap = new Map<string, number>();
      if (countResult.data?.countByDate) {
        // API returns countByDate as Record<string, number> with all dates filled
        Object.entries(countResult.data.countByDate).forEach(([date, count]) => {
          countMap.set(date, count as number);
        });
      }
      
      setOrdersCountByDate(countMap);
      console.log('📊 Orders count by date loaded:', {
        month: currentMonth,
        year: currentYear,
        status: selectedStatus,
        totalDays: countMap.size,
        totalOrders: countResult.data?.total || 0,
        counts: Array.from(countMap.entries())
      });
    } catch (error) {
      console.error('Error fetching orders count by date:', error);
    } finally {
      setLoadingCounts(false);
    }
  }, [authenticated, user, currentDate, selectedStatus]);

  // 🎯 REMOVED: Auto-fetch calendar data
  // Calendar will only load orders when user clicks on a date
  // const fetchCalendarData = useCallback(async () => {
  //   ... (removed to prevent auto-loading)
  // }, [authenticated]);

  // 🎯 Fetch orders count by date when component mounts or month/status changes
  useEffect(() => {
    if (!authenticated) {
      setOrdersCountByDate(new Map());
      setLoadingCounts(false);
      return;
    }

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentUserId = user?.id || null;
    
    const prevMonth = prevMonthRef.current;
    const prevUserId = prevUserIdRef.current;

    // Only fetch if month/year, user, or status actually changed
    const monthChanged = !prevMonth || prevMonth.year !== currentYear || prevMonth.month !== currentMonth;
    const userChanged = prevUserId !== currentUserId;

    if (monthChanged || userChanged) {
      prevMonthRef.current = { year: currentYear, month: currentMonth };
      prevUserIdRef.current = currentUserId;
      
      // Fetch orders count for each day in the month
      fetchOrdersCountByDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, currentDate, user?.id, selectedStatus]);
  
  // Initialize empty calendar data
  useEffect(() => {
    if (!authenticated) {
      setCalendarData({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
      setLoading(false);
    }
  }, [authenticated]);

  // 🎯 Read month/year from URL on mount and update currentDate if needed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const monthParam = urlParams.get('month');
    const yearParam = urlParams.get('year');
    const statusParam = urlParams.get('status');
    
    // Read month/year from URL
    if (monthParam) {
      const month = parseInt(monthParam, 10);
      const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
      
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        // Create date for first day of the month
        const targetDate = new Date(year, month - 1, 1);
        // Only update if month/year is different
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        if (month !== currentMonth || year !== currentYear) {
          setCurrentDate(targetDate);
        }
      }
    }
    
    // If 'status' is provided, update selectedStatus
    if (statusParam && Object.values(ORDER_STATUS).includes(statusParam as any)) {
      setSelectedStatus(statusParam);
    }
  }, []); // Only run on mount

  // 🎯 REMOVED: Retry handler (no auto-loading anymore)
  // const handleRetry = useCallback(() => {
  //   setError(null);
  //   fetchCalendarData();
  // }, [fetchCalendarData]);

  // 🎯 REMOVED: Convert calendar data to pickup orders
  // Calendar will be empty until user clicks on a date
  // Orders will be loaded on-demand when clicking a date
  const pickupOrders: PickupOrder[] = React.useMemo(() => {
    // Return empty array - no auto-loading
    return [];
  }, []);

  // 🎯 NEW: Handle date click to show daily orders - using new API with pagination
  const handleDateClick = useCallback(async (date: Date, page: number = 1) => {
    console.log('📅 Date clicked:', date, 'page:', page);
    
    if (!authenticated || !user) return;
    
    try {
      setLoadingDailyOrders(true);
      setSelectedDate(date);
      setShowDailyModal(true);
      setCurrentPage(page);
      
      // Format date as YYYY-MM-DD
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const dateStr = formatDateForAPI(date);
      
      // 🎯 Fetch orders by date and status using new API with pagination
      const result = await calendarApi.getOrdersByDate(dateStr, {
        status: selectedStatus,
        outletId: user?.outletId,
        limit: itemsPerPage,
        page: page
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
        // Use pagination total if available, otherwise use summary totalOrders
        const total = result.data.pagination?.total || result.data.summary?.totalOrders || result.data.orders.length;
        setTotalOrders(total);
        console.log('📅 Orders loaded for date:', {
          date: dateStr,
          status: selectedStatus,
          page,
          count: orders.length,
          total,
          pagination: result.data.pagination
        });
      } else {
        console.error('❌ Failed to fetch orders by date:', result.message);
        setDailyOrders([]);
        setTotalOrders(0);
      }
    } catch (error) {
      console.error('💥 Error fetching orders by date:', error);
      setDailyOrders([]);
      setTotalOrders(0);
    } finally {
      setLoadingDailyOrders(false);
    }
  }, [authenticated, user, selectedStatus, itemsPerPage]);

  return (
    <PageWrapper>
      {/* Page Loading Indicator - Floating, non-blocking */}
      <PageLoadingIndicator loading={loading || loadingDailyOrders} />
      <div className="space-y-8">
      {/* 🎯 Status Filter - Hidden for now, default to RESERVED
      {authenticated && (
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
          </div>
        </div>
      )}
      */}
      
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
          onRetry={undefined} // No retry needed - orders load on date click
          ordersCountByDate={ordersCountByDate} // 🎯 Pass orders count by date to display in calendar cells
        />
      </div>

      {/* 🎯 NEW: Daily Orders Modal */}
      {showDailyModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 h-[85vh] flex flex-col overflow-hidden">
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
                onClick={() => {
                  setShowDailyModal(false);
                  setCurrentPage(1); // Reset page when closing modal
                }}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
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
                   <div className="flex-1 flex flex-col">
                     <div className="flex-1 overflow-x-auto">
                       <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
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
                     
                     {/* 🎯 Pagination */}
                     {totalOrders > 0 && (
                       <div className="mt-4 pt-4 border-t border-gray-200">
                         <Pagination
                           currentPage={currentPage}
                           totalPages={Math.ceil(totalOrders / itemsPerPage)}
                           total={totalOrders}
                           limit={itemsPerPage}
                           onPageChange={(page) => {
                             if (selectedDate) {
                               handleDateClick(selectedDate, page);
                             }
                           }}
                           itemName={tcal('modal.orders') || 'orders'}
                         />
                       </div>
                     )}
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