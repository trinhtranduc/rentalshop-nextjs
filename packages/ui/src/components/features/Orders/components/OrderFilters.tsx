'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardContent } from '@rentalshop/ui';
import { OrderFilters as OrderFiltersType } from '@rentalshop/types';
import { outletsApi } from '@rentalshop/utils';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';

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

/**
 * ✅ CLEAN CONTROLLED COMPONENT
 * - No internal state for filters (fully controlled)
 * - Local state only for search input (immediate feedback)
 * - Parent handles all filter logic
 * - Simple and predictable
 */
export const OrderFilters = React.memo(function OrderFilters({ 
  filters, 
  onFiltersChange, 
  onSearchChange, 
  onClearFilters 
}: OrderFiltersProps) {
  // ============================================================================
  // LOCAL STATE - Only for UI optimization
  // ============================================================================
  
  // Local search state for immediate input feedback (debounced by parent)
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  
  // Outlets for dropdown
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [outletError, setOutletError] = useState<string | null>(null);

  // ============================================================================
  // SYNC LOCAL SEARCH WITH FILTERS (for clear button, etc)
  // ============================================================================
  
  useEffect(() => {
    // Only sync if external change (not from user typing)
    const externalSearch = filters.search || '';
    if (externalSearch !== localSearch) {
      console.log('🔄 OrderFilters: Syncing search from external:', externalSearch);
      setLocalSearch(externalSearch);
    }
  }, [filters.search]); // Only watch filters.search, not localSearch

  // ============================================================================
  // FETCH OUTLETS (one-time)
  // ============================================================================
  
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
        console.error('Error fetching outlets:', error);
        setOutletError('Failed to load outlets');
        setOutlets([]);
      } finally {
        setLoadingOutlets(false);
      }
    };

    fetchOutlets();
  }, []); // Only run once

  // ============================================================================
  // HANDLERS - Simple passthrough to parent
  // ============================================================================
  
  const handleSearchInput = (value: string) => {
    console.log('⌨️ OrderFilters: Search input changed:', value);
    // Update local state for immediate UI feedback
    setLocalSearch(value);
    // Notify parent (parent handles debouncing via URL update)
    onSearchChange(value);
  };

  const handleFilterChange = (key: keyof OrderFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
      <CardContent className="pt-6 space-y-6">
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
                  value={localSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="pl-10 pr-4 py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
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
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select 
                value={(filters.status as string) || 'all'} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Status</SelectItem>
                  <SelectItem value={ORDER_STATUS.RESERVED}>Reserved</SelectItem>
                  <SelectItem value={ORDER_STATUS.PICKUPED}>Picked Up</SelectItem>
                  <SelectItem value={ORDER_STATUS.RETURNED}>Returned</SelectItem>
                  <SelectItem value={ORDER_STATUS.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={ORDER_STATUS.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Order Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order Type
              </label>
              <Select 
                value={filters.orderType || 'all'} 
                onValueChange={(value) => handleFilterChange('orderType', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Types</SelectItem>
                  <SelectItem value={ORDER_TYPE.RENT}>Rental</SelectItem>
                  <SelectItem value={ORDER_TYPE.SALE}>Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Outlet Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Outlet
                </label>
                {filters.outletId && (
                  <Button
                    variant="link"
                    onClick={() => handleFilterChange('outletId', undefined)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline p-0 h-auto"
                  >
                    × Clear
                  </Button>
                )}
              </div>
              <Select 
                value={filters.outletId ? filters.outletId.toString() : 'all'} 
                onValueChange={(value) => {
                  const newValue = value === 'all' ? undefined : parseInt(value);
                  handleFilterChange('outletId', newValue);
                }}
              >
                <SelectTrigger className="py-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200">
                  <SelectValue placeholder="All Outlets" />
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
});
