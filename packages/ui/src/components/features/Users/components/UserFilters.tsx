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
import type { UserFilters } from '@rentalshop/types';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

/**
 * ✅ COMPACT USER FILTERS (Following Orders pattern)
 */
export function UserFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: UserFiltersProps) {
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            placeholder="Search users..."
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

      {/* Role Filter */}
      <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value === 'all' ? '' : value)}>
        <SelectTrigger className="w-[160px] h-10">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="MERCHANT">Merchant</SelectItem>
          <SelectItem value="OUTLET_ADMIN">Outlet Admin</SelectItem>
          <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {(filters.search || filters.role) && onClearFilters && (
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
