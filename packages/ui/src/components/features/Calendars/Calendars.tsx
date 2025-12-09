'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  initialDate?: Date; // Allow parent to control the displayed month
  onMonthChange?: (date: Date) => void; // Notify parent when month changes
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
  initialDate,
  onMonthChange,
  className = ''
}: CalendarsProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  
  // Sync with parent's initialDate changes
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Track previous month to avoid unnecessary callbacks
  const prevMonthRef = useRef<{ year: number; month: number } | null>(null);

  // Notify parent when currentDate changes (only when month actually changes)
  useEffect(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const prevMonth = prevMonthRef.current;

    // Only call onMonthChange if month/year actually changed
    if (!prevMonth || prevMonth.year !== currentYear || prevMonth.month !== currentMonth) {
      prevMonthRef.current = { year: currentYear, month: currentMonth };
      onMonthChange?.(currentDate);
    }
  }, [currentDate, onMonthChange]);

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

  // All orders are pickup orders (RESERVED and PICKUPED status only)
  // Backend API only returns active pickup orders
  const totalPickups = monthOrders.length;
  const totalReturns = 0; // No return orders displayed
  const totalOrders = monthOrders.length;

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
        totalReturns={totalReturns}
        totalOrders={totalOrders}
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