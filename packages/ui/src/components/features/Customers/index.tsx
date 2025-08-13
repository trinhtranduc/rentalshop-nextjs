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
  onCustomerAction: (action: string, customerId: string) => void;
  onPageChange: (page: number) => void;
}

export function Customers({ 
  data, 
  filters, 
  onFiltersChange, 
  onCustomerAction, 
  onPageChange 
}: CustomersProps) {
  return (
    <div className="space-y-6">
      <CustomerSearch 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
            
      <CustomerTable 
        customers={data.customers}
        onCustomerAction={onCustomerAction}
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
