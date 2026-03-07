'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  Products,
  Breadcrumb,
  type BreadcrumbItem,
  Button,
  ConfirmationDialog,
  useToast,
  ImportProductDialog,
  ExportDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingIndicator,
} from '@rentalshop/ui';
import { Package, Trash2, Upload, Download, MoreVertical } from 'lucide-react';
import { merchantsApi, productsApi } from '@rentalshop/utils';
import { useAuth, useProductsData, usePermissions } from '@rentalshop/hooks';
import type { ProductFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT PRODUCTS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useProductsData hook
 * ✅ Filter products by merchantId
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 */
export default function MerchantProductsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const { canManageProducts, canExportProducts } = usePermissions();
  
  // Merchant info
  const [merchantName, setMerchantName] = useState<string>('');
  const [merchantLoading, setMerchantLoading] = useState(true);
  
  // Dialog states
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
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
  const filters: ProductFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    merchantId: parseInt(merchantId), // Filter by merchant
    page,
    limit,
    sortBy,
    sortOrder
  }), [merchantId, search, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useProductsData({ filters });
  
  // Debug: Log data state
  console.log('📦 Merchant Products Page - Data state:', {
    merchantId,
    hasData: !!data,
    productsCount: data?.products?.length || 0,
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

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
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

  const handleProductAction = useCallback((action: string, productId: number) => {
    switch (action) {
      case 'view-orders':
        router.push(`/merchants/${merchantId}/products/${productId}/orders`);
        break;
      case 'view':
        router.push(`/merchants/${merchantId}/products/${productId}`);
        break;
      default:
        console.log('Product action:', action, productId);
    }
  }, [router, merchantId]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedProductIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const response = await productsApi.batchDeleteProducts(selectedProductIds);
      if (response.success && response.data) {
        const { deleted, failed } = response.data;
        if (deleted > 0) {
          toastSuccess(
            'Success', 
            failed > 0 
              ? `${deleted} product(s) deleted, ${failed} failed`
              : `${deleted} product(s) deleted successfully`
          );
          setSelectedProductIds([]);
          setShowBulkDeleteConfirm(false);
          refetch();
        }
      } else {
        throw new Error(response.message || 'Failed to delete products');
      }
    } catch (error: any) {
      console.error('Error batch deleting products:', error);
      toastError(
        'Error',
        error?.message || error?.response?.data?.message || 'Failed to delete products'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [selectedProductIds, toastSuccess, toastError, refetch]);

  const handleImportSuccess = useCallback(() => {
    toastSuccess('Success', 'Products imported successfully');
    setShowImportDialog(false);
    refetch();
  }, [toastSuccess, refetch]);

  const handleExportProducts = useCallback(async (params: any) => {
    setIsExporting(true);
    try {
      const blob = await productsApi.exportProducts(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toastSuccess('Success', 'Export completed successfully');
      setShowExportDialog(false);
      setSelectedProductIds([]);
    } catch (error: any) {
      console.error('Export error:', error);
      // Error handled by global error handler
    } finally {
      setIsExporting(false);
    }
  }, [toastSuccess]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const productData = useMemo(() => {
    if (!data) {
      return {
        products: [],
        items: [], // Alias for compatibility
        total: 0,
        page: 1,
        currentPage: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false,
      };
    }

    return {
      products: data.products || [],
      items: data.products || [], // Alias for compatibility
      total: data.total || 0,
      page: data.currentPage || 1,
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
    { label: 'Products' }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          <div className="flex items-center gap-2">
            {canManageProducts && (
              <>
                {/* Batch Delete button - only show when products are selected */}
                {selectedProductIds.length > 0 && (
                  <Button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : `Delete (${selectedProductIds.length})`}
                  </Button>
                )}
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
                      Import Products
                    </DropdownMenuItem>
                    {canExportProducts && (
                      <DropdownMenuItem
                        onClick={() => setShowExportDialog(true)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Products
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {/* Show export dropdown if user can export but cannot manage */}
            {!canManageProducts && canExportProducts && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowExportDialog(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Products
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Center Loading Indicator - Shows when waiting for API */}
        {loading && !data ? (
          <div className="h-full flex items-center justify-center bg-white z-10">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message="Loading products..."
            />
          </div>
        ) : (
          /* Products Content - Only render when data is loaded */
        <Products
          data={productData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onProductAction={handleProductAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
            onSelectionChange={setSelectedProductIds}
            onLimitChange={handleLimitChange}
            currentUser={user}
        />
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {canManageProducts && (
        <ConfirmationDialog
          open={showBulkDeleteConfirm}
          onOpenChange={setShowBulkDeleteConfirm}
          type="danger"
          title="Delete Selected Products"
          description={`Are you sure you want to delete ${selectedProductIds.length} product(s)? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleBatchDelete}
          onCancel={() => {
            setShowBulkDeleteConfirm(false);
          }}
        />
      )}

      {/* Import Product Dialog */}
      {canManageProducts && (
        <ImportProductDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportSuccess={handleImportSuccess}
          merchantId={parseInt(merchantId)}
        />
      )}

      {/* Export Product Dialog */}
      {canExportProducts && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          resourceName="Products"
          isLoading={isExporting}
          selectedCount={selectedProductIds.length}
          onExport={handleExportProducts}
        />
      )}
    </PageWrapper>
  );
}
