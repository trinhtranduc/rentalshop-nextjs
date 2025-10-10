import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarNavigationProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  className?: string;
}

export function CalendarNavigation({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  className = ''
}: CalendarNavigationProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Month/Year Display */}
      <div className="flex items-center space-x-3">
        <CalendarIcon className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {currentMonth} {currentYear}
        </h2>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onPreviousMonth}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Today
        </button>

        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
