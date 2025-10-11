'use client';

import React from 'react';
import { 
  Pagination,
  EmptyState
} from '@rentalshop/ui';
import { CategoryTable, CategorySearch } from './components';
import { FolderOpen } from 'lucide-react';
import type { Category, CategoryFilters } from '@rentalshop/types';

// Data interface for categories list
export interface CategoriesData {
  categories: Category[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface CategoriesProps {
  // Data props
  data?: CategoriesData;
  filters?: CategoryFilters;
  onSearchChange?: (searchValue: string) => void;
  onCategoryAction?: (action: string, categoryId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  
  // Display props
  currentUser?: any;
  className?: string;
}

/**
 * ✅ SIMPLIFIED CATEGORIES COMPONENT (Modern Pattern)
 */
export const Categories: React.FC<CategoriesProps> = ({
  data,
  filters = {},
  onSearchChange = () => {},
  onCategoryAction = () => {},
  onPageChange = () => {},
  onSort = () => {},
  currentUser,
  className = ""
}) => {
  
  const categories = data?.categories || [];
  const totalCategories = data?.total || 0;
  const currentPage = data?.currentPage || 1;
  const totalPages = data?.totalPages || 1;
  const limit = data?.limit || 25;

  // Memoize handlers
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnCategoryAction = React.useCallback(onCategoryAction, [onCategoryAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort, [onSort]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Fixed Search Section */}
      <div className="flex-shrink-0 mb-4">
        <CategorySearch
          value={filters.q || ''}
          onChange={memoizedOnSearchChange}
          onClear={() => memoizedOnSearchChange('')}
        />
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0">
        {categories.length > 0 ? (
          <CategoryTable
            categories={categories}
            onCategoryAction={memoizedOnCategoryAction}
            sortBy={filters.sortBy || "name"}
            sortOrder={filters.sortOrder || "asc"}
            onSort={memoizedOnSort}
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No categories found"
            description={
              filters.q
                ? 'Try adjusting your search'
                : 'Get started by adding your first category'
            }
          />
        )}
      </div>

      {/* Fixed Pagination Section */}
      {categories.length > 0 && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalCategories}
            limit={limit}
            onPageChange={memoizedOnPageChange}
            itemName="categories"
          />
        </div>
      )}
    </div>
  );
};

export default Categories;
