import React from 'react';
import { 
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@rentalshop/ui/base';
import type { OutletFilters as OutletFiltersType } from '@rentalshop/types';

interface OutletFiltersProps {
  filters: OutletFiltersType;
  onFiltersChange: (filters: OutletFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

/**
 * ✅ COMPACT OUTLET FILTERS (Following Orders pattern)
 */
export function OutletFilters({
  filters,
  onFiltersChange,
  onSearchChange,
  onClearFilters
}: OutletFiltersProps) {
  const handleStatusFilter = (value: string) => {
    const status = value === 'all' ? undefined : value;
    onFiltersChange({ ...filters, status });
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            placeholder="Search outlets..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={handleStatusFilter}
      >
        <SelectTrigger className="w-[150px] h-10">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {(filters.search || filters.status) && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-10"
        >
          Clear
        </Button>
      )}
    </>
  );
}
