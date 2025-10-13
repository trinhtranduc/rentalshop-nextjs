'use client';

import React, { useCallback } from 'react';
import { Input } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { ProductFilters as ProductFiltersType } from '@rentalshop/types';
import { useOutletsData, useCategoriesData } from '@rentalshop/hooks';
import { Search } from 'lucide-react';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

/**
 * ✅ SIMPLIFIED PRODUCT FILTERS COMPONENT
 * 
 * Only 3 essential filters:
 * 1. Search input
 * 2. Outlet filter
 * 3. Category filter
 * 
 * Features:
 * - Uses deduplicated hooks for filter data (no duplicate API calls)
 * - Clean and minimal UI
 * - Responsive grid layout
 */
export function ProductFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: ProductFiltersProps) {
  // ✅ MODERN: Use deduplicated hooks for filter data
  const { outlets, loading: loadingOutlets } = useOutletsData();
  const { categories, loading: loadingCategories } = useCategoriesData();

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
  }, [onSearchChange]);

  const handleOutletChange = useCallback((value: string) => {
    const outletId = value === 'all' ? undefined : parseInt(value);
    onFiltersChange({ outletId });
  }, [onFiltersChange]);

  const handleCategoryChange = useCallback((value: string) => {
    const categoryId = value === 'all' ? undefined : parseInt(value);
    onFiltersChange({ categoryId });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = !!(filters.search || filters.outletId || filters.categoryId);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card>
      <CardHeader className="pb-1">
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, barcode..."
                value={filters.search || ''}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
          </div>

          {/* Outlet Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Outlet</label>
            <Select
              value={filters.outletId?.toString() || 'all'}
              onValueChange={handleOutletChange}
              disabled={loadingOutlets}
            >
              <SelectTrigger>
                <SelectValue placeholder="All outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id.toString()}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select
              value={filters.categoryId?.toString() || 'all'}
              onValueChange={handleCategoryChange}
              disabled={loadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
