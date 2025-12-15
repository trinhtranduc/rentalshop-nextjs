'use client';

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
  EditCustomerDialog,
  ConfirmationDialog,
  Button,
  LoadingIndicator,
  ExportDialog
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
  const { toastSuccess } = useToast();
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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

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
      // Special handling for page: always set it, even if it's 1
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
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

  const handleLimitChange = useCallback((newLimit: number) => {
    console.log('📄 handleLimitChange called: current limit=', limit, ', new limit=', newLimit);
    updateURL({ limit: newLimit, page: 1 }); // Reset to page 1 when changing limit
  }, [updateURL, limit]);

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
  }, [data?.customers, router, toastSuccess]);
  
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
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (error) {
      // Error automatically handled by useGlobalErrorHandler
      throw error;
    }
  }, [selectedCustomer, toastSuccess, refetch, t]);
  
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
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (error) {
      // Error automatically handled by useGlobalErrorHandler
    }
  }, [customerToDelete, toastSuccess, refetch, t]);

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
  // RENDER - Page renders immediately, show loading indicator
  // ============================================================================

  return (
    <PageWrapper spacing="none" maxWidth="full" className="h-screen flex flex-col px-4 pt-4 pb-0 overflow-hidden">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>{t('title')}</PageTitle>
            <p className="text-sm text-gray-600">{t('title')}</p>
          </div>
          <div className="flex gap-3">
            {/* Export button - only show when customers are selected */}
            {canExport && selectedCustomerIds.length > 0 && (
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {tc('buttons.export')} ({selectedCustomerIds.length})
              </Button>
            )}
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

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Center Loading Indicator - Shows when waiting for API */}
        {loading && !data ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={tc('labels.loading') || 'Loading customers...'}
            />
          </div>
        ) : (
          /* Customers Content - Only render when data is loaded */
          <Customers
            data={customerData}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            onCustomerAction={handleCustomerAction}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onSelectionChange={setSelectedCustomerIds}
            onLimitChange={handleLimitChange}
          />
        )}
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
        // Always pass merchantId if available (backend will validate from userScope)
        // This helps with UX (pre-fill) and backend will override if needed for security
        merchantId={user?.merchantId || user?.merchant?.id}
        onCustomerCreated={async (customerData) => {
          try {
            // Debug: Log customerData before sending
            console.log('🔍 customers/page - onCustomerCreated - customerData:', {
              hasMerchantId: 'merchantId' in customerData,
              merchantId: (customerData as any).merchantId,
              customerDataKeys: Object.keys(customerData),
              userMerchantId: user?.merchantId,
              userMerchant: user?.merchant
            });
            
            // Backend will validate merchantId from userScope (security)
            // Frontend can send merchantId for UX (pre-fill), backend will override if needed
            const response = await customersApi.createCustomer({
              ...customerData,
              phone: customerData.phone || '', // Ensure phone is not undefined
              lastName: customerData.lastName || '', // Ensure lastName is not undefined
              // merchantId will be included by CustomerFormDialog if available
            });
            
            if (response.success) {
              toastSuccess(t('messages.createSuccess'), t('messages.createSuccess'));
              refetch();
            }
            // Error automatically handled by useGlobalErrorHandler
          } catch (error: any) {
            // Error automatically handled by useGlobalErrorHandler
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          // ✅ onCustomerCreated already shows toast, so onError is only for logging
          console.error('❌ AddCustomerDialog: Error occurred:', error);
        }}
      />

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <EditCustomerDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
              setSelectedCustomer(null);
            }
          }}
          customer={selectedCustomer}
          onCustomerUpdated={handleCustomerUpdate}
          onError={(error) => {
            // Error automatically handled by useGlobalErrorHandler
          }}
        />
      )}

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

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        resourceName="Customers"
        isLoading={isExporting}
        selectedCount={selectedCustomerIds.length}
        onExport={async (params) => {
          try {
            setIsExporting(true);
            // If customers are selected, export only those
            const exportParams = selectedCustomerIds.length > 0
              ? { ...params, customerIds: selectedCustomerIds }
              : params;
            const blob = await customersApi.exportCustomers(exportParams);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customers-export-${new Date().toISOString().split('T')[0]}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toastSuccess(tc('labels.success'), 'Export completed successfully');
            setShowExportDialog(false);
            setSelectedCustomerIds([]); // Clear selection after export
          } catch (error) {
            // Error automatically handled by useGlobalErrorHandler
          } finally {
            setIsExporting(false);
          }
        }}
      />
    </PageWrapper>
  );
} 
