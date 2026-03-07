'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  ImportCustomerDialog,
  ConfirmationDialog,
  Button,
  LoadingIndicator,
  ExportDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Breadcrumb,
  type BreadcrumbItem,
} from '@rentalshop/ui';
import { Plus, Download, Upload, MoreVertical, ArrowLeft } from 'lucide-react';
import { useAuth, useCustomersData, useCanExportData, useCustomerTranslations, useCommonTranslations, usePermissions } from '@rentalshop/hooks';
import { customersApi, merchantsApi, authenticatedFetch, apiUrls } from '@rentalshop/utils';
import type { CustomerFilters, Customer, CustomerUpdateInput } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT CUSTOMERS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useCustomersData hook
 * ✅ Filter customers by merchantId
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 */
export default function MerchantCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  const { canManageCustomers, canExportCustomers } = usePermissions();
  
  // Merchant info
  const [merchantName, setMerchantName] = useState<string>('');
  const [merchantLoading, setMerchantLoading] = useState(true);
  
  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
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
  // FETCH MERCHANT INFO
  // ============================================================================
  
  React.useEffect(() => {
    const fetchMerchantInfo = async () => {
      try {
        setMerchantLoading(true);
        const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
        if (merchantData.success && merchantData.data) {
          setMerchantName(merchantData.data.name);
        }
      } catch (error) {
        console.error('Error fetching merchant info:', error);
      } finally {
        setMerchantLoading(false);
      }
    };
    fetchMerchantInfo();
  }, [merchantId]);

  // ============================================================================
  // DATA FETCHING - Filter by merchantId
  // ============================================================================
  
  // ✅ SIMPLE: Memoize filters - include merchantId filter
  const filters: CustomerFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    merchantId: parseInt(merchantId), // Filter by merchant
    page,
    limit,
    sortBy,
    sortOrder
  }), [merchantId, search, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useCustomersData({ filters });
  
  // Debug: Log data state
  console.log('📊 Merchant Customers Page - Data state:', {
    merchantId,
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
      if (value === undefined || value === '' || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: CustomerFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    // Add any filter updates here if needed
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleLimitChange = useCallback((newLimit: number) => {
    updateURL({ limit: newLimit, page: 1 });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleCustomerAction = useCallback(async (action: string, customerId: number) => {
    const customer = data?.customers.find(c => c.id === customerId);
    
    switch (action) {
      case 'view':
        if (customer) {
          setSelectedCustomer(customer);
          setShowDetailDialog(true);
        }
        break;
        
      case 'edit':
        if (customer) {
          setSelectedCustomer(customer);
          setShowEditDialog(true);
        }
        break;
        
      case 'delete':
        if (customer) {
          setCustomerToDelete(customer);
          setShowDeleteConfirm(true);
        }
        break;
        
      case 'viewOrders':
        // Navigate to orders page filtered by customer
        router.push(`/orders?customerId=${customerId}`);
        break;
        
      default:
        console.log('Customer action:', action, customerId);
    }
  }, [data?.customers, router]);

  const handleDeleteCustomer = useCallback(async () => {
    if (!customerToDelete) return;
    
    try {
      const response = await customersApi.deleteCustomer(customerToDelete.id);
      if (response.success) {
        toastSuccess(tc('labels.success'), t('messages.customerDeleted') || 'Customer deleted successfully');
        setShowDeleteConfirm(false);
        setCustomerToDelete(null);
        refetch();
      } else {
        throw new Error(response.message || 'Failed to delete customer');
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      // Error handled by global error handler
    }
  }, [customerToDelete, toastSuccess, t, tc, refetch]);

  const handleCustomerCreated = useCallback(() => {
    setShowAddDialog(false);
    refetch();
  }, [refetch]);

  const handleCustomerUpdated = useCallback(() => {
    setShowEditDialog(false);
    setSelectedCustomer(null);
    refetch();
  }, [refetch]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const customerData = useMemo(() => {
    if (!data) {
      return {
        customers: [],
        total: 0,
        currentPage: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false,
      };
    }

    return {
      customers: data.customers || [],
      total: data.total || 0,
      currentPage: data.currentPage || 1,
      totalPages: data.totalPages || 1,
      limit: data.limit || 25,
      hasMore: data.hasMore || false
    };
  }, [data]);

  // ============================================================================
  // BREADCRUMB
  // ============================================================================
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || 'Merchant', href: `/merchants/${merchantId}` },
    { label: 'Customers' }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-4" />
      
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <PageTitle>
                {merchantLoading ? 'Loading...' : `${merchantName} - Customers`}
              </PageTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {customerData.total} {customerData.total === 1 ? 'customer' : 'customers'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {canManageCustomers && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('buttons.addCustomer') || 'Add Customer'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('importLabel') || 'Import Customers'}
                    </DropdownMenuItem>
                    {canExportCustomers && (
                      <DropdownMenuItem
                        onClick={() => setShowExportDialog(true)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('exportLabel') || 'Export Customers'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
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
          onViewOrders={() => {
            setShowDetailDialog(false);
            handleCustomerAction('viewOrders', selectedCustomer.id);
          }}
        />
      )}

      {/* Add Customer Dialog */}
      {canManageCustomers && (
        <AddCustomerDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onCustomerCreated={handleCustomerCreated}
          merchantId={parseInt(merchantId)}
        />
      )}

      {/* Edit Customer Dialog */}
      {canManageCustomers && selectedCustomer && (
        <EditCustomerDialog
          customer={selectedCustomer}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {canManageCustomers && (
        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          type="danger"
          title={t('actions.deleteCustomer') || 'Delete Customer'}
          description={t('messages.confirmDeleteCustomer') || 'Are you sure you want to delete this customer? This action cannot be undone.'}
          confirmText={t('actions.delete') || 'Delete'}
          cancelText={t('buttons.cancel') || 'Cancel'}
          onConfirm={handleDeleteCustomer}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCustomerToDelete(null);
          }}
        />
      )}

      {/* Import Customer Dialog */}
      {canManageCustomers && (
        <ImportCustomerDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportSuccess={() => {
            setShowImportDialog(false);
            refetch();
          }}
        />
      )}

      {/* Export Dialog */}
      {canExportCustomers && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          entityType="customers"
          filters={filters}
          onExportStart={() => setIsExporting(true)}
          onExportComplete={() => setIsExporting(false)}
        />
      )}
    </PageWrapper>
  );
}
