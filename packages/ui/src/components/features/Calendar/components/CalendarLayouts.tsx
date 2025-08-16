import React from 'react';
import { CalendarGrid } from './CalendarGrid';
import { OrdersList } from './OrdersList';
import { CalendarDay, PickupOrder } from '../types';

interface CalendarLayoutsProps {
  layoutMode: 'side-by-side' | 'stacked' | 'full-width' | 'overlay' | 'slide-out' | 'accordion' | 'resizable' | 'tabbed' | 'dashboard' | 'minimal';
  calendarDays: CalendarDay[];
  selectedDate: Date | null;
  onDateClick: (date: Date | null) => void;
  pickupOrders: PickupOrder[];
  activeTab: 'calendar' | 'orders';
  setActiveTab: (tab: 'calendar' | 'orders') => void;
}

export function CalendarLayouts({
  layoutMode,
  calendarDays,
  selectedDate,
  onDateClick,
  pickupOrders,
  activeTab,
  setActiveTab
}: CalendarLayoutsProps) {
  // Overlay Layout
  if (layoutMode === 'overlay') {
    return (
      <div className="relative">
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <CalendarGrid 
            days={calendarDays}
            selectedDate={selectedDate}
            onDateClick={(day) => onDateClick(day.date)}
          />
        </div>
        
        {/* Orders Overlay */}
        {selectedDate && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Orders for {selectedDate.toLocaleDateString()}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {calendarDays.find(day => day.date.toDateString() === selectedDate?.toDateString())?.pickupCount || 0} Pickup Orders
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {calendarDays.find(day => day.date.toDateString() === selectedDate?.toDateString())?.returnCount || 0} Return Orders
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
                selectedDate={selectedDate}
                calendarDays={calendarDays}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Slide-out Layout
  if (layoutMode === 'slide-out') {
    return (
      <div className="relative">
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <CalendarGrid 
            days={calendarDays}
            selectedDate={selectedDate}
            onDateClick={(day) => onDateClick(day.date)}
          />
        </div>
        
        {/* Slide-out Panel */}
        <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl transition-transform duration-300 z-[9998] ${
          selectedDate ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="w-96 h-full overflow-y-auto pt-16">
            {/* Orders Content */}
            <div className="p-4">
              <OrdersList 
                selectedDate={selectedDate}
                calendarDays={calendarDays}
              />
            </div>
          </div>
        </div>
        
        {/* Backdrop when panel is open */}
        {selectedDate && (
          <div 
            className="fixed inset-0 bg-black/10 z-[9997]"
            onClick={() => onDateClick(null)}
          />
        )}
      </div>
    );
  }

  // Accordion Layout
  if (layoutMode === 'accordion') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <CalendarGrid 
            days={calendarDays}
            selectedDate={selectedDate}
            onDateClick={(day) => onDateClick(day.date)}
          />
        </div>
        
        {selectedDate && (
          <div className="rounded-xl border border-gray-200 shadow-sm">
            <OrdersList 
              selectedDate={selectedDate}
              calendarDays={calendarDays}
            />
          </div>
        )}
      </div>
    );
  }

  // Resizable Layout
  if (layoutMode === 'resizable') {
    return (
      <div className="flex gap-2 h-[calc(100vh-300px)]">
        <div className="flex-1 min-w-[400px]">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <CalendarGrid 
              days={calendarDays}
              selectedDate={selectedDate}
              onDateClick={(day) => onDateClick(day.date)}
            />
          </div>
        </div>
        
        <div className="w-1 bg-gray-200 cursor-col-resize hover:bg-blue-400" />
        
        <div className="w-96 min-w-[300px] max-w-[600px]">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <OrdersList 
              selectedDate={selectedDate}
              calendarDays={calendarDays}
            />
          </div>
        </div>
      </div>
    );
  }

  // Tabbed Layout
  if (layoutMode === 'tabbed') {
    return (
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
            className="px-4 py-2 rounded-md text-sm font-medium transition-all text-gray-600 hover:text-gray-900"
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {activeTab === 'calendar' ? (
            <CalendarGrid 
              days={calendarDays}
              selectedDate={selectedDate}
              onDateClick={(day) => onDateClick(day.date)}
            />
          ) : (
            <OrdersList 
              selectedDate={selectedDate}
              calendarDays={calendarDays}
            />
          )}
        </div>
      </div>
    );
  }

  // Dashboard Layout
  if (layoutMode === 'dashboard') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <CalendarGrid 
              days={calendarDays}
              selectedDate={selectedDate}
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
                <span className="font-semibold">{calendarDays.filter(day => day.isCurrentMonth).reduce((sum, day) => sum + day.pickupCount, 0)}</span>
              </div>
            </div>
          </div>
          
          {selectedDate && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <OrdersList 
                selectedDate={selectedDate}
                calendarDays={calendarDays}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Minimal Layout
  if (layoutMode === 'minimal') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <CalendarGrid 
            days={calendarDays}
            selectedDate={selectedDate}
            onDateClick={(day) => onDateClick(day.date)}
          />
        </div>
        
        {selectedDate && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <OrdersList 
              selectedDate={selectedDate}
              calendarDays={calendarDays}
            />
          </div>
        )}
      </div>
    );
  }

  // Default Layouts (side-by-side, stacked, full-width)
  if (['side-by-side', 'stacked', 'full-width'].includes(layoutMode)) {
    return (
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
            selectedDate={selectedDate}
            onDateClick={(day) => onDateClick(day.date)}
          />
        </div>

        {selectedDate && (
          <div className={`
            bg-white rounded-xl border border-gray-200 shadow-sm
            ${layoutMode === 'side-by-side' ? 'w-96 flex-shrink-0' : 'w-full'}
            ${layoutMode === 'stacked' ? 'w-full' : ''}
            ${layoutMode === 'full-width' ? 'w-full' : ''}
          `}>
            <OrdersList 
              selectedDate={selectedDate}
              calendarDays={calendarDays}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
