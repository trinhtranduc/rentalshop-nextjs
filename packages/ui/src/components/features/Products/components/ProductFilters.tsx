import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Input } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { ProductFilters as ProductFiltersType } from '@rentalshop/types';
import { useThrottledSearch } from '@rentalshop/hooks';
import { outletsApi, categoriesApi } from '@rentalshop/utils';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

interface Outlet {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

export function ProductFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: ProductFiltersProps) {
  // State for dynamic filter options
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [outletError, setOutletError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Fetch outlets and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch outlets
      try {
        setLoadingOutlets(true);
        setOutletError(null);
        console.log('🔍 ProductFilters: Fetching outlets...');
        const result = await outletsApi.getOutlets();
        console.log('🔍 ProductFilters: Outlets API result:', result);
        if (result.success && result.data?.outlets) {
          console.log('🔍 ProductFilters: Setting outlets:', result.data.outlets);
          setOutlets(result.data.outlets);
        } else {
          console.log('🔍 ProductFilters: Failed to load outlets - result:', result);
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

      // Fetch categories
      try {
        setLoadingCategories(true);
        setCategoryError(null);
        const result = await categoriesApi.getCategories();
        if (result.success && result.data) {
          setCategories(result.data);
        } else {
          setCategoryError('Failed to load categories');
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategoryError('Failed to load categories');
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  // Let the parent hook handle throttling

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
              value={filters.search || ''} // Use the search term from filters
              onChange={(e) => onSearchChange(e.target.value)} // Use direct handler
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <Select value={filters.categoryId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('categoryId', value === 'all' ? undefined : parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {loadingCategories ? (
                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                ) : categoryError ? (
                  <SelectItem value="error" disabled className="text-red-500">Error loading categories</SelectItem>
                ) : categories.length === 0 ? (
                  <SelectItem value="none" disabled className="text-gray-500">No categories available</SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {categoryError && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {categoryError}
              </p>
            )}
            {!loadingCategories && !categoryError && categories.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No categories available for your role
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Outlet
            </label>
            <Select value={filters.outletId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('outletId', value === 'all' ? undefined : parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOutlets ? "Loading..." : "All Outlets"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {loadingOutlets ? (
                  <SelectItem value="loading" disabled>Loading outlets...</SelectItem>
                ) : outletError ? (
                  <SelectItem value="error" disabled className="text-red-500">Error loading outlets</SelectItem>
                ) : outlets.length === 0 ? (
                  <SelectItem value="none" disabled className="text-gray-500">No outlets available</SelectItem>
                ) : (
                  outlets.map((outlet) => {
                    console.log('🔍 ProductFilters: Rendering outlet:', outlet);
                    return (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    );
                  })
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

        
      </CardContent>
    </Card>
  );
}
