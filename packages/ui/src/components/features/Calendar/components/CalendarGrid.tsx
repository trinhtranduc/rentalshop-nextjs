import React from 'react';
import { Badge } from '../../../ui/badge';
import { CalendarDay } from '../types';

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date | null;
  onDateClick: (day: CalendarDay) => void;
}

export function CalendarGrid({ days, selectedDate, onDateClick }: CalendarGridProps) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Debug: Log selectedDate
  console.log('CalendarGrid received selectedDate:', selectedDate?.toDateString());

  // Helper function to compare dates
  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50">
        {weekdays.map(day => (
          <div key={day} className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 bg-white/80 backdrop-blur-sm">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isSelected = isSameDate(selectedDate, day.date);
          
          // Debug: Log when a day is selected
          if (isSelected) {
            console.log('Day selected:', day.date.toDateString(), 'isSelected:', isSelected);
          }
          
          return (
            <div
              key={index}
              onClick={() => onDateClick(day)}
              className={`
                min-h-[120px] cursor-pointer transition-all duration-200 relative
                hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] hover:border-blue-300
                border border-gray-200
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/30'}
                ${day.isToday ? 'bg-blue-100 border-blue-400 shadow-md' : ''}
                ${isSelected ? 'bg-blue-200 shadow-lg z-10' : ''}
              `}
            >
              <div className="p-3 h-full flex flex-col">
                <div className={`text-sm font-semibold mb-2 ${
                  day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {day.day}
                </div>
                
                {/* Pickup and Return count indicators */}
                <div className="mt-auto space-y-1">
                  {day.pickupCount > 0 && (
                    <div className="flex items-center justify-center">
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-2 py-1 font-medium shadow-sm"
                      >
                        {day.pickupCount} pickup{day.pickupCount > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                  {day.returnCount > 0 && (
                    <div className="flex items-center justify-center">
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 font-medium shadow-sm"
                      >
                        {day.returnCount} return{day.returnCount > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
