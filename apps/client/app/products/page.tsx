'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Products,
  ProductsLoading,
  useToast,
  ProductAddDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ProductDetail,
  ProductEdit,
  ConfirmationDialog,
  Button,
  LoadingIndicator,
  ExportDialog
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useProductsData, useCanExportData, useProductTranslations, useCommonTranslations, useDedupedApi } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
import { productsApi, categoriesApi, outletsApi } from '@rentalshop/utils';
import type { ProductFilters, Product, ProductWithDetails, ProductUpdateInput, Category, Outlet } from '@rentalshop/types';

/**
 * ✅ MODERN NEXT.JS 13+ PRODUCTS PAGE - URL STATE PATTERN
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useProductsData hook
 * ✅ No duplicate state management
 * ✅ Smooth transitions with useTransition
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ Auto-refresh on URL change (no manual refresh needed)
 * 
 * Data Flow:
 * 1. User interacts (search, filter, pagination)
 * 2. updateURL() → URL params change
 * 3. Next.js detects URL change → searchParams update
 * 4. filters object recalculates (memoized)
 * 5. useProductsData detects filter change → fetch data
 * 6. UI updates with new data
 * 
 * Benefits:
 * - Single API call per action
 * - Minimal re-renders
 * - No manual refresh needed
 * - Clean and maintainable
 */
