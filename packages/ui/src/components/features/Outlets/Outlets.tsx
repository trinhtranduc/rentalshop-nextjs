'use client';

import React from 'react';
import { 
  Pagination,
  EmptyState
} from '@rentalshop/ui';
import { OutletTable, OutletSearch } from './components';
import { Building2 } from 'lucide-react';
import type { Outlet, OutletFilters } from '@rentalshop/types';

// Data interface for outlets list
export interface OutletsData {
  outlets: Outlet[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface OutletsProps {
  // Data props
  data?: OutletsData;
  filters?: OutletFilters;
  onSearchChange?: (searchValue: string) => void;
  onOutletAction?: (action: string, outletId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  
  // Display props
  currentUser?: any;
  className?: string;
}

/**
 * ✅ SIMPLIFIED OUTLETS COMPONENT (Modern Pattern)
 */
export const Outlets: React.FC<OutletsProps> = ({
  data,
  filters = {},
  onSearchChange = () => {},
  onOutletAction = () => {},
  onPageChange = () => {},
  onSort = () => {},
  currentUser,
  className = ""
}) => {
  
  const outlets = data?.outlets || [];
  const totalOutlets = data?.total || 0;
  const currentPage = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const limit = data?.limit || 25;

  // Memoize handlers
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnOutletAction = React.useCallback(onOutletAction, [onOutletAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort, [onSort]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Fixed Search Section */}
      <div className="flex-shrink-0 mb-4">
        <OutletSearch
          value={filters.q || ''}
          onChange={memoizedOnSearchChange}
          onClear={() => memoizedOnSearchChange('')}
        />
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0">
        {outlets.length > 0 ? (
          <OutletTable
            outlets={outlets}
            onOutletAction={memoizedOnOutletAction}
            sortBy={filters.sortBy || "createdAt"}
            sortOrder={filters.sortOrder || "desc"}
            onSort={memoizedOnSort}
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="No outlets found"
            description={
              filters.q
                ? 'Try adjusting your search'
                : 'Get started by adding your first outlet'
            }
          />
        )}
      </div>

      {/* Fixed Pagination Section */}
      {outlets.length > 0 && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalOutlets}
            limit={limit}
            onPageChange={memoizedOnPageChange}
            itemName="outlets"
          />
        </div>
      )}
    </div>
  );
};

export default Outlets;
