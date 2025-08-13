import React from 'react';
import { TimePeriodSelector } from '../../../layout/TimePeriodSelector';

interface DashboardHeaderProps {
  period: 'today' | 'week' | 'month' | 'year';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
}

export function DashboardHeader({ period, onPeriodChange }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your rental business performance
        </p>
      </div>
      
      <TimePeriodSelector
        currentPeriod={period}
        onPeriodChange={onPeriodChange}
      />
    </div>
  );
}
