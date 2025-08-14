import React, { useEffect, useState } from 'react';
import { 
  CalendarHeader, 
  CalendarGrid, 
  OrdersList 
} from './components';
import { CalendarData, CalendarFilters, CalendarDay, PickupOrder } from './types';
import { generateCalendarDays } from './utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface CalendarProps {
  data: CalendarData;
  filters: CalendarFilters;
  pickupOrders: PickupOrder[];
  onFiltersChange: (filters: CalendarFilters) => void;
  onDateClick: (date: Date | null) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export const Calendar = ({ 
  data, 
  filters, 
  pickupOrders,
  onFiltersChange, 
  onDateClick,
  onPreviousMonth,
  onNextMonth
}: CalendarProps) => {
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


      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeTab === 'calendar' ? (
          // Calendar View with different layout modes
          <>
            {/* Overlay Layout */}
            {layoutMode === 'overlay' && (
              <div className="relative">
                <div className="rounded-xl border border-gray-200 shadow-sm">
                  <CalendarGrid 
                    days={calendarDays}
                    selectedDate={data.selectedDate}
                    onDateClick={(day) => onDateClick(day.date)}
                  />
                </div>
                
                {/* Orders Overlay */}
                {data.selectedDate && (
                  <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Orders for {data.selectedDate.toLocaleDateString()}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                {calendarDays.find(day => day.date.toDateString() === data.selectedDate?.toDateString())?.pickupCount || 0} Pickup Orders
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {calendarDays.find(day => day.date.toDateString() === data.selectedDate?.toDateString())?.returnCount || 0} Return Orders
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => onDateClick(null)}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <OrdersList 
                        selectedDate={data.selectedDate}
                        calendarDays={calendarDays}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Slide-out Layout */}
            {layoutMode === 'slide-out' && (
              <div className="relative">
                <div className="rounded-xl border border-gray-200 shadow-sm">
                  <CalendarGrid 
                    days={calendarDays}
                    selectedDate={data.selectedDate}
                    onDateClick={(day) => onDateClick(day.date)}
                  />
                </div>
                

                
                {/* Slide-out Panel */}
                <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl transition-transform duration-300 z-[9998] ${
                  data.selectedDate ? 'translate-x-0' : 'translate-x-full'
                }`}>
                  <div className="w-96 h-full overflow-y-auto pt-16">
                    {/* Panel Header */}
                    {/* <div className="sticky top-16 bg-white border-b border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => onDateClick(null)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {calendarDays.find(day => day.date.toDateString() === data.selectedDate?.toDateString())?.orders.length || 0} orders
                      </p>
                    </div> */}
                    
                    {/* Orders Content */}
                    <div className="p-4">
                      <OrdersList 
                        selectedDate={data.selectedDate}
                        calendarDays={calendarDays}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Backdrop when panel is open */}
                {data.selectedDate && (
                  <div 
                    className="fixed inset-0 bg-black/10 z-[9997]"
                    onClick={() => onDateClick(null)}
                  />
                )}
              </div>
            )}

            {/* Accordion Layout */}
            {layoutMode === 'accordion' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 shadow-sm">
                  <CalendarGrid 
                    days={calendarDays}
                    selectedDate={data.selectedDate}
                    onDateClick={(day) => onDateClick(day.date)}
                  />
                </div>
                
                {data.selectedDate && (
                  <div className="rounded-xl border border-gray-200 shadow-sm">
                    <OrdersList 
                      selectedDate={data.selectedDate}
                      calendarDays={calendarDays}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resizable Layout */}
            {layoutMode === 'resizable' && (
              <div className="flex gap-2 h-[calc(100vh-300px)]">
                <div className="flex-1 min-w-[400px]">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
                    <CalendarGrid 
                      days={calendarDays}
                      selectedDate={data.selectedDate}
                      onDateClick={(day) => onDateClick(day.date)}
                    />
                  </div>
                </div>
                
                <div className="w-1 bg-gray-200 cursor-col-resize hover:bg-blue-400" />
                
                <div className="w-96 min-w-[300px] max-w-[600px]">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
                    <OrdersList 
                      selectedDate={data.selectedDate}
                      calendarDays={calendarDays}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tabbed Layout */}
            {layoutMode === 'tabbed' && (
              <div className="space-y-4">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'calendar' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('calendar')}
                  >
                    Calendar
                  </button>
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'orders' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('orders')}
                  >
                    Orders
                  </button>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  {activeTab === 'calendar' ? (
                    <CalendarGrid 
                      days={calendarDays}
                      selectedDate={data.selectedDate}
                      onDateClick={(day) => onDateClick(day.date)}
                    />
                  ) : (
                    <OrdersList 
                      selectedDate={data.selectedDate}
                      calendarDays={calendarDays}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Dashboard Layout */}
            {layoutMode === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <CalendarGrid 
                      days={calendarDays}
                      selectedDate={data.selectedDate}
                      onDateClick={(day) => onDateClick(day.date)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Orders:</span>
                        <span className="font-semibold">{pickupOrders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">This Month:</span>
                        <span className="font-semibold">{data.totalPickups}</span>
                      </div>
                    </div>
                  </div>
                  
                  {data.selectedDate && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <OrdersList 
                        selectedDate={data.selectedDate}
                        calendarDays={calendarDays}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Minimal Layout */}
            {layoutMode === 'minimal' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <CalendarGrid 
                    days={calendarDays}
                    selectedDate={data.selectedDate}
                    onDateClick={(day) => onDateClick(day.date)}
                  />
                </div>
                
                {data.selectedDate && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <OrdersList 
                      selectedDate={data.selectedDate}
                      calendarDays={calendarDays}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Original Layouts */}
            {['side-by-side', 'stacked', 'full-width'].includes(layoutMode) && (
              <div className={`
                ${layoutMode === 'side-by-side' ? 'flex gap-6' : ''}
                ${layoutMode === 'stacked' ? 'space-y-6' : ''}
                ${layoutMode === 'full-width' ? 'space-y-6' : ''}
              `}>
                <div className={`
                  bg-white rounded-xl border border-gray-200 shadow-sm
                  ${layoutMode === 'side-by-side' ? 'flex-1' : 'w-full'}
                  ${layoutMode === 'stacked' ? 'w-full' : ''}
                  ${layoutMode === 'full-width' ? 'w-full' : ''}
                `}>
                  <CalendarGrid 
                    days={calendarDays}
                    selectedDate={data.selectedDate}
                    onDateClick={(day) => onDateClick(day.date)}
                  />
                </div>

                {data.selectedDate && (
                  <div className={`
                    bg-white rounded-xl border border-gray-200 shadow-sm
                    ${layoutMode === 'side-by-side' ? 'w-96 flex-shrink-0' : 'w-full'}
                    ${layoutMode === 'stacked' ? 'w-full' : ''}
                    ${layoutMode === 'full-width' ? 'w-full' : ''}
                  `}>
                    <OrdersList 
                      selectedDate={data.selectedDate}
                      calendarDays={calendarDays}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Orders List Tab
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <OrdersList 
              selectedDate={data.selectedDate}
              calendarDays={calendarDays}
            />
          </div>
        )}
      </div>
    </div>
  );
};
