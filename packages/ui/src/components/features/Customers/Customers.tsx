'use client';

import React from 'react';
import { 
  PageWrapper,
  PageContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ToastContainer,
  useToasts,
  CustomerPageHeader,
  CustomerSearch,
  CustomerTable,
  CustomerDetailDialog,
  Pagination,
  EmptyState,
  StatsOverview,
  Button
} from '@rentalshop/ui';
import { CustomerForm } from './components/CustomerForm';
import { 
  User as UserIcon, 
  UserCheck, 
  UserX, 
  Mail,
  MapPin,
  Download
} from 'lucide-react';
import type { Customer, CustomerFilters, CustomerCreateInput, CustomerUpdateInput } from '@rentalshop/types';
import { useCustomerManagement, type UseCustomerManagementOptions } from '@rentalshop/hooks';
import { 
  getCustomerFullName
} from '@rentalshop/utils';

export interface CustomersProps {
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  useSearchCustomers?: boolean;
  initialLimit?: number;
  merchantId?: number;
  outletId?: number;
  currentUser?: any;
  onExport?: () => void;
  className?: string;
}

export const Customers: React.FC<CustomersProps> = ({
  title = "Customer Management",
  subtitle = "Manage customers in the system",
  showExportButton = true,
  showAddButton = true,
  addButtonText = "Add Customer",
  exportButtonText = "Export Customers",
  showStats = false,
  useSearchCustomers = false,
  initialLimit = 10,
  merchantId,
  outletId,
  currentUser,
  onExport,
  className = ""
}) => {
  const { toasts, addToast, removeToast } = useToasts();
  
  // Use the shared customer management hook
  const customerManagementOptions: UseCustomerManagementOptions = {
    initialLimit,
    useSearchCustomers,
    enableStats: showStats,
    merchantId,
    outletId
  };
  
  const {
    customers,
    loading,
    selectedCustomer,
    showCustomerDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    filteredCustomers,
    filters,
    stats,
    handleCustomerRowAction,
    handleAddCustomer,
    handleExportCustomers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleCustomerCreated,
    handleCustomerUpdatedAsync,
    handleCustomerUpdated,
    handleCustomerError,
    setShowCustomerDetail,
    setShowCreateForm,
    setShowEditDialog
  } = useCustomerManagement(customerManagementOptions);

  // Enhanced handlers with toast notifications
  const handleCustomerCreatedWithToast = async (customerData: CustomerCreateInput | CustomerUpdateInput) => {
    try {
      await handleCustomerCreated(customerData as CustomerCreateInput);
      addToast('success', 'Customer Created', 'Customer has been created successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      addToast('error', 'Creation Failed', errorMessage);
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleCustomerUpdatedWithToast = async (customerData: CustomerUpdateInput) => {
    try {
      await handleCustomerUpdatedAsync(customerData);
      addToast('success', 'Customer Updated', 'Customer information has been updated successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      addToast('error', 'Update Failed', errorMessage);
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleEditCustomerSave = async (customerData: CustomerCreateInput | CustomerUpdateInput) => {
    // For edit mode, we know we should have an id, so cast to CustomerUpdateInput
    if (!('id' in customerData) || !customerData.id) {
      throw new Error('Customer ID is required for updates');
    }
    await handleCustomerUpdatedWithToast(customerData as CustomerUpdateInput);
  };

  const handleExportWithToast = () => {
    if (onExport) {
      onExport();
    } else {
      handleExportCustomers();
      addToast('info', 'Export', 'Export functionality coming soon!');
    }
  };

  const handleCustomerUpdatedWithToastCallback = (updatedCustomer: Customer) => {
    handleCustomerUpdated(updatedCustomer);
    const fullName = getCustomerFullName(updatedCustomer);
    addToast('success', 'Customer Updated', `Customer "${fullName}" has been updated successfully.`);
  };

  const handleCustomerErrorWithToast = (error: string) => {
    handleCustomerError(error);
    addToast('error', 'Error', error);
  };

  const handleCustomerDeleteWithToast = async (customerId: number) => {
    try {
      // Import the customers API
      const { customersApi } = await import('@rentalshop/utils');
      await customersApi.deleteCustomer(customerId);
      
      // Refresh the customer list
      // The hook should handle this automatically, but we can trigger a refresh
      const fullName = selectedCustomer ? getCustomerFullName(selectedCustomer) : 'Customer';
      addToast('success', 'Customer Deleted', `Customer "${fullName}" has been deleted successfully.`);
      
      // Close the detail dialog
      setShowCustomerDetail(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while deleting the customer';
      addToast('error', 'Delete Failed', errorMessage);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageContent className={className}>
        {/* Page Header */}
        <CustomerPageHeader
          title={title}
          subtitle={subtitle}
        >
          {showAddButton && (
            <Button onClick={handleAddCustomer} className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>{addButtonText}</span>
            </Button>
          )}
          {showExportButton && (
            <Button variant="outline" onClick={handleExportWithToast} className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>{exportButtonText}</span>
            </Button>
          )}
        </CustomerPageHeader>

        {/* Stats Overview - Only show if enabled */}
        {showStats && stats && (
          <StatsOverview
            stats={[
              {
                label: 'Total Customers',
                value: stats.totalCustomers,
                icon: UserIcon,
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
              },
              {
                label: 'Active Customers',
                value: stats.activeCustomers,
                icon: UserCheck,
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                label: 'Inactive Customers',
                value: stats.inactiveCustomers,
                icon: UserX,
                color: 'text-gray-600',
                bgColor: 'bg-gray-100'
              },
              {
                label: 'With Email',
                value: stats.customersWithEmail,
                icon: Mail,
                color: 'text-purple-600',
                bgColor: 'bg-purple-100'
              }
            ]}
            className="mb-8"
          />
        )}

        {/* Search and Filters */}
        <CustomerSearch
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        />

        {/* Customers List */}
        <CustomerTable
          customers={filteredCustomers}
          onCustomerAction={handleCustomerRowAction}
        />

        {/* Pagination - only show when there are results */}
        {filteredCustomers.length > 0 && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={handlePageChangeWithFetch}
            itemName="customers"
          />
        )}

      </PageContent>
      {/* Customer Edit Dialog */}
      {selectedCustomer && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update customer information for {selectedCustomer ? getCustomerFullName(selectedCustomer) : 'this customer'}
              </DialogDescription>
            </DialogHeader>
            
            <CustomerForm
              mode="edit"
              customer={selectedCustomer}
              onSave={handleEditCustomerSave}
              onCancel={() => setShowEditDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Detail Dialog (View Only) */}
      <CustomerDetailDialog
        open={showCustomerDetail}
        onOpenChange={setShowCustomerDetail}
        customer={selectedCustomer}
        onDelete={handleCustomerDeleteWithToast}
      />

      {/* Create Customer Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer account with contact information and preferences.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            mode="create"
            onSave={handleCustomerCreatedWithToast as any}
            onCancel={() => setShowCreateForm(false)}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
};

export default Customers;