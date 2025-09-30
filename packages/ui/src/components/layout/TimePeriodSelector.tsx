import React from 'react';
import { Button } from '../ui/button';
import { DashboardPeriod } from '@rentalshop/types';

interface TimePeriodSelectorProps {
  currentPeriod: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  currentPeriod,
  onPeriodChange
}) => {
  const periods = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'week', label: 'This Week', icon: '📅' },
    { key: 'month', label: 'This Month', icon: '📊' },
    { key: 'quarter', label: 'This Quarter', icon: '📈' },
    { key: 'year', label: 'This Year', icon: '📈' }
  ] as const;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Business Overview</h2>
        <div className="flex space-x-2">
          {periods.map((period) => (
            <Button
              key={period.key}
              variant={currentPeriod === period.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange(period.key)}
              className="flex items-center space-x-2"
            >
              <span>{period.icon}</span>
              <span>{period.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}; 