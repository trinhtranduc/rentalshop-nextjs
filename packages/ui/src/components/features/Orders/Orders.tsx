import React from 'react';
import { 
  OrderListHeader,
  OrderListFilters,
  OrderTable,
  OrderListActions,
  OrderStats,
  OrderPagination
} from './components';
import { OrderData, OrderFilters as OrderFiltersType } from './types';

interface OrdersProps {
  data: OrderData;
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onOrderAction: (action: string, orderId: string) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
}

export function Orders({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onOrderAction, 
  onPageChange,
  onSort
}: OrdersProps) {
  return (
    <div className="space-y-6">
      <OrderListHeader 
        totalOrders={data.total}
        stats={data.stats}
      />
      
      <OrderListFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />      
      <OrderTable 
        orders={data.orders}
        onOrderAction={onOrderAction}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={onSort}
      />
      
      <OrderPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default Orders;
