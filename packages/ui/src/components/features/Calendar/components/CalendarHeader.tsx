import React from 'react';
import { Button } from '../../../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  totalPickups: number;
  totalReturns: number;
  selectedDate: Date | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarHeader({ 
  currentMonth, 
  currentYear, 
  totalPickups,
  totalReturns,
  selectedDate,
  onPreviousMonth, 
  onNextMonth 
}: CalendarHeaderProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-gray-600">
                {totalPickups} pickup order{totalPickups !== 1 ? 's' : ''} this month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="text-sm text-gray-600">
                {totalReturns} return order{totalReturns !== 1 ? 's' : ''} this month
              </p>
            </div>
            {selectedDate && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  Selected: {selectedDate.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousMonth}
            className="p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNextMonth}
            className="p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
