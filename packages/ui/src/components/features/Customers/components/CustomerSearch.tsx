import React, { useCallback, useMemo } from 'react';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { CustomerFilters } from '../types';
import { useThrottledSearch } from '@rentalshop/ui';

interface CustomerSearchProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function CustomerSearch({ filters, onFiltersChange, onSearchChange, onClearFilters }: CustomerSearchProps) {
  // Stabilize the onSearch callback to prevent hook recreation
  const stableOnSearch = useCallback((searchQuery: string) => {
    onSearchChange(searchQuery);
  }, [onSearchChange]);

  // Memoize the options to prevent hook recreation
  const searchOptions = useMemo(() => ({
    delay: 500, // Wait 500ms after user stops typing
    minLength: 2, // Only search after 2+ characters
    onSearch: stableOnSearch
  }), [stableOnSearch]);

  // Use throttled search to prevent excessive API calls
  const { query, handleSearchChange: throttledSearchChange } = useThrottledSearch(searchOptions);

  const handleFilterChange = (key: keyof CustomerFilters, value: any) => {
    // For non-search filters, update immediately
    if (key !== 'search') {
      onFiltersChange({
        ...filters,
        [key]: value
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledSearchChange(e.target.value);
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Customer Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Search and Filters */}
        <div className="flex justify-between items-end gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Customers
            </label>
            <Input
              placeholder="Search by name, email, phone..."
              value={query} // Use the throttled query state
              onChange={handleInputChange} // Use our debug handler
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
              <SelectTrigger className="min-w-[250px] h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
