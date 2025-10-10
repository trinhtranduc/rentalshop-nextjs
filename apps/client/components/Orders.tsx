'use client'

import React from 'react';
import { 
  OrderHeader,
  OrderFilters,
  OrderStats,
  OrderPagination
} from '@rentalshop/ui';
import { OrderTable } from './OrderTable';
import type { OrderListData, OrderFilters as OrderFiltersType } from '@rentalshop/types';

interface OrdersProps {
  data: OrderListData;
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
      <OrderHeader
        totalOrders={data.total}
      />
      
      <OrderFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />      
      <OrderTable 
        orders={data.orders as any}
        onOrderAction={onOrderAction}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={onSort}
      />
      
      {data.total > 0 && (
        <OrderPagination 
          currentPage={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

export default Orders;
