import React from 'react';
import { Package, ArrowUpRight } from 'lucide-react';
import { useCalendarTranslations } from '@rentalshop/hooks';

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
  const t = useCalendarTranslations();
  
  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'), 
    t('months.may'), t('months.june'), t('months.july'), t('months.august'), 
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
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
            <p className="text-sm font-medium text-gray-600">{t('labels.pickupOrders')}</p>
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
            <p className="text-sm font-medium text-gray-600">{t('labels.month')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
