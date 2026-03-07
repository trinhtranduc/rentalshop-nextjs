'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DropdownMenuTrigger
} from '@rentalshop/ui';
import { Package, Trash2, Upload, Download, MoreVertical, Plus } from 'lucide-react';
import { merchantsApi, productsApi } from '@rentalshop/utils';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import type { ProductFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT PRODUCTS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Breadcrumb navigation
 */
export default function MerchantProductsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const { canManageProducts, canExportProducts } = usePermissions();
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [products, setProducts] = useState<any[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant info
      const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
      
      if (merchantData.success && merchantData.data) {
        setMerchantName(merchantData.data.name);
      }

      // Fetch products
      const productsRes = await merchantsApi.products.list(parseInt(merchantId));
      const productsData = await productsRes.json();
      console.log('📦 Products API response:', productsData);

      if (productsData.success) {
        // API returns data as direct array OR data.products
        const productsList = Array.isArray(productsData.data) 
          ? productsData.data 
          : productsData.data?.products || [];
        setProducts(productsList);
        console.log('📦 Products set, count:', productsList.length);
      } else {
        setError(productsData.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CLIENT-SIDE FILTERING & PAGINATION
  // ============================================================================
  
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (search) {
      filtered = filtered.filter((p: any) => 
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const order = sortOrder === 'desc' ? -1 : 1;
      return (aVal > bVal ? 1 : -1) * order;
    });
    
    return filtered;
  }, [products, search, sortBy, sortOrder]);

  const productData = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    
    return {
      products: paginatedProducts,
      items: paginatedProducts, // Alias for compatibility
      total,
      page,
      currentPage: page,
      totalPages,
      limit,
      hasMore: endIndex < total
    };
  }, [filteredProducts, page, limit]);

  // ============================================================================
  // URL UPDATE HELPER
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
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
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
          fetchData(); // Refresh products list
        }
      } else {
        throw new Error(response.message || 'Failed to delete products');
      }
    } catch (error: any) {
      console.error('Error batch deleting products:', error);
      // Error handled by global error handler
    } finally {
      setIsDeleting(false);
    }
  }, [selectedProductIds, toastSuccess, fetchData]);

  const handleImportSuccess = useCallback(() => {
    toastSuccess('Success', 'Products imported successfully');
    setShowImportDialog(false);
    fetchData();
  }, [toastSuccess, fetchData]);

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
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Products', icon: <Package className="w-4 h-4" /> }
  ], [merchantId, merchantName]);

  if (error) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Products</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const filters = { search, page, limit, sortBy, sortOrder };

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

      <div className="flex-1 min-h-0 overflow-auto">
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
          title="Merchant Products"
          subtitle={`Manage products for ${merchantName}`}
          showExportButton={false} // Export feature - temporarily hidden, will be enabled in the future
          showAddButton={true}
          addButtonText="Add Product"
          exportButtonText="Export Products"
          showStats={true}
          currentUser={user}
        />
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
