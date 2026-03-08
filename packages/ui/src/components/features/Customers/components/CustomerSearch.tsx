"use client";

import React, { useCallback } from 'react';
import { Input, Button, SearchableSelect } from '@rentalshop/ui';
import { CustomerFilters } from '@rentalshop/types';
import { useCustomerTranslations, useCommonTranslations, useMerchantsData } from '@rentalshop/hooks';

interface CustomerSearchProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  showMerchantFilter?: boolean; // Show merchant filter (for admin customers page)
}

/**
 * ✅ COMPACT CUSTOMER SEARCH (Following Orders pattern)
 * - No card wrapper (parent wraps)
 * - h-10 height
 * - No labels, clean inline
 */
export function CustomerSearch({ filters, onFiltersChange, onSearchChange, onClearFilters, showMerchantFilter = false }: CustomerSearchProps) {
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  
  // Fetch merchants for filter (only if showMerchantFilter is true)
  const { data: merchantsData, loading: loadingMerchants } = useMerchantsData({ 
    filters: { page: 1, limit: 1000 }, 
    enabled: showMerchantFilter 
  });
  
  // Prepare merchant options for SearchableSelect
  const merchantOptions = React.useMemo(() => {
    const merchants = merchantsData?.merchants || [];
    
    if (!Array.isArray(merchants) || merchants.length === 0) {
      return [];
    }
    
    const allOption = { value: '0', label: 'All Merchants', subtitle: 'All Merchants' };
    const merchantOpts = merchants
      .filter((merchant: any) => merchant && merchant.id)
      .map((merchant: any) => ({
        value: merchant.id.toString(),
        label: merchant.name || 'Unnamed Merchant',
        subtitle: merchant.name || 'Unnamed Merchant'
      }));
    
    return [allOption, ...merchantOpts];
  }, [merchantsData?.merchants, loadingMerchants]);
  
  // Sync với filters.search khi thay đổi từ bên ngoài (ví dụ: clear filters)
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);
  
  // Handle input change - chỉ cập nhật local state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(localSearch);
    }
  };

  const handleMerchantChange = useCallback((value: number | undefined) => {
    // Handle undefined or 0 (when "all" is selected)
    if (!value || value === 0) {
      onFiltersChange({ merchantId: undefined });
      return;
    }
    // value is already a number from SearchableSelect
    onFiltersChange({ merchantId: value });
  }, [onFiltersChange]);

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            placeholder={t('search.placeholder')}
            value={localSearch}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="pl-9 h-10"
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
        </div>
      </div>

      {/* Merchant Filter - Only show for admin */}
      {showMerchantFilter && (
        <>
          {merchantOptions.length > 0 && (
            <SearchableSelect
              value={filters.merchantId}
              onChange={(value) => handleMerchantChange(value)}
              options={merchantOptions}
              placeholder={loadingMerchants ? 'Loading...' : 'All Merchants'}
              searchPlaceholder="Search merchants..."
              className="w-[200px]"
              emptyText="No merchants found"
              disabled={loadingMerchants}
            />
          )}
          {merchantOptions.length === 0 && !loadingMerchants && (
            <div className="w-[200px] h-10 flex items-center px-3 text-sm text-gray-500">
              No merchants available
            </div>
          )}
          {loadingMerchants && (
            <div className="w-[200px] h-10 flex items-center px-3 text-sm text-gray-500">
              Loading...
            </div>
          )}
        </>
      )}

      {/* Clear Search */}
      {(filters.search || filters.merchantId) && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-10"
        >
          {tc('buttons.clear')}
        </Button>
      )}
    </>
  );
}
