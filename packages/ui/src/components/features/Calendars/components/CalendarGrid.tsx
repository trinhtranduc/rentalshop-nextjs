import React from 'react';
import { CalendarDay, PickupOrder } from '@rentalshop/types';
import { useCalendarTranslations } from '@rentalshop/hooks';
import { getLocalDateKey } from '@rentalshop/utils';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  orders: PickupOrder[];
  onDateClick: (date: Date) => void;
  className?: string;
}

export function CalendarGrid({
  currentDate,
  selectedDate,
  orders,
  onDateClick,
  className = ''
}: CalendarGridProps) {
  const t = useCalendarTranslations();
  // Generate calendar days for the current month
  const calendarDays = React.useMemo(() => {
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get start date (including previous month's days to fill first week)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get end date (including next month's days to fill last week)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const tempDate = new Date(startDate);
    
    while (tempDate <= endDate) {
      const dayOfMonth = tempDate.getDate();
      const isCurrentMonth = tempDate.getMonth() === month;
      const isToday = tempDate.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === tempDate.toDateString();
      
      // Get orders for this date using date without time for comparison
      // Use local date key to match backend data (which uses local date keys)
      const currentDateKey = getLocalDateKey(tempDate);
      
      // Backend đã filter chỉ RESERVED và PICKUPED orders và chỉ thêm vào pickup date
      // Frontend chỉ cần match theo pickup date, không hiển thị return date
      const dateOrders = orders.filter(order => {
        // RESERVED: hiển thị theo pickupPlanAt
        // PICKUPED: hiển thị theo pickedUpAt (nếu có) hoặc pickupPlanAt
        let displayDate: Date | null = null;
        
        if (order.status === 'RESERVED') {
          // RESERVED: ưu tiên pickupPlanAt, nếu không có thì dùng pickupDate (từ transform)
          displayDate = (order as any).pickupPlanAt 
            ? new Date((order as any).pickupPlanAt)
            : (order.pickupDate ? new Date(order.pickupDate) : null);
        } else if (order.status === 'PICKUPED') {
          // PICKUPED: ưu tiên pickedUpAt, nếu không có thì dùng pickupPlanAt, cuối cùng là pickupDate
          displayDate = (order as any).pickedUpAt 
            ? new Date((order as any).pickedUpAt)
            : ((order as any).pickupPlanAt 
              ? new Date((order as any).pickupPlanAt)
              : (order.pickupDate ? new Date(order.pickupDate) : null));
        }
        
        if (!displayDate) return false;
        
        // Use getLocalDateKey to get local date (YYYY-MM-DD) to match backend
        // Backend returns "date": "2025-11-24" (local date key, not UTC)
        const displayDateKey = getLocalDateKey(displayDate);
        
        const matches = displayDateKey === currentDateKey;
        
        // Debug logging for all dates to troubleshoot
          console.log('📅 CalendarGrid date matching:', {
            currentDateKey,
          displayDateKey,
            matches,
          orderNumber: order.orderNumber,
          status: order.status,
          pickupPlanAt: (order as any).pickupPlanAt,
          pickupDate: order.pickupDate,
          pickedUpAt: (order as any).pickedUpAt
          });
        
        return matches;
      });
      
      // Backend đã filter chỉ RESERVED và PICKUPED orders và chỉ thêm vào pickup date
      // Tất cả orders từ backend đều là pickup orders
      const pickupOrders = dateOrders; // Backend đã filter, không cần filter lại
      const returnOrders: any[] = []; // No return orders displayed in calendar
      
      days.push({
        date: new Date(tempDate),
        events: [], // Required by CalendarDay interface
        isCurrentMonth,
        isToday,
        isSelected,
        // Additional properties for this component
        dayOfMonth,
        pickupOrders,
        returnOrders,
        hasEvents: dateOrders.length > 0,
        orders: dateOrders,
        pickupCount: pickupOrders.length,
        returnCount: returnOrders.length
      } as any);
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return days;
  }, [currentDate, orders, selectedDate]);

  // Weekday headers
  const weekdays = [
    t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'), 
    t('days.thursday'), t('days.friday'), t('days.saturday')
  ];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekdays.map(day => (
          <div
            key={day}
            className="px-3 py-3 text-center text-sm font-medium text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => onDateClick(day.date)}
            className={`
              min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer transition-colors
              ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${day.isToday ? 'bg-blue-50' : ''}
              ${day.isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
              ${day.isCurrentMonth ? 'hover:bg-gray-50' : ''}
            `}
          >
            {/* Date Number */}
            <div className="mb-2">
              <span
                className={`
                  text-sm font-medium
                  ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${day.isToday ? 'text-blue-700 font-bold' : ''}
                `}
              >
                {(day as any).dayOfMonth}
              </span>
            </div>

            {/* 🎯 NEW: Order Count Display (Pickup Orders Only) */}
            <div className="space-y-1">
              {/* Show pickup order counts */}
              {(day as any).hasEvents && (
                <div className="space-y-1">
                  {/* Pickup Count */}
                  {(day as any).pickupCount > 0 && (
                    <div className="flex items-center justify-between px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
                      <span className="text-green-700 font-medium">{t('labels.pickup')}</span>
                      <span className="text-green-800 font-bold">{(day as any).pickupCount}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* No events message */}
              {!(day as any).hasEvents && day.isCurrentMonth && (
                <div className="text-xs text-gray-400 text-center py-2">
                  {t('labels.noOrders')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
