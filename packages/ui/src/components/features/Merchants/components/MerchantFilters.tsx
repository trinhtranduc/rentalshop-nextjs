import React from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui/base';

interface MerchantFiltersData {
  search: string;
  status: string;
  plan: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface MerchantFiltersProps {
  filters: MerchantFiltersData;
  onFiltersChange: (filters: MerchantFiltersData) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

/**
 * ✅ COMPACT MERCHANT FILTERS (Following Orders pattern)
 * - No card wrapper (parent wraps)
 * - h-10 height for all inputs
 * - No labels, clean inline layout
 * - Responsive flex-wrap
 */
export function MerchantFilters({ 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters 
}: MerchantFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handlePlanChange = (value: string) => {
    onFiltersChange({ ...filters, plan: value });
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search merchants..."
            value={filters.search}
            onChange={handleSearchChange}
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
      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px] h-10">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
        </SelectContent>
      </Select>

      {/* Plan Filter */}
      <Select value={filters.plan} onValueChange={handlePlanChange}>
        <SelectTrigger className="w-[160px] h-10">
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Plans</SelectItem>
          <SelectItem value="Basic">Basic</SelectItem>
          <SelectItem value="Professional">Professional</SelectItem>
          <SelectItem value="Enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {onClearFilters && (filters.search || filters.status !== 'all' || filters.plan !== 'all') && (
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

export default MerchantFilters;
