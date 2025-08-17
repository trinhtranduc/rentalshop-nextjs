import React from 'react';
import { 
  CustomerHeader,
  CustomerSearch,
  CustomerTable,
  CustomerActions,
  CustomerStats,
  CustomerPagination
} from './components';
import { CustomerData, CustomerFilters } from './types';

interface CustomersProps {
  data: CustomerData;
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onCustomerAction: (action: string, customerId?: string) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
  merchantId: string;
  onCustomerCreated?: (customer: any) => void;
  onCustomerUpdated?: (customer: any) => void;
  onError?: (error: string) => void;
  onViewOrders?: (customerId: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
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
  onViewOrders,
  onDeleteCustomer
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
        customers={data.customers}
        onCustomerAction={onCustomerAction}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={onSort}
        onViewOrders={onViewOrders}
        onDeleteCustomer={onDeleteCustomer}
      />
      
      <CustomerPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default Customers;
