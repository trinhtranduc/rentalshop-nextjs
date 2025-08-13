import React from 'react';
import { Button } from '../../../ui/button';
import { ProductViewMode } from '../types';

interface ProductHeaderProps {
  totalProducts: number;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export function ProductHeader({ totalProducts, viewMode, onViewModeChange }: ProductHeaderProps) {
  const viewModes: ProductViewMode[] = [
    { value: 'grid', label: 'Grid View', icon: '⊞' },
    { value: 'table', label: 'Table View', icon: '⊟' }
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <div className="flex items-center space-x-2">
        {viewModes.map((mode) => (
          <Button
            key={mode.value}
            variant={viewMode === mode.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange(mode.value)}
            className="flex items-center space-x-2"
          >
            <span className="text-lg">{mode.icon}</span>
            <span className="hidden sm:inline">{mode.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
