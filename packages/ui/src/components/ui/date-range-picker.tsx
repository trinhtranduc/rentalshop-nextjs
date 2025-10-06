'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../lib/cn';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showPresets?: boolean;
  format?: 'short' | 'long';
  align?: 'left' | 'right';
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value = { from: undefined, to: undefined },
  onChange,
  placeholder = "Select date range",
  className,
  disabled = false,
  minDate = new Date(),
  maxDate,
  showPresets = true,
  format = 'short',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const startDate = value?.from || new Date();
    return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update temp range when value changes
  useEffect(() => {
    setTempRange(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date, formatType: 'short' | 'long' = format) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    if (formatType === 'long') {
      return `${day}/${month}/${year}`;
    }
    // For short format, show dd/mm
    return `${day}/${month}`;
  };

  const formatDisplayValue = () => {
    if (!value?.from && !value?.to) return placeholder;
    
    if (value.from && value.to) {
      return `${formatDate(value.from, 'long')} - ${formatDate(value.to, 'long')}`;
    }
    
    if (value.from) {
      return `From ${formatDate(value.from, 'long')}`;
    }
    
    if (value.to) {
      return `To ${formatDate(value.to, 'long')}`;
    }
    
    return placeholder;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const isDateInRange = (date: Date) => {
    if (!tempRange.from && !tempRange.to) return false;
    
    const dateTime = date.getTime();
    const fromTime = tempRange.from?.getTime() || 0;
    const toTime = tempRange.to?.getTime() || 0;
    
    if (tempRange.from && tempRange.to) {
      return dateTime >= fromTime && dateTime <= toTime;
    }
    
    if (tempRange.from) {
      return dateTime >= fromTime;
    }
    
    if (tempRange.to) {
      return dateTime <= toTime;
    }
    
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!tempRange.from && !tempRange.to) return false;
    
    const dateTime = date.getTime();
    const fromTime = tempRange.from?.getTime() || 0;
    const toTime = tempRange.to?.getTime() || 0;
    
    return dateTime === fromTime || dateTime === toTime;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      // Start new range
      setTempRange({ from: date, to: undefined });
    } else {
      // Complete range
      if (date < tempRange.from!) {
        setTempRange({ from: date, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: date });
      }
    }
  };

  const handleDateHover = (date: Date) => {
    if (tempRange.from && !tempRange.to) {
      setHoveredDate(date);
    }
  };

  const handleApply = () => {
    if (onChange) {
      onChange(tempRange);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedRange = { from: undefined, to: undefined };
    setTempRange(clearedRange);
    if (onChange) {
      onChange(clearedRange);
    }
  };

  const handlePresetClick = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() + 1); // Tomorrow
    
    const to = new Date(from);
    to.setDate(from.getDate() + days - 1);
    
    const newRange = { from, to };
    setTempRange(newRange);
    if (onChange) {
      onChange(newRange);
    }
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-start text-left font-normal",
          !value?.from && !value?.to && "text-muted-foreground"
        )}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {formatDisplayValue()}
      </Button>

                   {isOpen && (
               <div className={cn(
                 "absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2",
                 align === 'left' ? 'left-0' : 'right-0'
               )}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Chọn khoảng thời gian</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Presets */}
          {showPresets && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Gợi ý nhanh</h4>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 14, 30].map(days => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(days)}
                    className="text-xs h-7 px-2"
                  >
                    {days} {days === 1 ? 'day' : 'days'}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h4 className="text-sm font-medium text-gray-900">
              {currentMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h4>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

                           {/* Calendar Grid */}
                 <div className="mb-2">
                   {/* Weekday headers */}
                   <div className="grid grid-cols-7 gap-2 mb-2">
                     {weekdays.map(day => (
                       <div key={day} className="text-sm font-medium text-gray-500 text-center py-2">
                         {day}
                       </div>
                     ))}
                   </div>

                   {/* Calendar days */}
                   <div className="grid grid-cols-7 gap-2">
                     {/* Empty cells for days before month starts */}
                     {Array.from({ length: startingDayOfWeek }, (_, i) => (
                       <div key={`empty-${i}`} className="h-8" />
                     ))}

                     {/* Month days */}
                     {Array.from({ length: daysInMonth }, (_, i) => {
                       const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                       const isDisabled = isDateDisabled(date);
                       const isSelected = isDateSelected(date);
                       const isInRange = isDateInRange(date);
                       const isHovered = hoveredDate && date.getTime() === hoveredDate.getTime();

                       return (
                         <button
                           key={i}
                           onClick={() => handleDateClick(date)}
                           onMouseEnter={() => handleDateHover(date)}
                           disabled={isDisabled}
                           className={cn(
                             "h-8 w-8 text-sm rounded-lg transition-colors relative",
                             isDisabled && "text-gray-300 cursor-not-allowed",
                             !isDisabled && "hover:bg-gray-100",
                             isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                             isInRange && !isSelected && "bg-blue-100 text-blue-900",
                             isHovered && !isSelected && "bg-blue-50"
                           )}
                         >
                           {date.getDate()}
                         </button>
                       );
                     })}
                   </div>
                 </div>



          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
