'use client';

import React, { useCallback } from 'react';
import { Input, Button, SearchableSelect } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { ProductFilters as ProductFiltersType, Category, Outlet } from '@rentalshop/types';
import { useOutletsData, useCategoriesData, useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { Search, Sparkles } from 'lucide-react';
import { ImageSearchDialog } from './ImageSearchDialog';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onImageSearchResult?: (products: any[]) => void;
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
export function ProductFilters({ filters, onFiltersChange, onSearchChange, onClearFilters, onImageSearchResult }: ProductFiltersProps) {
  // Get translations
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  // Image search dialog state
  const [showImageSearch, setShowImageSearch] = React.useState(false);
  
  // ✅ MODERN: Use deduplicated hooks for filter data
  const { outlets, loading: loadingOutlets } = useOutletsData();
  const { categories, loading: loadingCategories } = useCategoriesData();

  // Debug logging
  console.log('🔍 ProductFilters: Categories data:', {
    categories,
    isArray: Array.isArray(categories),
    count: categories?.length || 0,
    loading: loadingCategories,
    firstCategory: categories?.[0]?.name || 'none'
  });

  // Prepare category options for SearchableSelect
  const categoryOptions = React.useMemo(() => {
    console.log('🔍 ProductFilters: Creating category options from:', {
      categoriesCount: categories.length,
      categories: categories.slice(0, 3),
      loading: loadingCategories,
      isArray: Array.isArray(categories)
    });
    
    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('⚠️ ProductFilters: No categories available');
      return [];
    }
    
    const allOption = { value: '0', label: t('filters.allCategories'), subtitle: t('filters.allCategories') };
    const categoryOpts = categories
      .filter((category: Category) => category && category.id) // Filter out invalid categories
      .map((category: Category) => ({
        value: category.id.toString(),
        label: category.name || 'Unnamed Category',
        subtitle: category.description || category.name || 'Unnamed Category'
      }));
    
    const result = [allOption, ...categoryOpts];
    console.log('✅ ProductFilters: Category options created:', {
      allOption,
      categoryOpts: categoryOpts.slice(0, 3),
      total: result.length
    });
    return result;
  }, [categories, t, loadingCategories]);

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================

  // Local state cho search input
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  
  // Sync với filters.search khi thay đổi từ bên ngoài (ví dụ: clear filters)
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Handle input change - chỉ cập nhật local state
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    // KHÔNG gọi onSearchChange ở đây - chỉ gọi khi nhấn Enter
  }, []);

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(localSearch);
    }
  }, [localSearch, onSearchChange]);

  const handleOutletChange = useCallback((value: string) => {
    const outletId = value === 'all' ? undefined : parseInt(value);
    onFiltersChange({ outletId });
  }, [onFiltersChange]);

  const handleCategoryChange = useCallback((value: number | undefined) => {
    // Handle undefined or 0 (when "all" is selected)
    // SearchableSelect converts option.value to number, so "all" (0) becomes 0
    if (!value || value === 0) {
      onFiltersChange({ categoryId: undefined });
      return;
    }
    // value is already a number from SearchableSelect
    onFiltersChange({ categoryId: value });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = !!(filters.search || filters.categoryId);

  // ============================================================================
  // RENDER - Compact inline filters (Following Orders pattern)
  // ============================================================================

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={localSearch}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9 h-10"
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
          {/* AI Image Search Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0"
            onClick={() => setShowImageSearch(true)}
            title="AI Image Search"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
          </Button>
        </div>
      </div>

      {/* Image Search Dialog */}
      <ImageSearchDialog
        open={showImageSearch}
        onOpenChange={setShowImageSearch}
        onSearchResult={(products) => {
          if (onImageSearchResult) {
            onImageSearchResult(products);
          }
          setShowImageSearch(false);
        }}
        categoryId={filters.categoryId}
      />

      {/* Category Filter - SearchableSelect for better UX with many categories */}
      {categoryOptions.length > 0 && (
        <SearchableSelect
          value={filters.categoryId}
          onChange={(value) => handleCategoryChange(value)}
          options={categoryOptions}
          placeholder={loadingCategories ? (t('filters.loading') || 'Loading...') : t('filters.allCategories')}
          searchPlaceholder="Search categories..."
          className="w-[200px]"
          emptyText="No categories found"
        disabled={loadingCategories}
        />
      )}
      {categoryOptions.length === 0 && !loadingCategories && (
        <div className="w-[200px] h-10 flex items-center px-3 text-sm text-gray-500">
          No categories available
        </div>
      )}
      {loadingCategories && (
        <div className="w-[200px] h-10 flex items-center px-3 text-sm text-gray-500">
          {t('filters.loading') || 'Loading...'}
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-10"
        >
          {t('filters.clear')}
        </Button>
      )}
    </>
  );
}
