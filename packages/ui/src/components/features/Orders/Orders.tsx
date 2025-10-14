import React from 'react';
import { 
  OrderHeader,
  OrderFilters as OrderFiltersComponent,
  OrderQuickFilters,
  OrderDateRangeFilter,
  type QuickFilterOption,
  type DateRangeOption,
  OrderTable,
  OrderStats
} from './components';
import { Pagination, Card, CardContent } from '@rentalshop/ui';
import { AlertCircle } from 'lucide-react';
import type { OrdersData, OrderFilters } from '@rentalshop/types';

interface OrdersProps {
  data: OrdersData;
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onOrderAction: (action: string, orderNumber: string) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
  onQuickFilterChange?: (filter: QuickFilterOption | null) => void;
  onDateRangeChange?: (rangeId: string, start: Date, end: Date) => void;
  activeQuickFilter?: string;
  showStats?: boolean;
  showQuickFilters?: boolean;
  filterStyle?: 'buttons' | 'dropdown'; // ⭐ Choose UI style
}

export const Orders = React.memo(function Orders({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onOrderAction, 
  onPageChange,
  onSort,
  onQuickFilterChange,
  onDateRangeChange,
  activeQuickFilter,
  showStats = true,
  showQuickFilters = true,
  filterStyle = 'dropdown' // ⭐ Default to dropdown (modern pattern)
}: OrdersProps) {
  // Debug: Log when Orders component receives new data
  React.useEffect(() => {
    console.log('📊 Orders Component: received new data', {
      ordersCount: data.orders.length,
      searchTerm: filters.search,
      statusFilter: filters.status,
      firstOrder: data.orders[0]?.orderNumber
    });
  }, [data.orders, filters.search, filters.status]);
  
  // Memoize handlers to prevent child re-renders
  // ✅ FIXED: Include actual dependencies to prevent stale closures
  const memoizedOnFiltersChange = React.useCallback(onFiltersChange, [onFiltersChange]);
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnClearFilters = React.useCallback(onClearFilters || (() => {}), [onClearFilters]);
  const memoizedOnOrderAction = React.useCallback(onOrderAction, [onOrderAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort || (() => {}), [onSort]);
  const memoizedOnQuickFilterChange = React.useCallback(onQuickFilterChange || (() => {}), [onQuickFilterChange]);
  const memoizedOnDateRangeChange = React.useCallback(onDateRangeChange || (() => {}), [onDateRangeChange]);
  
  // Show warning if viewing all orders without time filter and total > 10K
  const showLargeDatasetWarning = activeQuickFilter === 'all' && data.total > 10000;
  
  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <OrderHeader
          totalOrders={data.total}
          stats={data.stats}
          showStats={showStats}
        />
        
        {/* Compact Filters - All in one row */}
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Dropdown */}
              {showQuickFilters && filterStyle === 'dropdown' && (
                <OrderDateRangeFilter
                  activeRange={activeQuickFilter}
                  totalOrders={data.total}
                  filteredCount={filters.startDate || filters.endDate ? data.total : undefined}
                  onRangeChange={memoizedOnDateRangeChange}
                  showWarning={showLargeDatasetWarning}
                />
              )}
              
              {/* Search + Status + Type + Outlet (from OrderFilters) */}
              <OrderFiltersComponent 
                filters={filters}
                onFiltersChange={memoizedOnFiltersChange}
                onSearchChange={memoizedOnSearchChange}
                onClearFilters={memoizedOnClearFilters}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Warning banner when needed */}
        {showLargeDatasetWarning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-bg border border-warning-border">
            <AlertCircle className="w-4 h-4 text-warning-text flex-shrink-0" />
            <span className="text-sm text-warning-text font-medium">
              Viewing all {data.total.toLocaleString()} orders may be slow
            </span>
          </div>
        )}
      </div>
      
      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-4">
        <OrderTable 
          orders={data.orders}
          onOrderAction={memoizedOnOrderAction}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={memoizedOnSort}
        />
      </div>
      
      {/* Fixed Pagination Section - Always at Bottom */}
      {data.total > 0 && data.total > (data.limit || 20) && (
        <div className="flex-shrink-0 py-4">
          <Pagination 
            currentPage={data.currentPage}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit || 20}
            onPageChange={memoizedOnPageChange}
            itemName="orders"
          />
        </div>
      )}
    </div>
  );
});

export default Orders;
