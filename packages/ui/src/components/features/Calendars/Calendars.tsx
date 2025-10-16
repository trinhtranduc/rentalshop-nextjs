'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarHeader } from './components/CalendarHeader';
import { CalendarNavigation } from './components/CalendarNavigation';
import { CalendarStats } from './components/CalendarStats';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarLoading } from './components/CalendarLoading';

import type { 
  PickupOrder, 
  CalendarFilters as CalendarFiltersType
} from '@rentalshop/types';

interface CalendarsProps {
  orders?: PickupOrder[];
  loading?: boolean;
  error?: string | null;
  authenticated?: boolean;
  onFiltersChange?: (filters: CalendarFiltersType) => void;
  onOrderClick?: (order: PickupOrder) => void;
  onDateSelect?: (date: Date) => void;
  onLoginClick?: () => void;
  onDevLogin?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function Calendars({
  orders = [],
  loading = false,
  error = null,
  authenticated = false,
  onFiltersChange,
  onOrderClick,
  onDateSelect,
  onLoginClick,
  onDevLogin,
  onRetry,
  className = ''
}: CalendarsProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  // Handle date selection
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  }, [onDateSelect]);

  // Calculate stats for current month
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthOrders = orders.filter(order => {
    const orderDate = new Date((order as any).pickupPlanAt || order.pickupDate);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const totalPickups = monthOrders.length;

  // Only pickup orders - no return orders
  const totalReturns = 0;

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        <CalendarHeader />
        <CalendarLoading />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header */}
      <CalendarHeader>
        <CalendarNavigation
          currentDate={currentDate}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
        />
      </CalendarHeader>

      {/* Calendar Stats */}
      <CalendarStats
        totalPickups={totalPickups}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        selectedDate={selectedDate}
        orders={orders}
        onDateClick={handleDateClick}
      />
    </div>
  );
}

export default Calendars;