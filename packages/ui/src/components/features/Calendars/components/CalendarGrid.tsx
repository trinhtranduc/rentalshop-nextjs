import React from 'react';
import { CalendarDay, PickupOrder } from '@rentalshop/types';

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
      
      // Get orders for this date
      const dateOrders = orders.filter(order => {
        const pickupDate = new Date(order.pickupPlanAt);
        const returnDate = new Date(order.returnPlanAt);
        return (
          pickupDate.toDateString() === tempDate.toDateString() ||
          returnDate.toDateString() === tempDate.toDateString()
        );
      });
      
      const pickupOrders = dateOrders.filter(order => {
        const pickupDate = new Date(order.pickupPlanAt);
        return pickupDate.toDateString() === tempDate.toDateString();
      });
      
      const returnOrders = dateOrders.filter(order => {
        const returnDate = new Date(order.returnPlanAt);
        return returnDate.toDateString() === tempDate.toDateString();
      });
      
      days.push({
        date: new Date(tempDate),
        dayOfMonth,
        isCurrentMonth,
        isToday,
        isSelected,
        pickupOrders,
        returnOrders,
        hasEvents: dateOrders.length > 0,
        orders: dateOrders,
        pickupCount: pickupOrders.length,
        returnCount: returnOrders.length
      });
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return days;
  }, [currentDate, orders, selectedDate]);

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
            <div className="flex items-center justify-between mb-2">
              <span
                className={`
                  text-sm font-medium
                  ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${day.isToday ? 'text-blue-600 font-bold' : ''}
                `}
              >
                {day.dayOfMonth}
              </span>
              
              {/* Event Indicators */}
              {day.hasEvents && (
                <div className="flex space-x-1">
                  {day.pickupCount > 0 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                  {day.returnCount > 0 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              )}
            </div>

            {/* Events for this day */}
            <div className="space-y-1">
              {/* Pickup Orders */}
              {day.pickupOrders.slice(0, 2).map(order => (
                <div
                  key={`pickup-${order.id}`}
                  className="p-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 truncate"
                >
                  📦 {order.orderNumber}
                </div>
              ))}
              
              {/* Return Orders */}
              {day.returnOrders.slice(0, 2).map(order => (
                <div
                  key={`return-${order.id}`}
                  className="p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 truncate"
                >
                  🔄 {order.orderNumber}
                </div>
              ))}
              
              {/* Show more indicator if there are more events */}
              {(day.pickupCount + day.returnCount) > 4 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{(day.pickupCount + day.returnCount) - 4} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
