'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Customers,
  CustomersLoading,
  useToast,
  CustomerDetailDialog,
  AddCustomerDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EditCustomerForm,
  ConfirmationDialog,
  Button
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useCustomersData, useCanExportData, useCustomerTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  const canExport = useCanExportData();
  
  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
  
  // ✅ SIMPLE: Memoize filters - useDedupedApi handles deduplication
  const filters: CustomerFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useCustomersData({ filters });
  
  // Debug: Log data state
  console.log('📊 Customers Page - Data state:', {
    hasData: !!data,
    customersCount: data?.customers?.length || 0,
    total: data?.total,
    currentPage: data?.currentPage,
    loading
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
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

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
        toastSuccess(t('messages.updateSuccess'), t('messages.updateSuccess'));
        setShowEditDialog(false);
        setSelectedCustomer(null);
        refetch();
      } else {
        throw new Error(response.error || t('messages.updateFailed'));
      }
    } catch (error) {
        toastError(t('messages.updateFailed'), (error as Error).message);
      throw error;
    }
  }, [selectedCustomer, router, toastSuccess, toastError, refetch]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!customerToDelete) return;
    
    try {
      const response = await customersApi.deleteCustomer(customerToDelete.id);
      if (response.success) {
        toastSuccess(t('messages.deleteSuccess'), t('messages.deleteSuccess'));
        setShowDeleteConfirm(false);
        setCustomerToDelete(null);
        refetch();
      } else {
        throw new Error(response.error || t('messages.deleteFailed'));
      }
    } catch (error) {
        toastError(t('messages.deleteFailed'), (error as Error).message);
    }
  }, [customerToDelete, router, toastSuccess, toastError, refetch]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const customerData = useMemo(() => {
    console.log('🔄 customerData memo - Input data:', {
      hasData: !!data,
      customersLength: data?.customers?.length,
      total: data?.total
    });
    
    if (!data || !data.customers) {
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

    const result = {
      items: data.customers, // Required by BaseSearchResult
      customers: data.customers, // Alias for backward compatibility
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
    
    console.log('✅ customerData memo - Output:', {
      customersLength: result.customers.length,
      total: result.total,
      page: result.page
    });
    
    return result;
  }, [data]);

  // ============================================================================
  // RENDER - Show skeleton when loading initial data
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <PageTitle>{t('title')}</PageTitle>
          <p className="text-sm text-gray-600">{t('title')}</p>
        </PageHeader>
        <CustomersLoading />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>{t('title')}</PageTitle>
            <p className="text-sm text-gray-600">{t('title')}</p>
          </div>
          <div className="flex gap-3">
            {/* Export feature - temporarily hidden, will be enabled in the future */}
            {/* {canExport && (
              <Button
                onClick={() => {
                  toastSuccess(tc('labels.info'), tc('messages.comingSoon'));
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {tc('buttons.export')}
              </Button>
            )} */}
            <Button 
              onClick={() => setShowAddDialog(true)}
              variant="default"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('createCustomer')}
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
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

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCustomerCreated={async (customerData) => {
          try {
            const response = await customersApi.createCustomer({
              ...customerData,
              phone: customerData.phone || '', // Ensure phone is not undefined
              merchantId: user?.merchant?.id || user?.merchantId || 0
            });
            
            if (response.success) {
              toastSuccess(t('messages.createSuccess'), t('messages.createSuccess'));
              refetch();
            } else {
              throw new Error(response.error || t('messages.createFailed'));
            }
          } catch (error) {
            console.error('Error creating customer:', error);
            toastError(tc('labels.error'), error instanceof Error ? error.message : t('messages.createFailed'));
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError(tc('labels.error'), error);
        }}
      />

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('editCustomer')}: {selectedCustomer?.firstName} {selectedCustomer?.lastName}
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
        title={t('actions.delete')}
        description={t('messages.confirmDelete')}
        confirmText={t('actions.delete')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCustomerToDelete(null);
        }}
      />
    </PageWrapper>
  );
} 
