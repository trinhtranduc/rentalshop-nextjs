'use client';

import React, { useCallback, useMemo, useTransition, useRef, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Customers,
  useToast,
  CustomerDetailDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EditCustomerForm,
  ConfirmationDialog
} from '@rentalshop/ui';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useCustomersData, useCanExportData } from '@rentalshop/hooks';
import { customersApi } from '@rentalshop/utils';
import type { CustomerFilters, Customer, CustomerUpdateInput } from '@rentalshop/types';

/**
 * ✅ MODERN NEXT.JS 13+ CUSTOMERS PAGE - URL STATE PATTERN
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useCustomersData hook
 * ✅ No duplicate state management
 * ✅ Smooth transitions with useTransition
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ Auto-refresh on URL change (no manual refresh needed)
 */
export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const canExport = useCanExportData();
  const [isPending, startTransition] = useTransition();
  
  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // Memoize filters với ref để tránh re-create
  const filtersRef = useRef<CustomerFilters | null>(null);
  const filters: CustomerFilters = useMemo(() => {
    const newFilters: CustomerFilters = {
      q: search || undefined,
      search: search || undefined,
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    // Only update if actually changed
    const filterString = JSON.stringify(newFilters);
    const prevFilterString = JSON.stringify(filtersRef.current);
    
    if (filterString === prevFilterString && filtersRef.current) {
      console.log('🔍 Page: Filters unchanged, returning cached');
      return filtersRef.current;
    }
    
    console.log('🔍 Page: Filters changed, creating new:', newFilters);
    filtersRef.current = newFilters;
    return newFilters;
  }, [search, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useCustomersData({ 
    filters,
    debounceSearch: true,
    debounceMs: 500
  });

  // ============================================================================
  // URL UPDATE HELPER - Update URL = Update Everything
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    console.log('🔄 updateURL: Pushing new URL:', newURL);
    
    // Use transition for smooth UI updates
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  // ============================================================================
  // FILTER HANDLERS - Simple URL Updates
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 Page: Search changed to:', searchValue);
    updateURL({ q: searchValue, page: 1 }); // Reset to page 1
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: Partial<CustomerFilters>) => {
    console.log('🔧 Page: Filters changed:', newFilters);
    
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if ('sortBy' in newFilters) {
      updates.sortBy = newFilters.sortBy;
    }
    if ('sortOrder' in newFilters) {
      updates.sortOrder = newFilters.sortOrder;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    console.log('📄 Page: Page changed to:', newPage);
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    console.log('🔀 Page: Sort changed:', column);
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // CUSTOMER ACTION HANDLERS
  // ============================================================================
  
  const handleCustomerAction = useCallback(async (action: string, customerId: number) => {
    console.log('🎬 Customer action:', action, customerId);
    
    const customer = data?.customers.find(c => c.id === customerId);
    
    switch (action) {
      case 'view':
        // Show detail dialog
        if (customer) {
          setSelectedCustomer(customer);
          setShowDetailDialog(true);
        }
        break;
        
      case 'edit':
        // Show edit dialog
        if (customer) {
          setSelectedCustomer(customer);
          setShowEditDialog(true);
        }
        break;
        
      case 'viewOrders':
        // Navigate to customer orders page
        router.push(`/customers/${customerId}/orders`);
        break;
        
      case 'delete':
        // Show delete confirmation dialog
        if (customer) {
          setCustomerToDelete(customer);
          setShowDeleteConfirm(true);
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.customers, router, toastSuccess, toastError]);
  
  // Handle customer update from edit dialog
  const handleCustomerUpdate = useCallback(async (customerData: CustomerUpdateInput) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await customersApi.updateCustomer(selectedCustomer.id, customerData);
      if (response.success) {
        toastSuccess('Customer Updated', 'Customer has been updated successfully');
        setShowEditDialog(false);
        setSelectedCustomer(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to update customer');
      }
    } catch (error) {
      toastError('Update Failed', (error as Error).message);
      throw error;
    }
  }, [selectedCustomer, router, toastSuccess, toastError]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!customerToDelete) return;
    
    try {
      const response = await customersApi.deleteCustomer(customerToDelete.id);
      if (response.success) {
        toastSuccess('Customer Deleted', `Customer "${customerToDelete.firstName} ${customerToDelete.lastName}" has been deleted successfully`);
        setShowDeleteConfirm(false);
        setCustomerToDelete(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to delete customer');
      }
    } catch (error) {
      toastError('Delete Failed', (error as Error).message);
    }
  }, [customerToDelete, router, toastSuccess, toastError]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const customerData = useMemo(() => {
    if (!data) {
      return {
        items: [],
        customers: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false
      };
    }

    return {
      items: data.customers,
      customers: data.customers,
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Customers</PageTitle>
          <p className="text-sm text-gray-600">Manage customers in the system</p>
        </PageHeader>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading customers...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Customers</PageTitle>
            <p className="text-sm text-gray-600">Manage customers in the system</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <button 
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            )}
            <button 
              onClick={() => router.push('/customers/create')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
      <Customers
          data={customerData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onCustomerAction={handleCustomerAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* Customer Detail Dialog */}
      {selectedCustomer && (
        <CustomerDetailDialog
          customer={selectedCustomer}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Customer: {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <EditCustomerForm
              customer={selectedCustomer}
              onSave={handleCustomerUpdate}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedCustomer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete Customer"
        description={`Are you sure you want to delete customer "${customerToDelete?.firstName} ${customerToDelete?.lastName}"? This action cannot be undone.`}
        confirmText="Delete Customer"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCustomerToDelete(null);
        }}
      />
    </PageWrapper>
  );
} 
