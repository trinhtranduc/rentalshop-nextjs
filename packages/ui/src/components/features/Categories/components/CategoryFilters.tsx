'use client'

import React from 'react';
import { Input, Card, CardContent } from '@rentalshop/ui';
import { Search, ArrowUpDown } from 'lucide-react';
import type { CategoryFilters as CategoryFiltersType } from '@rentalshop/types';

interface CategoryFiltersProps {
  filters: CategoryFiltersType;
  onFiltersChange: (filters: CategoryFiltersType) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort?: { field: string; order: 'asc' | 'desc' };
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearchChange,
  onClearFilters,
  onSortChange,
  currentSort
}) => {
  const handleSortToggle = (field: string) => {
    if (!onSortChange) return;
    
    const newOrder = currentSort?.field === field && currentSort?.order === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newOrder);
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort Button - Hidden */}
          {/* {onSortChange && (
            <button
              onClick={() => handleSortToggle('name')}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort</span>
            </button>
          )} */}

          {/* Clear Filters Button */}
          {(filters.search) && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter - Hidden */}
        {/* <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={filters.isActive ?? ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              isActive: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div> */}
      </CardContent>
    </Card>
  );
};
