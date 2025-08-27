import React from 'react';
import { 
  OrderHeader,
  OrderFilters,
  OrderTable,
  OrderListActions,
  OrderStats,
  OrderPagination
} from './components';
import type { OrdersData, OrderFilters } from '@rentalshop/types';

interface OrdersProps {
  data: OrdersData;
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onOrderAction: (action: string, orderId: number) => void;
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
      <OrderHeader
        totalOrders={data.total}
        stats={data.stats}
      />
      
      <OrderFilters 
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
