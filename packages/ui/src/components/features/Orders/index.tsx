import React from 'react';
import { 
  OrderHeader,
  OrderFilters,
  OrderTable,
  OrderActions,
  OrderStats,
  OrderPagination
} from './components';
import { OrderData, OrderFilters as OrderFiltersType } from './types';

interface OrdersProps {
  data: OrderData;
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
  onOrderAction: (action: string, orderId: string) => void;
  onPageChange: (page: number) => void;
}

export function Orders({ 
  data, 
  filters, 
  onFiltersChange, 
  onOrderAction, 
  onPageChange 
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
      />      
      <OrderTable 
        orders={data.orders}
        onOrderAction={onOrderAction}
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
