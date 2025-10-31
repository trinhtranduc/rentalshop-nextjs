import React from 'react';
import { Calendar } from 'lucide-react';
import { useCalendarTranslations } from '@rentalshop/hooks';

interface CalendarHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function CalendarHeader({ 
  title, 
  subtitle,
  children 
}: CalendarHeaderProps) {
  const t = useCalendarTranslations();
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title || t('title')}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
}
