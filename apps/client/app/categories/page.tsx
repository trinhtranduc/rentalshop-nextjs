'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Categories,
  Button
} from '@rentalshop/ui';
import { categoriesApi } from '@rentalshop/utils';
import { usePagination } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import type { Category, CategorySearchParams, CategoryData } from '@rentalshop/types';

export default function CategoriesPage() {
  // State for categories and UI
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CategorySearchParams>({ search: '' });
  const [isClient, setIsClient] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Pagination hook
  const { pagination, handlePageChange: paginationPageChange, updatePaginationFromResponse } = usePagination({
    initialLimit: PAGINATION.DEFAULT_PAGE_SIZE,
    initialOffset: 0
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const hasInitializedRef = useRef(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch categories on component mount
  useEffect(() => {
    if (!isClient) return; // Don't run on server side
    
    // Add a small delay to ensure skeleton is visible
    const timer = setTimeout(() => {
      fetchCategories();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isClient]); // Only run when isClient becomes true

  // Fetch categories when pagination or search changes
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchCategories();
    }
  }, [pagination.offset, pagination.limit, searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔍 fetchCategories called with params:', {
        search: searchQuery,
        limit: pagination.limit,
        offset: pagination.offset,
        currentPage: pagination.currentPage
      });

      // Use paginated API if we have search or pagination
      if (searchQuery || pagination.offset > 0) {
        const response = await categoriesApi.getCategoriesPaginated(
          pagination.currentPage,
          pagination.limit
        );
        
        if (response.success && response.data) {
          const data = response.data;
          console.log('🔍 Categories API response:', data);
          
          setCategories(data.categories || []);
          
          // Update pagination from API response
          updatePaginationFromResponse({
            total: data.total || 0,
            limit: pagination.limit,
            offset: pagination.offset,
            hasMore: data.total > pagination.offset + pagination.limit
          });
        } else {
          throw new Error(response.message || 'Failed to fetch categories');
        }
      } else {
        // Use regular API for initial load
        const response = await categoriesApi.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
          
          // Update pagination for regular response
          updatePaginationFromResponse({
            total: response.data.length,
            limit: pagination.limit,
            offset: 0,
            hasMore: false
          });
        } else {
          throw new Error(response.message || 'Failed to fetch categories');
        }
      }
      
      hasInitializedRef.current = true;
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [pagination.offset, pagination.limit, pagination.currentPage, searchQuery, updatePaginationFromResponse, isInitialLoad]);

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search);
    setFilters(prev => ({ ...prev, search }));
    // Reset pagination when search changes
    paginationPageChange(1);
  }, [paginationPageChange]);

  const handleFiltersChange = useCallback((newFilters: CategorySearchParams) => {
    setFilters(newFilters);
    setSearchQuery(newFilters.search || '');
    // Reset pagination when filters change
    paginationPageChange(1);
  }, [paginationPageChange]);

  const handleClearFilters = useCallback(() => {
    setFilters({ search: '' });
    setSearchQuery('');
    // Reset pagination when clearing filters
    paginationPageChange(1);
  }, [paginationPageChange]);

  const handleCategoryAction = useCallback((action: string, categoryId: number) => {
    console.log('Category action:', action, categoryId);
    // Handle different actions here
  }, []);

  const handleCategoryCreated = useCallback(async (categoryData: Partial<Category>) => {
    try {
      const response = await categoriesApi.createCategory(categoryData);
      if (response.success && response.data) {
        const newCategory = response.data;
        setCategories(prev => [newCategory, ...prev]);
        // Refresh the list to get updated data
        fetchCategories();
      } else {
        throw new Error(response.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }, [fetchCategories]);

  const handleCategoryUpdated = useCallback(async (categoryData: Partial<Category>) => {
    try {
      if (!categoryData.id) { throw new Error('Category ID is required for update'); }
      const response = await categoriesApi.updateCategory(categoryData.id, categoryData);
      if (response.success && response.data) {
        const updatedCategory = response.data;
        setCategories(prev => {
          const newCategories: Category[] = prev.map(cat =>
            cat.id === updatedCategory.id ? updatedCategory : cat
          );
          return newCategories;
        });
      } else {
        throw new Error(response.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }, []);

  const handleCategoryDeleted = useCallback(async (categoryId: number) => {
    try {
      const response = await categoriesApi.deleteCategory(categoryId);
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        // Refresh the list to get updated data
        fetchCategories();
      } else {
        throw new Error(response.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }, [fetchCategories]);

  const handleError = useCallback((error: string) => {
    setError(error);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          {/* Main Content with Skeleton Loading */}
          <div className="container mx-auto px-4 py-6">
            <Categories
              categories={[]}
              loading={true}
              onCategoryAction={handleCategoryAction}
              onCategoryCreated={handleCategoryCreated}
              onCategoryUpdated={handleCategoryUpdated}
              onCategoryDeleted={handleCategoryDeleted}
              onError={handleError}
              filters={{
                filters: filters,
                onFiltersChange: handleFiltersChange,
                onSearchChange: handleSearchChange,
                onClearFilters: handleClearFilters
              }}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalCategories={pagination.total}
              limit={pagination.limit}
              onPageChange={paginationPageChange}
            />
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold mb-2">Error Loading Categories</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchCategories} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Don't render Categories component until we're on client side
  if (!isClient) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="container mx-auto px-4 py-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-4">
                {/* Table Header Skeleton */}
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-12"></div>
                  <div className="h-4 bg-muted rounded flex-1"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
                
                {/* Table Rows Skeleton */}
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 py-3">
                    <div className="h-4 bg-muted rounded w-12"></div>
                    <div className="h-4 bg-muted rounded flex-1"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageContent>
        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Categories
            categories={categories}
            loading={loading}
            onCategoryAction={handleCategoryAction}
            onCategoryCreated={handleCategoryCreated}
            onCategoryUpdated={handleCategoryUpdated}
            onCategoryDeleted={handleCategoryDeleted}
            onError={handleError}
            filters={{
              filters: filters,
              onFiltersChange: handleFiltersChange,
              onSearchChange: handleSearchChange,
              onClearFilters: handleClearFilters
            }}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalCategories={pagination.total}
            limit={pagination.limit}
            onPageChange={paginationPageChange}
          />
        </div>
      </PageContent>
    </PageWrapper>
  );
}
