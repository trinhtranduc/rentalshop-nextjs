import React from 'react';
import { 
  OrderHeader,
  OrderFilters as OrderFiltersComponent,
  OrderTable,
  OrderStats
} from './components';
import { Pagination } from '@rentalshop/ui';
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
  showStats?: boolean;
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
  showStats = true
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
  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <OrderHeader
          totalOrders={data.total}
          stats={data.stats}
          showStats={showStats}
        />
        
        <OrderFiltersComponent 
          filters={filters}
          onFiltersChange={memoizedOnFiltersChange}
          onSearchChange={memoizedOnSearchChange}
          onClearFilters={memoizedOnClearFilters}
        />
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
