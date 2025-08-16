import React, { useCallback, useMemo } from 'react';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Button } from '../../../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { OrderFilters as OrderFiltersType } from '../types';
import { useThrottledSearch } from '../../../../hooks/useThrottledSearch';

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function OrderFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: OrderFiltersProps) {
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

  const handleFilterChange = (key: keyof OrderFiltersType, value: any) => {
    // For non-search filters, update immediately
    if (key !== 'search') {
      onFiltersChange({
        ...filters,
        [key]: value
      });
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
      <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Order Search & Filters
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Find and filter orders with precision
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Primary Filters */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search Field */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Orders
              </label>
              <div className="relative">
                <Input
                  placeholder="Order #, customer name..."
                  value={query} // Use the throttled query state
                  onChange={(e) => throttledSearchChange(e.target.value)} // Use throttled handler directly
                  className="pl-10 pr-4 py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Order Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order Type
              </label>
              <Select value={filters.orderType || 'all'} onValueChange={(value) => handleFilterChange('orderType', value === 'all' ? '' : value)}>
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Types</SelectItem>
                  <SelectItem value="RENT">Rental</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="RENT_TO_OWN">Rent to Own</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Outlet Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Outlet
              </label>
              <Select value={filters.outlet || 'all'} onValueChange={(value) => handleFilterChange('outlet', value === 'all' ? '' : value)}>
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Outlets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Outlets</SelectItem>
                  <SelectItem value="main">Main Store</SelectItem>
                  <SelectItem value="branch1">Branch 1</SelectItem>
                  <SelectItem value="branch2">Branch 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
