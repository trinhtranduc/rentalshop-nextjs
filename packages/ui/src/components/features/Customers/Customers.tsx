'use client';

import React from 'react';
import { 
  PageWrapper,
  PageContent,
  Pagination,
  EmptyState,
  Button,
  Card,
  CardContent
} from '@rentalshop/ui';
import { CustomerPageHeader, CustomerSearch, CustomerTable } from './components';
import { 
  User as UserIcon, 
  Download
} from 'lucide-react';
import type { Customer, CustomerFilters } from '@rentalshop/types';
import { useUserRole, useCustomerTranslations } from '@rentalshop/hooks';

// Data interface for customers list
export interface CustomersData {
  customers: Customer[];
  items?: Customer[]; // Alias for compatibility
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface CustomersProps {
  // Data props (required for external data mode - URL state pattern)
  data?: CustomersData;
  filters?: CustomerFilters;
  onFiltersChange?: (filters: CustomerFilters) => void;
  onSearchChange?: (searchValue: string) => void;
  onClearFilters?: () => void;
  onCustomerAction?: (action: string, customerId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  
  // Display props
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  currentUser?: any;
  onExport?: () => void;
  className?: string;
}

/**
 * ✅ SIMPLIFIED CUSTOMERS COMPONENT (Modern Pattern)
 * 
 * - Clean presentation component (like Orders.tsx, Products.tsx)
 * - No internal state management
 * - Works with external data (URL state pattern)
 * - Single responsibility: render customers UI
 * - ~120 lines (was 333 lines before cleanup)
 */
export const Customers: React.FC<CustomersProps> = ({
  // Data props
  data,
  filters = {},
  onFiltersChange = () => {},
  onSearchChange = () => {},
  onClearFilters = () => {},
  onCustomerAction = () => {},
  onPageChange = () => {},
  onSort = () => {},
  
  // Display props
  title = "Customer Management",
  subtitle = "Manage customers in the system",
  showExportButton = false,
  showAddButton = false,
  addButtonText = "Add Customer",
  exportButtonText = "Export Customers",
  showStats = false,
  currentUser,
  onExport,
  className = ""
}) => {
  
  // User role check for permissions
  const { canManageUsers } = useUserRole(currentUser);
  
  // Get translations
  const t = useCustomerTranslations();
  
  // Handler for export button
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export functionality not implemented');
    }
  };

  // Handler for add customer button
  const handleAddCustomer = () => {
    console.log('Add customer functionality should be implemented in page');
  };

  // Default empty data
  const customers = data?.customers || [];
  const totalCustomers = data?.total || 0;
  const currentPage = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const limit = data?.limit || 25;

  // Memoize handlers to prevent child re-renders
  const memoizedOnFiltersChange = React.useCallback(onFiltersChange, [onFiltersChange]);
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnClearFilters = React.useCallback(onClearFilters, [onClearFilters]);
  const memoizedOnCustomerAction = React.useCallback(onCustomerAction, [onCustomerAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort, [onSort]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <CustomerPageHeader
          title={title}
          subtitle={subtitle}
        >
          {showAddButton && canManageUsers && (
            <Button
              onClick={handleAddCustomer}
              className="flex items-center space-x-2"
            >
              <UserIcon className="w-4 h-4" />
              <span>{addButtonText}</span>
            </Button>
          )}
          {showExportButton && (
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{exportButtonText}</span>
            </Button>
          )}
        </CustomerPageHeader>

        {/* Compact Search - All in one row */}
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <CustomerSearch
                filters={filters}
                onFiltersChange={memoizedOnFiltersChange}
                onSearchChange={memoizedOnSearchChange}
                onClearFilters={memoizedOnClearFilters}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-4">
        {customers.length > 0 ? (
          <CustomerTable
            customers={customers}
            onCustomerAction={memoizedOnCustomerAction}
            sortBy={filters.sortBy || "createdAt"}
            sortOrder={filters.sortOrder || "desc"}
            onSort={memoizedOnSort}
          />
        ) : (
          <EmptyState
            icon={UserIcon}
            title={t('messages.noCustomers')}
            description={
              filters.search || filters.q
                ? t('messages.tryAdjustingSearch')
                : t('messages.getStarted')
            }
          />
        )}
      </div>

      {/* Fixed Pagination Section - Always at Bottom */}
      {customers.length > 0 && totalCustomers > limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalCustomers}
            limit={limit}
            onPageChange={memoizedOnPageChange}
            itemName="customers"
          />
        </div>
      )}
    </div>
  );
};

export default Customers;
