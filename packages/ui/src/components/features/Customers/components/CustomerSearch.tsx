import React, { useCallback } from 'react';
import { Input, Button } from '@rentalshop/ui';
import { CustomerFilters } from '@rentalshop/types';

interface CustomerSearchProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

/**
 * ✅ COMPACT CUSTOMER SEARCH (Following Orders pattern)
 * - No card wrapper (parent wraps)
 * - h-10 height
 * - No labels, clean inline
 */
export function CustomerSearch({ filters, onFiltersChange, onSearchChange, onClearFilters }: CustomerSearchProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            placeholder="Search customers..."
            value={filters.search || ''}
            onChange={handleInputChange}
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

      {/* Clear Search */}
      {filters.search && onClearFilters && (
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
