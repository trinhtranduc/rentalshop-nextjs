'use client';

import React from 'react';
import { 
  OutletHeader, 
  OutletFilters, 
  OutletGrid, 
  OutletTable, 
  OutletActions, 
  OutletPagination,
} from './components';
import { 
  OutletData, 
  OutletFilters as OutletFiltersType,
  Outlet
} from '@rentalshop/types';

interface OutletsProps {
  data: OutletData;
  filters: OutletFiltersType;
  viewMode: 'grid' | 'table';
  onFiltersChange: (filters: OutletFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onOutletAction: (action: string, outletId: number) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
  // Enhanced props for outlet management
  merchantId?: number;
  onOutletCreated?: (outlet: Outlet) => void;
  onOutletUpdated?: (outlet: Outlet) => void;
  onError?: (error: string) => void;
}

// Export the main Outlets component
export function Outlets({ 
  data, 
  filters, 
  viewMode, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onViewModeChange, 
  onOutletAction, 
  onPageChange,
  onSort,
  // Enhanced props
  merchantId = '',
  onOutletCreated,
  onOutletUpdated,
  onError
}: OutletsProps) {
  
  return (
    <div className="space-y-6">
      {/* Header with view mode toggle and actions */}
      <OutletHeader
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onAddOutlet={() => onOutletAction('add', 0)}
        totalOutlets={data.outlets.length}
        merchantId={merchantId}
      />

      {/* Filters */}
      <OutletFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />

      {/* Content */}
      {viewMode === 'grid' ? (
        <OutletGrid
          outlets={data.outlets}
          onOutletAction={onOutletAction}
        />
      ) : (
        <OutletTable
          outlets={data.outlets}
          onOutletAction={onOutletAction}
          onSort={onSort}
        />
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <OutletPagination
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
