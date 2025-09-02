import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Input } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { OrderFilters as OrderFiltersType } from '@rentalshop/types';
import { useThrottledSearch } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';

// Define constants locally to avoid import issues
const ORDER_TYPES = {
  RENT: 'RENT',
  SALE: 'SALE'
} as const;

const ORDER_STATUSES = {
  BOOKED: 'BOOKED',
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

interface Outlet {
  id: number;
  name: string;
}

export function OrderFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: OrderFiltersProps) {
  // State for dynamic filter options
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [outletError, setOutletError] = useState<string | null>(null);

  // Fetch outlets on component mount
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        setLoadingOutlets(true);
        setOutletError(null);
        const result = await outletsApi.getOutlets();
        if (result.success && result.data?.outlets) {
          setOutlets(result.data.outlets);
        } else {
          setOutletError('Failed to load outlets');
          setOutlets([]);
        }
      } catch (error) {
        console.error('Failed to fetch outlets:', error);
        setOutletError('Failed to load outlets');
        setOutlets([]);
      } finally {
        setLoadingOutlets(false);
      }
    };

    fetchOutlets();
  }, []);

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

  // Memoize order type options
  const orderTypeOptions = useMemo(() => [
    { value: 'all', label: 'All Types' },
    { value: ORDER_TYPES.RENT, label: 'Rental' },
    { value: ORDER_TYPES.SALE, label: 'Sale' }
  ], []);

  // Memoize status options
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: ORDER_STATUSES.BOOKED, label: 'Booked' },
    { value: ORDER_STATUSES.ACTIVE, label: 'Active' },
    { value: ORDER_STATUSES.RETURNED, label: 'Returned' },
    { value: ORDER_STATUSES.COMPLETED, label: 'Completed' },
    { value: ORDER_STATUSES.CANCELLED, label: 'Cancelled' }
  ], []);

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
              <Select 
                value={Array.isArray(filters.status) ? filters.status[0] || 'all' : (filters.status || 'all')} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className={option.value === 'all' ? 'font-medium' : ''}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                  {orderTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className={option.value === 'all' ? 'font-medium' : ''}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Outlet Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Outlet
              </label>
              <Select value={filters.outletId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('outletId', value === 'all' ? undefined : parseInt(value))}>
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder={loadingOutlets ? "Loading..." : "All Outlets"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Outlets</SelectItem>
                  {loadingOutlets ? (
                    <SelectItem value="loading" disabled>Loading outlets...</SelectItem>
                  ) : outletError ? (
                    <SelectItem value="error" disabled className="text-red-500">Error loading outlets</SelectItem>
                  ) : outlets.length === 0 ? (
                    <SelectItem value="none" disabled className="text-gray-500">No outlets available</SelectItem>
                  ) : (
                    outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {outletError && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {outletError}
                </p>
              )}
              {!loadingOutlets && !outletError && outlets.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No outlets available for your role
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
