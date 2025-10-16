'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button } from '@rentalshop/ui';
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
          
          {/* Outlet Filter */}
          <Select 
            value={filters.outletId ? filters.outletId.toString() : 'all'} 
            onValueChange={(value) => {
              const newValue = value === 'all' ? undefined : parseInt(value);
              handleFilterChange('outletId', newValue);
            }}
          >
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder={t('filters.outletLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allOutlets')}</SelectItem>
              {loadingOutlets ? (
                <SelectItem value="loading" disabled>{t('filters.loading')}</SelectItem>
              ) : outletError ? (
                <SelectItem value="error" disabled>{t('filters.error')}</SelectItem>
              ) : outlets.length === 0 ? (
                <SelectItem value="empty" disabled>{t('filters.noOutlets')}</SelectItem>
              ) : (
                outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id.toString()}>
                    {outlet.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
      {/* Clear Filters Button */}
      {onClearFilters && (filters.status || filters.orderType || filters.outletId || localSearch) && (
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
