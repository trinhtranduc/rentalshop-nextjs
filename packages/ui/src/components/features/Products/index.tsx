import React from 'react';
import { 
  ProductHeader, 
  ProductFilters, 
  ProductGrid, 
  ProductTable, 
  ProductActions, 
  ProductPagination 
} from './components';
import { ProductData, ProductFilters as ProductFiltersType } from './types';

interface ProductsProps {
  data: ProductData;
  filters: ProductFiltersType;
  viewMode: 'grid' | 'table';
  onFiltersChange: (filters: ProductFiltersType) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onProductAction: (action: string, productId: string) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
}

export function Products({ 
  data, 
  filters, 
  viewMode, 
  onFiltersChange, 
  onViewModeChange, 
  onProductAction, 
  onPageChange,
  onSort
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
      />
            
      {viewMode === 'grid' ? (
        <ProductGrid 
          products={data.products}
          onProductAction={onProductAction}
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
