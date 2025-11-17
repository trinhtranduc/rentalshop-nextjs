'use client';

import React from 'react';
import { 
  Pagination,
  EmptyState,
  Card,
  CardContent
} from '@rentalshop/ui';
import { OutletTable, OutletSearch } from './components';
import { Building2 } from 'lucide-react';
import type { Outlet, OutletFilters } from '@rentalshop/types';
import { useOutletsTranslations } from '@rentalshop/hooks';

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
  
  // Get translations
  const t = useOutletsTranslations();
  
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
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <OutletSearch
                value={filters.q || ''}
                onChange={memoizedOnSearchChange}
                onClear={() => memoizedOnSearchChange('')}
              />
            </div>
          </CardContent>
        </Card>
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
            title={t('messages.noOutlets')}
            description={
              filters.q
                ? t('messages.tryAdjustingSearch')
                : t('messages.getStarted')
            }
          />
        )}
      </div>

      {/* Fixed Pagination Section */}
      {outlets.length > 0 && totalOutlets > limit && (
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
