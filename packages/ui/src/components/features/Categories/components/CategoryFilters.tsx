'use client'

import React from 'react';
import { Input, Button } from '@rentalshop/ui';
import type { CategorySearchParams as CategoryFiltersType } from '@rentalshop/types';

interface CategoryFiltersProps {
  filters: CategoryFiltersType;
  onFiltersChange: (filters: CategoryFiltersType) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort?: { field: string; order: 'asc' | 'desc' };
}

/**
 * ✅ COMPACT CATEGORY FILTERS (Following Orders pattern)
 */
export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  filters,
  onSearchChange,
  onClearFilters
}) => {
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  
  // Sync với filters.search khi thay đổi từ bên ngoài (ví dụ: clear filters)
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Handle input change - chỉ cập nhật local state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(localSearch);
    }
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search categories..."
            value={localSearch}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
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

      {/* Clear Filters */}
      {filters.search && (
        <Button
          onClick={onClearFilters}
          variant="outline"
          size="sm"
          className="h-10"
        >
          Clear
        </Button>
      )}
    </>
  );
};
