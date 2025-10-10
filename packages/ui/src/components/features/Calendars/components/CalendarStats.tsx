import React from 'react';
import { Package, ArrowUpRight } from 'lucide-react';

interface CalendarStatsProps {
  totalPickups: number;
  currentMonth: number;
  currentYear: number;
  className?: string;
}

export function CalendarStats({
  totalPickups,
  currentMonth,
  currentYear,
  className = ''
}: CalendarStatsProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Pickup Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Pickup Orders</p>
            <p className="text-2xl font-bold text-gray-900">{totalPickups}</p>
          </div>
        </div>
      </div>

      {/* Month Display */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Month</p>
            <p className="text-lg font-semibold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
