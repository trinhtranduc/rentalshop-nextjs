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
      
      <OrderFiltersComponent 
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
      
      <Pagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        limit={data.limit || 20}
        onPageChange={onPageChange}
        itemName="orders"
      />
    </div>
  );
}

export default Orders;
