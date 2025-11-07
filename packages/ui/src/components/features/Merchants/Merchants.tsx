import React from 'react';
import { 
  MerchantListHeader,
  MerchantFilters,
  MerchantTable
} from './components';
import { Pagination, Card, CardContent } from '@rentalshop/ui/base';
import type { Merchant } from '@rentalshop/types';

interface MerchantFiltersData {
  search: string;
  status: string;
  plan: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface MerchantsData {
  merchants: Merchant[];
  total: number;
  currentPage: number;
  page?: number; // Alias for compatibility
  totalPages: number;
  limit: number;
  hasMore: boolean;
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    trialAccounts: number;
    totalRevenue: number;
  };
}

interface MerchantsProps {
  data: MerchantsData;
  filters: MerchantFiltersData;
  onFiltersChange: (filters: MerchantFiltersData) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onMerchantAction: (action: string, merchantId: number) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
}

/**
 * ✅ MODERN MERCHANTS COMPONENT (Standard Pattern)
 * 
 * - Clean presentation component (like Orders, Products, Users)
 * - No internal state management
 * - Works with external data
 * - Single responsibility: render merchants UI
 * - Proper flex layout with pagination at bottom
 */
export function Merchants({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onMerchantAction, 
  onPageChange,
  onSort
}: MerchantsProps) {
  
  // Debug: Log data to check pagination condition
  console.log('🏢 Merchants Component - Data check:', {
    total: data.total,
    currentPage: data.currentPage,
    totalPages: data.totalPages,
    merchantsCount: data.merchants?.length,
    shouldShowPagination: data.total > 0,
    paginationCondition: `data.total > 0 = ${data.total} > 0 = ${data.total > 0}`
  });
  
  // Memoize handlers to prevent child re-renders
  const memoizedOnFiltersChange = React.useCallback(onFiltersChange, [onFiltersChange]);
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnClearFilters = React.useCallback(onClearFilters || (() => {}), [onClearFilters]);
  const memoizedOnMerchantAction = React.useCallback(onMerchantAction, [onMerchantAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort || (() => {}), [onSort]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <MerchantListHeader stats={data.stats} />
        
        {/* Compact Filters - All in one row */}
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <MerchantFilters 
                filters={filters}
                onFiltersChange={memoizedOnFiltersChange}
                onSearchChange={memoizedOnSearchChange}
                onClearFilters={memoizedOnClearFilters}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-4">
        <MerchantTable 
          merchants={data.merchants}
          onMerchantAction={memoizedOnMerchantAction}
          sortBy={filters.sortBy || 'createdAt'}
          sortOrder={filters.sortOrder || 'desc'}
          onSort={memoizedOnSort}
        />
      </div>
      
      {/* Fixed Pagination Section - Always at Bottom */}
      {data.merchants.length > 0 && data.total > data.limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination 
            currentPage={data.currentPage || data.page || 1}
            totalPages={data.totalPages || 1}
            total={data.total || data.merchants.length}
            limit={data.limit || 10}
            onPageChange={memoizedOnPageChange}
            itemName="merchants"
          />
        </div>
      )}
    </div>
  );
}

export default Merchants;
