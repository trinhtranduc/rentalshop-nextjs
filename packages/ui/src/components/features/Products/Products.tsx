'use client';

import React, { useState } from 'react';
import { 
  ProductHeader, 
  ProductFilters, 
  ProductGrid, 
  ProductTable, 
  ProductActions, 
  ProductPagination,
  ProductDetail,
  ProductAddForm,
  ProductEdit,
  ProductOrdersDialog
} from './components';
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
  Button,
  EmptyState
} from '@rentalshop/ui';
import { 
  ProductSearchResult as ProductData, 
  ProductFilters as ProductFiltersType,
  Category,
  Outlet,
  ProductWithDetails,
  Product,
  ProductCreateInput,
  ProductUpdateInput
} from '@rentalshop/types';
import { useProductManagement, type UseProductManagementOptions } from '@rentalshop/hooks';
import { 
  Package as PackageIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ShoppingCart,
  Download
} from 'lucide-react';

interface ProductsProps {
  // Legacy props for backward compatibility
  data?: ProductData;
  filters?: ProductFiltersType;
  viewMode?: 'grid' | 'table';
  onFiltersChange?: (filters: ProductFiltersType) => void;
  onSearchChange?: (searchValue: string) => void;
  onClearFilters?: () => void;
  onViewModeChange?: (mode: 'grid' | 'table') => void;
  onProductAction?: (action: string, productId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  categories?: Category[];
  outlets?: Outlet[];
  merchantId?: number;
  onProductCreated?: (product: ProductWithDetails) => void;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
  
  // New management props
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  useSearchProducts?: boolean;
  initialLimit?: number;
  outletId?: number;
  currentUser?: any;
  onExport?: () => void;
  className?: string;
  mode?: 'legacy' | 'management'; // 'legacy' for existing usage, 'management' for new management interface
}

// Export the main Products component
export function Products({ 
  // Legacy props
  data, 
  filters, 
  viewMode, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onViewModeChange, 
  onProductAction, 
  onPageChange,
  onSort,
  categories = [],
  outlets = [],
  merchantId,
  onProductCreated,
  onProductUpdated,
  onError,
  
  // New management props
  title = "Product Management",
  subtitle = "Manage products in the system",
  showExportButton = true,
  showAddButton = true,
  addButtonText = "Add Product",
  exportButtonText = "Export Products",
  showStats = false,
  useSearchProducts = false,
  initialLimit = 20,
  outletId,
  currentUser,
  onExport,
  className = "",
  mode = 'legacy'
}: ProductsProps) {
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // For legacy mode, use the existing implementation
  if (mode === 'legacy' && data && filters && onFiltersChange && onSearchChange && onProductAction && onPageChange) {
    return (
      <div className="space-y-6">      
        <ProductFilters 
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          onClearFilters={onClearFilters}
        />

        <ProductTable 
            products={data.products}
            onProductAction={onProductAction}
            sortBy="name"
            sortOrder="asc"
            onSort={onSort}
        />
        
        <ProductPagination 
          currentPage={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  // For management mode, use the new management interface
  const hookOptions: UseProductManagementOptions = {
    initialLimit,
    useSearchProducts,
    enableStats: showStats,
    merchantId,
    outletId
  };

  const {
    // State
    products,
    loading,
    searchTerm,
    categoryFilter,
    outletFilter,
    availabilityFilter,
    statusFilter,
    selectedProduct,
    showProductDetail,
    showCreateForm,
    showEditDialog,
    showOrdersDialog,
    pagination,
    
    // Actions
    setSearchTerm,
    setCategoryFilter,
    setOutletFilter,
    setAvailabilityFilter,
    setStatusFilter,
    setSelectedProduct,
    setShowProductDetail,
    setShowCreateForm,
    setShowEditDialog,
    setShowOrdersDialog,
    
    // Handlers
    fetchProducts,
    handleViewProduct,
    handleEditProduct,
    handleToggleStatus,
    handleProductUpdated,
    handleProductError,
    handleProductRowAction,
    handleAddProduct,
    handleExportProducts,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleProductCreated,
    handleProductUpdatedAsync,
    
    // Computed values
    filteredProducts,
    filters: hookFilters,
    stats
  } = useProductManagement(hookOptions);

  // Handle product creation
  const handleProductCreatedWrapper = async (productData: ProductCreateInput) => {
    try {
      await handleProductCreated(productData);
      showSuccess('Product Created', 'Product has been created successfully!');
    } catch (error) {
      showError('Creation Failed', error instanceof Error ? error.message : 'Failed to create product');
    }
  };

  // Handle product update
  const handleProductUpdatedWrapper = async (productData: ProductUpdateInput) => {
    try {
      await handleProductUpdatedAsync(productData);
      showSuccess('Product Updated', 'Product has been updated successfully!');
    } catch (error) {
      showError('Update Failed', error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      handleExportProducts();
    }
  };

  // Loading state
  if (loading && products.length === 0) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="h-96 bg-bg-tertiary rounded"></div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className={className}>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            {subtitle && (
              <p className="text-text-secondary mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {showExportButton && (
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportButtonText}
              </Button>
            )}
            {showAddButton && (
              <Button
                onClick={handleAddProduct}
                className="flex items-center"
              >
                <PackageIcon className="w-4 h-4 mr-2" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
      </div>

      <PageContent>
        {/* Stats Overview */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center">
                <PackageIcon className="h-8 w-8 text-action-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-text-secondary">Total Products</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalProducts}</p>
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-action-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-text-secondary">Active Products</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.activeProducts}</p>
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-action-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-text-secondary">In Stock</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.inStockProducts}</p>
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-action-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-text-secondary">Low Stock</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.lowStockProducts}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <ProductFilters
            filters={hookFilters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Products Table */}
        {filteredProducts.length > 0 ? (
          <div className="mb-6">
            <ProductTable
              products={filteredProducts}
              onProductAction={handleProductRowAction}
              sortBy="name"
              sortOrder="asc"
              onSort={(column) => {
                // TODO: Implement sorting
                console.log('Sort by:', column);
              }}
            />
          </div>
        ) : (
          <div className="mb-6">
            <EmptyState
              icon={PackageIcon}
              title="No products found"
              description={
                searchTerm || categoryFilter !== 'all' || outletFilter !== 'all' || 
                availabilityFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first product'
              }
            />
            {!searchTerm && categoryFilter === 'all' && outletFilter === 'all' && 
             availabilityFilter === 'all' && statusFilter === 'all' && showAddButton && (
              <div className="text-center mt-4">
                <Button onClick={handleAddProduct}>
                  <PackageIcon className="w-4 h-4 mr-2" />
                  {addButtonText}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mb-6">
            <ProductPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={handlePageChangeWithFetch}
            />
          </div>
        )}
      </PageContent>

      {/* Product Detail Dialog */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View and manage product information.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              onEdit={handleEditProduct}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <ProductAddForm
            onSave={handleProductCreatedWrapper}
            onBack={() => setShowCreateForm(false)}
            categories={[]}
            outlets={[]}
            merchantId={merchantId?.toString() || ''}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information below.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ProductEdit
              product={selectedProduct as any}
              onSave={handleProductUpdatedWrapper}
              onBack={() => setShowEditDialog(false)}
              categories={[]}
              outlets={[]}
              merchantId={merchantId || 0}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Orders Dialog */}
      <ProductOrdersDialog
        open={showOrdersDialog}
        onOpenChange={setShowOrdersDialog}
        product={selectedProduct}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
}

export default Products;
