import React from 'react';
import { Clock, CheckCircle, Package } from 'lucide-react';
import { useCalendarTranslations } from '@rentalshop/hooks';

interface CalendarStatsProps {
  totalPickups: number;
  totalReturns: number;
  totalOrders: number;
  currentMonth: number;
  currentYear: number;
  className?: string;
}

export function CalendarStats({
  totalPickups,
  totalReturns,
  totalOrders,
  currentMonth,
  currentYear,
  className = ''
}: CalendarStatsProps) {
  const t = useCalendarTranslations();
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Pickup Orders */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-700" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-700">{t('labels.pickupOrders')}</p>
            <p className="text-2xl font-bold text-blue-900">{totalPickups}</p>
          </div>
        </div>
      </div>
      
      {/* Return Orders */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-600">{t('labels.returnOrders')}</p>
            <p className="text-2xl font-bold text-green-900">{totalReturns}</p>
          </div>
        </div>
      </div>
      
      {/* Total Orders */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-purple-600">{t('labels.totalOrders')}</p>
            <p className="text-2xl font-bold text-purple-900">{totalOrders}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