export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  const canExport = useCanExportData();
  // ✅ Use permissions hook to check if user can manage products
  const { canManageProducts } = usePermissions();
  
  // Dialog states
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // ============================================================================
  // FETCH CATEGORIES - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: categoriesData 
  } = useDedupedApi({
    filters: {}, // Categories are global, no filter needed
    fetchFn: async () => {
      const categoriesRes = await categoriesApi.getCategories();
      if (!categoriesRes.success || !categoriesRes.data) {
        throw new Error('Failed to fetch categories');
      }
      return categoriesRes.data;
    },
    enabled: true,
    staleTime: 300000, // 5 minutes (categories don't change often)
    cacheTime: 600000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // ============================================================================
  // FETCH OUTLETS - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: outletsData 
  } = useDedupedApi({
    filters: {}, // Outlets are filtered by backend based on user role
    fetchFn: async () => {
      const outletsRes = await outletsApi.getOutlets();
      if (!outletsRes.success || !outletsRes.data?.outlets) {
        throw new Error('Failed to fetch outlets');
      }
      return { outlets: outletsRes.data.outlets };
    },
    enabled: true,
    staleTime: 60000, // 60 seconds
    cacheTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync data to local state
  const categories = categoriesData || [];
  const outlets = outletsData?.outlets || [];

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined;
  const outletId = searchParams.get('outlet') ? parseInt(searchParams.get('outlet')!) : undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // ✅ SIMPLE: Memoize filters - useDedupedApi handles deduplication
  const filters: ProductFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    categoryId,
    outletId,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, categoryId, outletId, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useProductsData({ filters });
  
  // Debug: Log data state
  console.log('📊 Products Page - Data state:', {
    hasData: !!data,
    productsCount: data?.products?.length || 0,
    loading,
    error: error?.message
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

  const handleFiltersChange = useCallback((newFilters: Partial<ProductFilters>) => {
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if ('categoryId' in newFilters) {
      updates.category = newFilters.categoryId as any;
    }
    if ('outletId' in newFilters) {
      updates.outlet = newFilters.outletId as any;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    // Clear all params except page
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    // Toggle sort order if clicking same column, otherwise default to asc
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleLimitChange = useCallback((newLimit: number) => {
    console.log('📄 handleLimitChange called: current limit=', limit, ', new limit=', newLimit);
    updateURL({ limit: newLimit, page: 1 }); // Reset to page 1 when changing limit
  }, [updateURL, limit]);

  // ============================================================================
  // PRODUCT ACTION HANDLERS
  // ============================================================================
  
  const handleProductAction = useCallback(async (action: string, productId: number) => {
    console.log('🎬 Product action:', action, productId);
    
    const product = data?.products.find(p => p.id === productId);
    
    switch (action) {
      case 'view':
        // Fetch full product details before showing dialog
        try {
          const response = await productsApi.getProduct(productId);
          if (response.success && response.data) {
            console.log('📦 Product details fetched:', response.data);
            console.log('📦 Outlet stock:', response.data.outletStock);
            console.log('📦 Images:', response.data.images);
            setSelectedProduct(response.data as ProductWithDetails);
            setShowDetailDialog(true);
          }
          // Error automatically handled by useGlobalErrorHandler
        } catch (error) {
          // Error automatically handled by useGlobalErrorHandler
        }
        break;
        
      case 'edit':
        // Fetch full product details before showing edit dialog
        try {
          const response = await productsApi.getProduct(productId);
          if (response.success && response.data) {
            setSelectedProduct(response.data as ProductWithDetails);
            setShowEditDialog(true);
          }
          // Error automatically handled by useGlobalErrorHandler
        } catch (error) {
          // Error automatically handled by useGlobalErrorHandler
        }
        break;
        
      case 'view-orders':
        // Navigate to product orders page
        router.push(`/products/${productId}/orders`);
        break;
        
      case 'toggle-status':
        if (product) {
          try {
            const response = await productsApi.updateProduct(productId, {
              id: productId,
              isActive: !product.isActive
            });
            if (response.success) {
              toastSuccess(
                t('messages.updateSuccess'), 
                t('messages.updateSuccess')
              );
              refetch();
            }
            // Error automatically handled by useGlobalErrorHandler
          } catch (error) {
            // Error automatically handled by useGlobalErrorHandler
          }
        }
        break;
        
      case 'delete':
        // Show delete confirmation dialog
        if (product) {
          setProductToDelete(product as ProductWithDetails);
          setShowDeleteConfirm(true);
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.products, router, toastSuccess, refetch]);
  
  // Handle product update from edit dialog
  const handleProductUpdate = useCallback(async (productData: ProductUpdateInput) => {
    if (!selectedProduct) return;
    
    try {
      const response = await productsApi.updateProduct(selectedProduct.id, productData);
      if (response.success) {
        toastSuccess(t('messages.updateSuccess'), t('messages.updateSuccess'));
        setShowEditDialog(false);
        setSelectedProduct(null);
        refetch();
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (error) {
      // Error automatically handled by useGlobalErrorHandler
      throw error;
    }
  }, [selectedProduct, toastSuccess, refetch, t]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      const response = await productsApi.deleteProduct(productToDelete.id);
      if (response.success) {
        toastSuccess(t('messages.deleteSuccess'), t('messages.deleteSuccess'));
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        refetch();
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (error) {
      // Error automatically handled by useGlobalErrorHandler
    }
  }, [productToDelete, toastSuccess, refetch, t]);

  // Handle product creation from add dialog
  const handleProductCreated = useCallback(async (productData: any) => {
    try {
      const response = await productsApi.createProduct(productData);
      
      if (response.success) {
        toastSuccess(t('messages.createSuccess'), t('messages.createSuccess'));
        setShowAddDialog(false);
        refetch();
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (error: any) {
      // Error automatically handled by useGlobalErrorHandler
      throw error; // Re-throw to let dialog handle it
    }
  }, [toastSuccess, refetch, t]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const productData = useMemo(() => {
    if (!data) {
      return {
        items: [],
        products: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false
      };
    }

    return {
      items: data.products, // Required by BaseSearchResult
      products: data.products, // Alias for backward compatibility
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
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
            {/* Export button - only show when products are selected */}
            {canExport && selectedProductIds.length > 0 && (
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {tc('buttons.export')} ({selectedProductIds.length})
              </Button>
            )}
            {canExport && selectedProductIds.length === 0 && (
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {tc('buttons.export')}
              </Button>
            )}
            {/* ✅ Only show Add Product button if user can manage products */}
            {canManageProducts && (
              <Button 
                onClick={() => setShowAddDialog(true)}
                variant="default"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createProduct')}
              </Button>
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
              message={tc('labels.loading') || 'Loading products...'}
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
          />
        )}
      </div>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="text-lg font-semibold">
                {t('productDetails')}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t('productDetails') || "View product information and details"}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 overflow-y-auto">
            <ProductDetail
              product={selectedProduct}
              onEdit={() => {
                setShowDetailDialog(false);
                setShowEditDialog(true);
              }}
              showActions={true}
              isMerchantAccount={true}
            />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Product Dialog */}
      <ProductAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categories={categories}
        outlets={outlets}
        merchantId={String(user?.merchantId || user?.merchant?.id || 0)}
        onProductCreated={handleProductCreated}
        onError={(error) => {
          // ✅ onProductCreated already shows toast, so onError is only for logging
          console.error('❌ ProductAddDialog: Error occurred:', error);
        }}
      />

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {t('editProduct')}: {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t('editProduct') || "Update product information and settings"}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="px-6 py-4 overflow-y-auto">
            <ProductEdit
              product={selectedProduct}
              categories={categories}
              outlets={outlets}
              merchantId={user?.merchantId || user?.merchant?.id || 0}
              onSave={async (productData) => {
                const updateData: any = {
                  id: selectedProduct.id,
                  ...productData,
                  // Convert images array to string format for API
                  images: Array.isArray(productData.images) 
                    ? productData.images.join(',') 
                    : productData.images || '',
                  // Ensure outletStock is included for inventory update
                  outletStock: productData.outletStock || []
                };
                await handleProductUpdate(updateData);
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedProduct(null);
              }}
            />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
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
          setProductToDelete(null);
        }}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        resourceName="Products"
        isLoading={isExporting}
        selectedCount={selectedProductIds.length}
        onExport={async (params) => {
          try {
            setIsExporting(true);
            const blob = await productsApi.exportProducts(params);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products-export-${new Date().toISOString().split('T')[0]}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toastSuccess(tc('labels.success'), 'Export completed successfully');
            setShowExportDialog(false);
            setSelectedProductIds([]); // Clear selection after export
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
