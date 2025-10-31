import React from 'react';
import { CalendarDay, PickupOrder } from '@rentalshop/types';
import { useCalendarTranslations } from '@rentalshop/hooks';
import { getUTCDateKey } from '@rentalshop/utils';

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
      // Use UTC date key to match backend data (which uses UTC dates)
      const currentDateKey = getUTCDateKey(tempDate);
      
      const dateOrders = orders.filter(order => {
        const pickupDate = new Date((order as any).pickupPlanAt || order.pickupDate);
        const returnDate = new Date((order as any).returnPlanAt || order.returnDate);
        
        // Use getUTCDateKey to get UTC date (YYYY-MM-DD) to match backend
        // Backend returns "date": "2025-10-27" (UTC, no timezone conversion)
        const pickupDateKey = getUTCDateKey(pickupDate);
        const returnDateKey = getUTCDateKey(returnDate);
        
        const matches = (
          pickupDateKey === currentDateKey ||
          returnDateKey === currentDateKey
        );
        
        // Debug logging for first week only
        if (tempDate.getDate() <= 7) {
          console.log('📅 CalendarGrid date matching:', {
            currentDateKey,
            pickupDateKey,
            returnDateKey,
            matches,
            orderNumber: order.orderNumber
          });
        }
        
        return matches;
      });
      
      // All orders are pickup orders (RESERVED and PICKUPED status only)
      // Backend only adds orders to pickup date, so all orders here are pickup
      const pickupOrders = dateOrders; // All orders are pickup orders
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

            {/* 🎯 NEW: Order Count Display (User's Requested Strategy) */}
            <div className="space-y-1">
              {/* Show order counts instead of individual orders */}
              {(day as any).hasEvents && (
                <div className="space-y-1">
                  {/* Pickup Count */}
                  {(day as any).pickupCount > 0 && (
                    <div className="flex items-center justify-between px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
                      <span className="text-green-700 font-medium">{t('labels.pickup')}</span>
                      <span className="text-green-800 font-bold">{(day as any).pickupCount}</span>
                    </div>
                  )}
                  
                  {/* Return Count */}
                  {(day as any).returnCount > 0 && (
                    <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="text-blue-700 font-medium">{t('labels.return')}</span>
                      <span className="text-blue-800 font-bold">{(day as any).returnCount}</span>
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
