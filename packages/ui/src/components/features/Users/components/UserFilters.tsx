import React, { useCallback, useMemo } from 'react';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import type { UserFilters } from '@rentalshop/types';
import { useThrottledSearch } from '@rentalshop/hooks';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function UserFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: UserFiltersProps) {
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

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    // For non-search filters, update immediately
    if (key !== 'search') {
      onFiltersChange({
        ...filters,
        [key]: value,
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
          User Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search - Full Width */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Users
            </label>
            <Input
              placeholder="Search by name, email..."
              value={query} // Use the throttled query state
              onChange={handleInputChange} // Use our throttled handler
              className="w-full"
            />
          </div>

          {/* Role Filter - Right Aligned */}
          <div className="space-y-2 md:w-32">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="MERCHANT">Merchant</SelectItem>
                <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        
      </CardContent>
    </Card>
  );
}
