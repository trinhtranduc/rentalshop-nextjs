'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendars, PageWrapper, Breadcrumb, Button } from '@rentalshop/ui';
import { X } from 'lucide-react';
import { useAuth, useSimpleErrorHandler, useCommonTranslations, useCalendarTranslations, useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate, getUTCDateKey } from '@rentalshop/utils';
import { calendarApi, type CalendarResponse, type DayOrders, type CalendarOrderSummary, type CalendarMeta } from "@rentalshop/utils";
import type { PickupOrder } from '@rentalshop/ui';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const authenticated = !!user;
  const { handleError } = useSimpleErrorHandler();
  const t = useCommonTranslations();
  const tcal = useCalendarTranslations();
  const to = useOrderTranslations();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarResponse>({ calendar: [], summary: { totalOrders: 0, totalRevenue: 0, totalPickups: 0, totalReturns: 0, averageOrderValue: 0 } });
  const [calendarMeta, setCalendarMeta] = useState<CalendarMeta | null>(null);
  // Initialize to October 2025 to match test data
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // Month is 0-based, so 9 = October
  
  // Handle month change from Calendars component
  const handleMonthChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);
  
  // 🎯 NEW: State for daily order details modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyOrders, setDailyOrders] = useState<(CalendarOrderSummary & { type: 'pickup' | 'return' })[]>([]);
  const [showDailyModal, setShowDailyModal] = useState(false);

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
      // Use UTC date format (YYYY-MM-DD) to match backend
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);
      
      const result = await calendarApi.getCalendarOrders({
        startDate: getUTCDateKey(startOfMonth),
        endDate: getUTCDateKey(endOfMonth),
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
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [authenticated, currentDate, user, handleError]);

  // Fetch calendar data when component mounts or dependencies change
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Handle retry with better error handling
  const handleRetry = useCallback(() => {
    setError(null);
    fetchCalendarData();
  }, [fetchCalendarData]);

  // 🎯 NEW: Handle date click to show daily orders
  const handleDateClick = useCallback((date: Date) => {
    console.log('📅 Date clicked:', date);
    
    // Convert date to YYYY-MM-DD format using UTC to match backend (which uses UTC dates)
    const dateKey = getUTCDateKey(date);
    const dayData = calendarData.calendar.find(day => day.date === dateKey);
    
    console.log('📅 Looking for dateKey:', dateKey);
    console.log('📅 Available dates:', calendarData.calendar.map(day => day.date));
    
    if (dayData) {
      // Show ALL orders from dayData.orders (both pickup and return)
      const allOrders = dayData.orders.map((order: CalendarOrderSummary) => ({ 
        ...order, 
        type: 'pickup' as const 
      }));
      
      console.log('📅 Orders found for selected date:', {
        dateKey,
        calendarOrders: dayData.orders.length,
        allOrders: allOrders.length,
        orderNumbers: allOrders.map(o => o.orderNumber)
      });
      
      setSelectedDate(date);
      setDailyOrders(allOrders);
      setShowDailyModal(true);
    } else {
      console.log('📅 No orders for selected date:', dateKey);
      setSelectedDate(date);
      setDailyOrders([]);
      setShowDailyModal(true);
    }
  }, [calendarData]);

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
          isOverdue: order.status === 'PICKUPED' && order.returnPlanAt ? new Date(order.returnPlanAt) < new Date() : false,
          duration: order.pickupPlanAt && order.returnPlanAt ? 
            Math.ceil((new Date(order.returnPlanAt).getTime() - new Date(order.pickupPlanAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
        });
      });
      
      // Only process pickup orders - no return orders needed
    }
    
    console.log('📅 Final pickupOrders:', {
      ordersCount: orders.length
    });
    
    return orders;
  }, [calendarData]);

  return (
    <PageWrapper>
      <div className="space-y-8">
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
                    const dateText = selectedDate.toLocaleDateString('vi-VN', { 
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
              {(() => {
                console.log('🔍 Modal rendering with dailyOrders:', {
                  length: dailyOrders.length,
                  orders: dailyOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber }))
                });
                return null;
              })()}
              {dailyOrders.length === 0 ? (
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
                                 <div className="text-sm text-gray-500">{order.customerPhone}</div>
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
                                   order.status === 'PICKUPED' ? 'bg-green-100 text-green-800' :
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
                                   ${order.totalAmount.toFixed(2)}
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