'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Products,
  useToast,
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
  ImportProductDialog,
} from '@rentalshop/ui';
import { Plus, Download, Upload, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth, useProductsData, usePermissions } from '@rentalshop/hooks';
import { productsApi } from '@rentalshop/utils';
import type { ProductFilters, ProductWithDetails } from '@rentalshop/types';

/**
 * ✅ ADMIN PRODUCTS PAGE (All Merchants)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useProductsData hook
 * ✅ Show products from ALL merchants (no merchantId filter)
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ ADMIN only access
 */
export default function AdminProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const { canManageProducts, canExportProducts } = usePermissions();
  
  // Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const merchantIdFilter = searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : undefined;

  // ============================================================================
  // DATA FETCHING - No merchantId filter (show all merchants)
  // ============================================================================
  
  // ✅ SIMPLE: Memoize filters - NO merchantId filter (show all merchants)
  const filters: ProductFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    merchantId: merchantIdFilter, // Optional filter by merchant (for admin)
    page,
    limit,
    sortBy,
    sortOrder
  }), [merchantIdFilter, search, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useProductsData({ filters });
  
  // Debug: Log data state
  console.log('📊 Admin Products Page - Data state:', {
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
    const updates: Record<string, string | number | undefined> = { 
      page: 1,
      merchantId: newFilters.merchantId,
      categoryId: newFilters.categoryId,
      outletId: newFilters.outletId
    };
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

  const handleProductAction = useCallback(async (action: string, productId: number) => {
    const product = data?.products.find(p => p.id === productId);
    
    switch (action) {
      case 'view':
        // Navigate to product detail page
        router.push(`/products/${productId}`);
        break;
        
      case 'edit':
        // Navigate to product edit page
        if (product?.merchantId) {
          router.push(`/merchants/${product.merchantId}/products/${productId}`);
        }
        break;
        
      case 'delete':
        if (product) {
          setProductToDelete(product);
          setShowDeleteConfirm(true);
        }
        break;
        
      default:
        console.log('Product action:', action, productId);
    }
  }, [data?.products, router]);

  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      const response = await productsApi.deleteProduct(productToDelete.id);
      if (response.success) {
        toastSuccess('Success', 'Product deleted successfully');
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        refetch();
      } else {
        throw new Error(response.message || 'Failed to delete product');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toastError(
        'Error',
        error?.message || error?.response?.data?.message || 'Failed to delete product'
      );
    }
  }, [productToDelete, toastSuccess, toastError, refetch]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedProductIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const response = await productsApi.batchDeleteProducts(selectedProductIds);
      if (response.success && response.data) {
        const { deleted } = response.data;
        if (deleted > 0) {
          toastSuccess(
            'Success', 
            `${deleted} product(s) deleted successfully`
          );
          setSelectedProductIds([]);
          setShowBulkDeleteConfirm(false);
          refetch();
        } else {
          toastError('Error', 'No products were deleted');
        }
      } else {
        const errorResponse = response as any;
        toastError('Error', errorResponse.message || 'Failed to delete products');
      }
    } catch (error: any) {
      console.error('Error batch deleting products:', error);
      toastError(
        'Error',
        error?.message || error?.response?.data?.message || 'An unexpected error occurred while deleting products'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [selectedProductIds, toastSuccess, toastError, refetch]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const productData = useMemo(() => {
    const products = data?.products || [];
    if (!data) {
      return {
        products: [],
        items: [],
        total: 0,
        page: 1,
        currentPage: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false,
      };
    }

    return {
      products,
      items: products, // Required by ProductSearchResult
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
            showMerchantColumn={true}
            showMerchantFilter={true}
            currentUser={user}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {canManageProducts && (
        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          type="danger"
          title="Delete Product"
          description="Are you sure you want to delete this product? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteProduct}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setProductToDelete(null);
          }}
        />
      )}

      {/* Import Product Dialog */}
      {canManageProducts && (
        <ImportProductDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportSuccess={() => {
            setShowImportDialog(false);
            refetch();
          }}
          // No merchantId - admin can choose merchant when importing
        />
      )}

      {/* Export Dialog */}
      {canExportProducts && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          resourceName="Products"
          onExport={async (params) => {
            try {
              setIsExporting(true);
              // TODO: Implement export functionality
              console.log('Export products with params:', params);
              toastSuccess('Success', 'Export started');
              setShowExportDialog(false);
            } catch (error) {
              console.error('Export error:', error);
            } finally {
              setIsExporting(false);
            }
          }}
          isLoading={isExporting}
        />
      )}

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
    </PageWrapper>
  );
}
