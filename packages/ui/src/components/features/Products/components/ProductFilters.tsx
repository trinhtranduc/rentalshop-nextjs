import React from 'react';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { ProductFilters as ProductFiltersType } from '../types';
import { useThrottledSearch } from '@rentalshop/ui';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function ProductFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: ProductFiltersProps) {
  // Use throttled search to prevent excessive API calls
  const { query, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 500, // Wait 500ms after user stops typing
    minLength: 2, // Only search after 2+ characters
    onSearch: (searchQuery: string) => {
      // This only fires after the delay, not on every keystroke
      onSearchChange(searchQuery); // Use separate search handler
    }
  });

  const handleFilterChange = (key: keyof ProductFiltersType, value: any) => {
    // For non-search filters, update immediately
    if (key !== 'search') {
      onFiltersChange({
        ...filters,
        [key]: value
      });
    }
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Products
            </label>
            <Input
              placeholder="Search by name, barcode..."
              value={query} // Use the throttled query state
              onChange={(e) => throttledSearchChange(e.target.value)} // Use throttled handler
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Outlet
            </label>
            <Select value={filters.outlet || 'all'} onValueChange={(value) => handleFilterChange('outlet', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                <SelectItem value="main">Main Store</SelectItem>
                <SelectItem value="branch1">Branch 1</SelectItem>
                <SelectItem value="branch2">Branch 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {onClearFilters && (
          <div className="flex justify-end">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
