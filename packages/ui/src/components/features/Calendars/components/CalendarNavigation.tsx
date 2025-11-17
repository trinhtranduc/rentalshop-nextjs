import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../../ui/button';
import { useCalendarTranslations } from '@rentalshop/hooks';

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
  const t = useCalendarTranslations();
  
  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'), 
    t('months.may'), t('months.june'), t('months.july'), t('months.august'), 
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Month/Year Display */}
      <div className="flex items-center space-x-3">
        <CalendarIcon className="w-5 h-5 text-blue-700" />
        <h2 className="text-xl font-semibold text-gray-900">
          {currentMonth} {currentYear}
        </h2>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Button>

        <Button
          variant="outline"
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
        >
          {t('navigation.today')}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </Button>
      </div>
    </div>
  );
}
