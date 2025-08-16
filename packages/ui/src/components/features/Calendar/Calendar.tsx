import React, { useEffect, useState } from 'react';
import { 
  CalendarHeader, 
  CalendarContent,
  CalendarControls
} from './components';
import { CalendarData, CalendarFilters, CalendarDay, PickupOrder } from './types';
import { generateCalendarDays } from './utils';

interface CalendarProps {
  data: CalendarData;
  filters: CalendarFilters;
  pickupOrders: PickupOrder[];
  onFiltersChange: (filters: CalendarFilters) => void;
  onDateClick: (date: Date | null) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function Calendar({ 
  data, 
  filters, 
  pickupOrders,
  onFiltersChange, 
  onDateClick,
  onPreviousMonth,
  onNextMonth
}: CalendarProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'orders'>('calendar');
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'stacked' | 'full-width' | 'overlay' | 'slide-out' | 'accordion' | 'resizable' | 'tabbed' | 'dashboard' | 'minimal'>('overlay');

  // Generate calendar days when component mounts or data changes
  useEffect(() => {
    const days = generateCalendarDays(data.currentMonth, data.currentYear, pickupOrders);
    setCalendarDays(days);
  }, [data.currentMonth, data.currentYear, pickupOrders]);

  return (
    <div className="space-y-6">
      <CalendarHeader 
        currentMonth={data.currentMonth}
        currentYear={data.currentYear}
        totalPickups={data.totalPickups}
        totalReturns={data.totalReturns}
        selectedDate={data.selectedDate}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
      />


      {/* Layout Controls */}
      <div className="flex justify-between items-center">
        <CalendarControls 
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        <CalendarContent
          activeTab={activeTab}
          layoutMode={layoutMode}
          calendarDays={calendarDays}
          selectedDate={data.selectedDate}
          onDateClick={onDateClick}
          pickupOrders={pickupOrders}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
};


export default Calendar;
