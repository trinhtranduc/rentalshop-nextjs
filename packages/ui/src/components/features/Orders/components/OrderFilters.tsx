'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button, SearchableSelect } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardContent } from '@rentalshop/ui';
import { OrderFilters as OrderFiltersType } from '@rentalshop/types';
import { outletsApi } from '@rentalshop/utils';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  userRole?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF'; // Add user role for conditional logic
}

interface Outlet {
  id: number;
  name: string;
}

interface Merchant {
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
  onClearFilters,
  userRole = 'ADMIN' // Default to ADMIN for backward compatibility
}: OrderFiltersProps) {
  // Get translations
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  
  // ============================================================================
  // LOCAL STATE - Only for UI optimization
  // ============================================================================
  
  // Local search state for immediate input feedback (debounced by parent)
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  
  // Outlets for dropdown
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [outletError, setOutletError] = useState<string | null>(null);
  
  // Merchants for dropdown (admin only)
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);

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
  // OUTLET FILTERING - Fetch outlets for dropdown
  // ============================================================================
  
  // Determine if outlet filter should be shown (completely hidden for outlet users)
  const shouldShowOutletFilter = React.useMemo(() => {
    // OUTLET_ADMIN and OUTLET_STAFF should not see outlet filter (they only have one outlet)
    if (userRole === 'OUTLET_ADMIN' || userRole === 'OUTLET_STAFF') {
      return false;
    }
    return true; // ADMIN and MERCHANT can see outlet filter
  }, [userRole]);

  // Determine if outlet filter should be enabled (can interact with it)
  const isOutletFilterEnabled = React.useMemo(() => {
    if (!shouldShowOutletFilter) {
      return false; // Hidden, so not enabled
    }
    if (userRole === 'MERCHANT') {
      return true; // Merchants can always filter by outlet (they have multiple outlets)
    }
    if (userRole === 'ADMIN') {
      return 'merchantId' in filters && (filters as any).merchantId; // Admin needs merchant selected first
    }
    return false;
  }, [userRole, filters, shouldShowOutletFilter]);

  // ✅ Extract merchantId from filters to avoid object reference changes
  const merchantId = React.useMemo(() => {
    return (userRole === 'ADMIN' && 'merchantId' in filters && (filters as any).merchantId) 
      ? (filters as any).merchantId 
      : null;
  }, [userRole, filters]);

  // ✅ Use AbortController to cancel duplicate requests (standard pattern)
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Fetch outlets based on user role and selected merchant
  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch if filter should be hidden
    if (!shouldShowOutletFilter) {
      setOutlets([]);
      return;
    }

    // Don't fetch if filter is disabled (waiting for merchant selection for ADMIN)
    if (!isOutletFilterEnabled) {
      setOutlets([]);
      return;
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchOutlets = async () => {
      try {
        setLoadingOutlets(true);
        setOutletError(null);
        
        let result;
        if (userRole === 'ADMIN' && merchantId) {
          // Admin: fetch outlets for selected merchant
          result = await outletsApi.getOutletsByMerchant(merchantId);
        } else {
          // Merchant: fetch all outlets (they can only see their own via backend filtering)
          result = await outletsApi.getOutlets();
        }
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        if (result.success && result.data?.outlets) {
          setOutlets(result.data.outlets);
        } else {
          setOutletError('Failed to load outlets');
          setOutlets([]);
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Error fetching outlets:', error);
        setOutletError('Failed to load outlets');
        setOutlets([]);
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setLoadingOutlets(false);
        }
      }
    };

    fetchOutlets();

    // Cleanup: abort request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [shouldShowOutletFilter, isOutletFilterEnabled, userRole, merchantId]);

  // ============================================================================
  // FETCH MERCHANTS (admin only, one-time)
  // ===========================================================================-
  
  useEffect(() => {
    // Only fetch merchants for ADMIN users
    if (userRole === 'ADMIN') {
      const fetchMerchants = async () => {
        try {
          setLoadingMerchants(true);
          setMerchantError(null);
          const { merchantsApi } = await import('@rentalshop/utils');
          const result = await merchantsApi.getMerchants();
          if (result.success && result.data?.merchants) {
            setMerchants(result.data.merchants);
          } else {
            setMerchantError('Failed to load merchants');
            setMerchants([]);
          }
        } catch (error) {
          console.error('Error fetching merchants:', error);
          setMerchantError('Failed to load merchants');
          setMerchants([]);
        } finally {
          setLoadingMerchants(false);
        }
      };

      fetchMerchants();
    }
  }, [userRole]); // Run when userRole changes

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
    console.log(`🔧 OrderFilters: handleFilterChange - ${key}:`, value);
    console.log(`🔧 OrderFilters: current filters:`, filters);
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // ============================================================================
  // RENDER - Compact inline filters (no card wrapper)
  // ============================================================================
  
  return (
    <>
      {/* Compact single-line filters */}
          {/* Search Field - Larger width */}
          <div className="flex-1 min-w-[280px]">
            <div className="relative">
              <Input
                placeholder={t('search.placeholder')}
                value={localSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
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
          
          {/* Status Filter */}
          <Select 
            value={(filters.status as string) || 'all'} 
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder={t('filters.statusLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
              <SelectItem value={ORDER_STATUS.RESERVED}>{t('status.RESERVED')}</SelectItem>
              <SelectItem value={ORDER_STATUS.PICKUPED}>{t('status.PICKUPED')}</SelectItem>
              <SelectItem value={ORDER_STATUS.RETURNED}>{t('status.RETURNED')}</SelectItem>
              <SelectItem value={ORDER_STATUS.COMPLETED}>{t('status.COMPLETED')}</SelectItem>
              <SelectItem value={ORDER_STATUS.CANCELLED}>{t('status.CANCELLED')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Order Type Filter */}
          <Select 
            value={filters.orderType || 'all'} 
            onValueChange={(value) => handleFilterChange('orderType', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-[130px] h-10">
              <SelectValue placeholder={t('filters.typeLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              <SelectItem value={ORDER_TYPE.RENT}>{t('orderType.RENT')}</SelectItem>
              <SelectItem value={ORDER_TYPE.SALE}>{t('orderType.SALE')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Merchant Filter - SearchableSelect (Admin only) */}
          {userRole === 'ADMIN' && (
            <SearchableSelect
              value={(filters as any).merchantId as number | undefined}
              onChange={(value) => handleFilterChange('merchantId' as keyof OrderFiltersType, value || undefined)}
              options={merchants.map(merchant => ({
                value: merchant.id.toString(),
                label: merchant.name,
                subtitle: merchant.name
              }))}
              placeholder={loadingMerchants ? t('filters.loading') : merchantError ? t('filters.error') : 'All Merchants'}
              searchPlaceholder="Search merchants..."
              className="w-[200px]"
              emptyText="No merchants found"
            />
          )}
          
          {/* Outlet Filter - SearchableSelect (Hidden for OUTLET users) */}
          {shouldShowOutletFilter && (
          <SearchableSelect
            value={filters.outletId ? Number(filters.outletId) : undefined}
            onChange={(value) => handleFilterChange('outletId', value || undefined)}
            options={outlets.map(outlet => ({
              value: outlet.id.toString(),
              label: outlet.name,
              subtitle: outlet.name
            }))}
            placeholder={
              !isOutletFilterEnabled 
                ? (userRole === 'ADMIN' ? 'Select merchant first' : 'All Outlets')
                : loadingOutlets 
                  ? t('filters.loading') 
                  : outletError 
                    ? t('filters.error') 
                    : t('filters.allOutlets')
            }
            searchPlaceholder="Search outlets..."
            className="w-[200px]"
            emptyText="No outlets found"
            disabled={!isOutletFilterEnabled}
          />
          )}
          
      {/* Clear Filters Button */}
      {onClearFilters && (filters.status || filters.orderType || filters.outletId || (filters as any).merchantId || localSearch) && (
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
});
