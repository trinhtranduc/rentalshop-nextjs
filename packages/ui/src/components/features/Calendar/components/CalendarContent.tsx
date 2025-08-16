import React from 'react';
import { CalendarLayouts } from './CalendarLayouts';
import { OrdersList } from './OrdersList';
import { CalendarDay, PickupOrder } from '../types';

interface CalendarContentProps {
  activeTab: 'calendar' | 'orders';
  layoutMode: 'side-by-side' | 'stacked' | 'full-width' | 'overlay' | 'slide-out' | 'accordion' | 'resizable' | 'tabbed' | 'dashboard' | 'minimal';
  calendarDays: CalendarDay[];
  selectedDate: Date | null;
  onDateClick: (date: Date | null) => void;
  pickupOrders: PickupOrder[];
  setActiveTab: (tab: 'calendar' | 'orders') => void;
}

export function CalendarContent({
  activeTab,
  layoutMode,
  calendarDays,
  selectedDate,
  onDateClick,
  pickupOrders,
  setActiveTab
}: CalendarContentProps) {
  if (activeTab === 'calendar') {
    return (
      <CalendarLayouts
        layoutMode={layoutMode}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        onDateClick={onDateClick}
        pickupOrders={pickupOrders}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    );
  }

  // Orders List Tab
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <OrdersList 
        selectedDate={selectedDate}
        calendarDays={calendarDays}
      />
    </div>
  );
}
