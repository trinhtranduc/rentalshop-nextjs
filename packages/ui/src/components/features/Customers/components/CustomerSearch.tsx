import React, { useCallback } from 'react';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { CustomerFilters } from '@rentalshop/types';

interface CustomerSearchProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function CustomerSearch({ filters, onFiltersChange, onSearchChange, onClearFilters }: CustomerSearchProps) {
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
    // Let the parent component handle throttling
    onSearchChange(e.target.value);
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
              value={filters.search || ''} // Use the search term from filters
              onChange={handleInputChange} // Use our direct handler
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
