'use client';

import React from 'react';
import { 
  ProductPageHeader,
  ProductFilters, 
  ProductTable
} from './components';
import { 
  Pagination,
  Button,
  Card,
  CardContent
} from '@rentalshop/ui/base';
import { PageWrapper, PageContent } from '../../layout/PageWrapper';
import EmptyState from '../Admin/components/EmptyState';
import { 
  ProductSearchResult as ProductData, 
  ProductFilters as ProductFiltersType
} from '@rentalshop/types';
import { useUserRole, useProductTranslations } from '@rentalshop/hooks';
import { 
  Package as PackageIcon, 
  Download
} from 'lucide-react';

interface ProductsProps {
  // Data props (required for external data mode - URL state pattern)
  data?: ProductData;
  filters?: ProductFiltersType;
  onFiltersChange?: (filters: ProductFiltersType) => void;
  onSearchChange?: (searchValue: string) => void;
  onClearFilters?: () => void;
  onProductAction?: (action: string, productId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  
  // Display props
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  currentUser?: any;
  onExport?: () => void;
  className?: string;
}

/**
 * ✅ SIMPLIFIED PRODUCTS COMPONENT (Modern Pattern)
 * 
 * - Clean presentation component (like Orders.tsx)
 * - No internal state management
 * - Works with external data (URL state pattern)
 * - Single responsibility: render products UI
 * - ~100 lines (was 561 lines before cleanup)
 */
export function Products({ 
  // Data props
  data, 
  filters = {}, 
  onFiltersChange = () => {}, 
  onSearchChange = () => {},
  onClearFilters = () => {},
  onProductAction = () => {}, 
  onPageChange = () => {},
  onSort = () => {},
  
  // Display props
  title = "Products",
  subtitle = "Manage your product catalog",
  showExportButton = false,
  showAddButton = false,
  addButtonText = "Add Product",
  exportButtonText = "Export Products",
  showStats = false,
  currentUser,
  onExport,
  className = ""
}: ProductsProps) {
  
  // User role check for permissions
  const { canManageProducts } = useUserRole(currentUser);
  
  // Get translations
  const t = useProductTranslations();
  
  // Handler for export button
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export functionality not implemented');
    }
  };

  // Handler for add product button  
  const handleAddProduct = () => {
    console.log('Add product functionality should be implemented in page');
  };

  // Default empty data
  const products = data?.products || [];
  const totalProducts = data?.total || 0;
  const currentPage = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const limit = data?.limit || 25;

  // Memoize handlers to prevent child re-renders
  const memoizedOnFiltersChange = React.useCallback(onFiltersChange, [onFiltersChange]);
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnClearFilters = React.useCallback(onClearFilters, [onClearFilters]);
  const memoizedOnProductAction = React.useCallback(onProductAction, [onProductAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort, [onSort]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <ProductPageHeader
          title={title}
          subtitle={subtitle}
        >
          {showAddButton && canManageProducts && (
            <Button
              onClick={handleAddProduct}
              className="flex items-center space-x-2"
            >
              <PackageIcon className="w-4 h-4" />
              <span>{addButtonText}</span>
            </Button>
          )}
          {showExportButton && (
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{exportButtonText}</span>
            </Button>
          )}
        </ProductPageHeader>

        {/* Compact Filters - All in one row */}
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <ProductFilters
                filters={filters}
                onFiltersChange={memoizedOnFiltersChange}
                onSearchChange={memoizedOnSearchChange}
                onClearFilters={memoizedOnClearFilters}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-4">
        {products.length > 0 ? (
          <ProductTable
            products={products}
            onProductAction={memoizedOnProductAction}
            sortBy={filters.sortBy || "name"}
            sortOrder={filters.sortOrder || "asc"}
            onSort={memoizedOnSort}
          />
        ) : (
          <EmptyState
            icon={PackageIcon}
            title={t('messages.noProducts')}
            description={
              filters.search || filters.categoryId || filters.outletId
                ? t('messages.tryAdjustingSearch')
                : t('messages.getStarted')
            }
          />
        )}
      </div>

      {/* Fixed Pagination Section - Always at Bottom */}
      {products.length > 0 && totalProducts > limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalProducts}
            limit={limit}
            onPageChange={memoizedOnPageChange}
            itemName="products"
          />
        </div>
      )}
    </div>
  );
}

export default Products;
