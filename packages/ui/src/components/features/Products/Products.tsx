import React from 'react';
import { 
  ProductHeader, 
  ProductFilters, 
  ProductGrid, 
  ProductTable, 
  ProductActions, 
  ProductPagination,
} from './components';
import { 
  ProductData, 
  ProductFilters as ProductFiltersType,
  Category,
  Outlet,
  ProductWithDetails
} from '@rentalshop/types';

interface ProductsProps {
  data: ProductData;
  filters: ProductFiltersType;
  viewMode: 'grid' | 'table';
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onProductAction: (action: string, productId: string) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
  // Enhanced props for product management
  categories?: Category[];
  outlets?: Outlet[];
  merchantId?: string;
  onProductCreated?: (product: ProductWithDetails) => void;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
}

// Export the main Products component
export function Products({ 
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
  // Enhanced props
  categories = [],
  outlets = [],
  merchantId = '',
  onProductCreated,
  onProductUpdated,
  onError
}: ProductsProps) {
  return (
    <div className="space-y-6">
      <ProductHeader 
        totalProducts={data.total}
        onViewModeChange={onViewModeChange}
        viewMode={viewMode}
      />
      
      <ProductFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />
            
      {viewMode === 'grid' ? (
        <ProductGrid 
          products={data.products}
          onProductAction={onProductAction}
          // Pass enhanced props
          categories={categories}
          outlets={outlets}
          merchantId={merchantId}
          onProductCreated={onProductCreated}
          onProductUpdated={onProductUpdated}
          onError={onError}
          showAddButton={true}
        />
      ) : (
        <ProductTable 
          products={data.products}
          onProductAction={onProductAction}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={onSort}
        />
      )}
      
      <ProductPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default Products;
