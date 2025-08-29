import React from 'react';
import { 
  CustomerHeader,
  CustomerSearch,
  CustomerTable,
  CustomerActions,
  CustomerStats,
  CustomerPagination
} from './components';
import { Customer, CustomerFilters, PaginationResult } from '@rentalshop/types';

interface CustomersProps {
  data: PaginationResult<Customer>;
  filters: CustomerFilters & { sortBy?: string; sortOrder?: 'asc' | 'desc' };
  onFiltersChange: (filters: CustomerFilters & { sortBy?: string; sortOrder?: 'asc' | 'desc' }) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onCustomerAction: (action: string, customerId?: number) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
  merchantId: number;
  onCustomerCreated?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  onError?: (error: string) => void;
  onViewOrders?: (customerId: number) => void;
}

export function Customers({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onCustomerAction, 
  onPageChange,
  onSort,
  merchantId,
  onCustomerCreated,
  onCustomerUpdated,
  onError,
  onViewOrders
}: CustomersProps) {
  return (
    <div className="space-y-6"> 
      <CustomerSearch 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />
            
      <CustomerTable 
        customers={data.data}
        onCustomerAction={onCustomerAction}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={onSort}
      />
      
      <CustomerPagination 
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        total={data.pagination.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default Customers;
