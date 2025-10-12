'use client';

import React, { useCallback, useMemo, useTransition, useRef, useState } from 'react';
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
  ProductDetail,
  ProductEdit,
  ConfirmationDialog,
  Button
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useProductsData, useCanExportData } from '@rentalshop/hooks';
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
  const { toastSuccess, toastError } = useToast();
  const canExport = useCanExportData();
  const [isPending, startTransition] = useTransition();
  
  // Dialog states
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);
  
  // Data for edit dialog
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  
  // Fetch categories and outlets for edit dialog
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, outletsRes] = await Promise.all([
          categoriesApi.getCategories(),
          outletsApi.getOutlets()
        ]);
        
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (outletsRes.success && outletsRes.data) {
          setOutlets(outletsRes.data.outlets || []);
        }
      } catch (error) {
        console.error('Error fetching categories/outlets:', error);
      }
    };
    
    fetchData();
  }, []);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined;
  const outletId = searchParams.get('outlet') ? parseInt(searchParams.get('outlet')!) : undefined;
  const available = searchParams.get('available') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // ✅ FIX: Memoize với ref để tránh re-create khi dependencies không thực sự thay đổi
  const filtersRef = useRef<ProductFilters | null>(null);
  const filters: ProductFilters = useMemo(() => {
    const newFilters: ProductFilters = {
      q: search || undefined,
      search: search || undefined,
      categoryId,
      outletId,
      available: available === 'in-stock' ? true : 
                 available === 'out-of-stock' ? false : undefined,
      status: (status as any) || undefined,
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
  }, [search, categoryId, outletId, available, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useProductsData({ 
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

  const handleFiltersChange = useCallback((newFilters: Partial<ProductFilters>) => {
    console.log('🔧 Page: Filters changed:', newFilters);
    
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if ('categoryId' in newFilters) {
      updates.category = newFilters.categoryId as any;
    }
    if ('outletId' in newFilters) {
      updates.outlet = newFilters.outletId as any;
    }
    if ('available' in newFilters) {
      if (newFilters.available === true) {
        updates.available = 'in-stock';
      } else if (newFilters.available === false) {
        updates.available = 'out-of-stock';
      } else {
        updates.available = undefined;
      }
    }
    if ('status' in newFilters) {
      updates.status = newFilters.status as any;
    }
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
    // Clear all params except page
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
          } else {
            toastError('Error', 'Failed to fetch product details');
          }
        } catch (error) {
          toastError('Error', (error as Error).message);
        }
        break;
        
      case 'edit':
        // Fetch full product details before showing edit dialog
        try {
          const response = await productsApi.getProduct(productId);
          if (response.success && response.data) {
            setSelectedProduct(response.data as ProductWithDetails);
            setShowEditDialog(true);
          } else {
            toastError('Error', 'Failed to fetch product details');
          }
        } catch (error) {
          toastError('Error', (error as Error).message);
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
                'Product Updated', 
                `Product status changed to ${!product.isActive ? 'active' : 'inactive'}`
              );
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to update product');
            }
          } catch (error) {
            toastError('Update Failed', (error as Error).message);
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
  }, [data?.products, router, toastSuccess, toastError]);
  
  // Handle product update from edit dialog
  const handleProductUpdate = useCallback(async (productData: ProductUpdateInput) => {
    if (!selectedProduct) return;
    
    try {
      const response = await productsApi.updateProduct(selectedProduct.id, productData);
      if (response.success) {
        toastSuccess('Product Updated', 'Product has been updated successfully');
        setShowEditDialog(false);
        setSelectedProduct(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to update product');
      }
    } catch (error) {
      toastError('Update Failed', (error as Error).message);
      throw error;
    }
  }, [selectedProduct, router, toastSuccess, toastError]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      const response = await productsApi.deleteProduct(productToDelete.id);
      if (response.success) {
        toastSuccess('Product Deleted', `Product "${productToDelete.name}" has been deleted successfully`);
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to delete product');
      }
    } catch (error) {
      toastError('Delete Failed', (error as Error).message);
    }
  }, [productToDelete, router, toastSuccess, toastError]);

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
      items: data.products,
      products: data.products,
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
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <PageTitle>Products</PageTitle>
          <p className="text-sm text-gray-600">Manage your product catalog</p>
        </PageHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <ProductsLoading />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Products</PageTitle>
            <p className="text-sm text-gray-600">Manage your product catalog with outlet stock allocation</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <Button
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button 
              onClick={() => setShowAddDialog(true)}
              variant="success"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
      <Products
          data={productData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        onProductAction={handleProductAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            <ProductDetail
              product={selectedProduct}
              onEdit={() => {
                setShowDetailDialog(false);
                setShowEditDialog(true);
              }}
              showActions={true}
              isMerchantAccount={true}
            />
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
        onProductCreated={async (productData: any) => {
          try {
            const response = await productsApi.createProduct(productData);
            
            if (response.success) {
              toastSuccess('Product Created', `Product "${productData.name}" has been created successfully`);
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to create product');
            }
          } catch (error) {
            console.error('Error creating product:', error);
            toastError('Error', error instanceof Error ? error.message : 'Failed to create product');
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError('Error', error);
        }}
      />

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Product: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <ProductEdit
              product={selectedProduct as any}
              categories={categories}
              outlets={outlets}
              merchantId={user?.merchantId || user?.merchant?.id || 0}
              onSave={async (productInput) => {
                // Convert ProductInput to ProductUpdateInput
                const updateData: ProductUpdateInput = {
                  id: selectedProduct.id,
                  name: productInput.name,
                  description: productInput.description,
                  barcode: productInput.barcode,
                  categoryId: productInput.categoryId,
                  rentPrice: productInput.rentPrice,
                  salePrice: productInput.salePrice,
                  deposit: productInput.deposit,
                  stock: productInput.totalStock,
                  isActive: selectedProduct.isActive
                };
                await handleProductUpdate(updateData);
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete Product"
        description={`Are you sure you want to delete product "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setProductToDelete(null);
        }}
      />
    </PageWrapper>
  );
} 
