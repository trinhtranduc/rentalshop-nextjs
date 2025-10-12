'use client';

import React, { useCallback, useMemo, useTransition, useRef, useState, useEffect } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Categories,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmationDialog,
  AddCategoryDialog,
  Button
} from '@rentalshop/ui';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useCategoriesData } from '@rentalshop/hooks';
import { categoriesApi } from '@rentalshop/utils';
import type { CategoryFilters, Category } from '@rentalshop/types';

/**
 * ✅ MODERN NEXT.JS 13+ CATEGORIES PAGE - URL STATE PATTERN WITH DEBOUNCED SEARCH
 */
export default function CategoriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Local search state for smooth typing (throttled to prevent lag)
  const [localSearch, setLocalSearch] = useState('');
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');
  const isThrottlingRef = useRef(false);
  
  // Dialog states
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  
  // Sync URL search to local state on mount/URL change
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  const merchantId = user?.merchant?.id || user?.merchantId;
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const filtersRef = useRef<CategoryFilters | null>(null);
  const filters: CategoryFilters = useMemo(() => {
    const newFilters: CategoryFilters = {
      q: search || undefined, // Use URL search for API call (throttled updates)
      merchantId: merchantId ? Number(merchantId) : undefined,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    const filterString = JSON.stringify(newFilters);
    const prevFilterString = JSON.stringify(filtersRef.current);
    
    if (filterString === prevFilterString && filtersRef.current) {
      return filtersRef.current;
    }
    
    filtersRef.current = newFilters;
    return newFilters;
  }, [search, merchantId, status, page, limit, sortBy, sortOrder]);
  
  // Cleanup throttle timer on unmount
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  const { data, loading, error } = useCategoriesData({ 
    filters,
    debounceSearch: false, // Already throttled at input level
    debounceMs: 0
  });

  // ============================================================================
  // URL UPDATE HELPER
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
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    // Update local state immediately for smooth typing
    setLocalSearch(searchValue);
    
    // Throttle URL updates to prevent lag
    if (!isThrottlingRef.current) {
      // First call - execute immediately
      isThrottlingRef.current = true;
      lastSearchRef.current = searchValue;
      updateURL({ q: searchValue, page: 1 });
      
      // Set throttle timer
      throttleRef.current = setTimeout(() => {
        isThrottlingRef.current = false;
        
        // If search changed during throttle period, update again
        if (lastSearchRef.current !== searchValue) {
          updateURL({ q: searchValue, page: 1 });
        }
      }, 300); // 300ms throttle - executes max once per 300ms
    } else {
      // During throttle period - just save for later
      lastSearchRef.current = searchValue;
    }
  }, [updateURL]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleCategoryAction = useCallback(async (action: string, categoryId: number) => {
    const category = data?.categories.find(c => c.id === categoryId);
    
    switch (action) {
      case 'view':
        if (category) {
          setSelectedCategory(category);
          setShowDetailDialog(true);
        }
        break;
        
      case 'edit':
        router.push(`/categories/${categoryId}/edit`);
        break;
        
      case 'delete':
        if (category) {
          setCategoryToDelete(category);
          setShowDeleteConfirm(true);
        }
        break;
        
      case 'activate':
      case 'deactivate':
        if (category) {
          try {
            const response = await categoriesApi.updateCategory(categoryId, { 
              isActive: action === 'activate' 
            });
            if (response.success) {
              toastSuccess(
                `Category ${action === 'activate' ? 'activated' : 'deactivated'}`, 
                `Category "${category.name}" has been ${action === 'activate' ? 'activated' : 'deactivated'}`
              );
              router.refresh();
      } else {
              toastError(`Failed to ${action} category`, response.error || 'Unknown error occurred');
            }
          } catch (err) {
            toastError(`Error ${action}ing category`, 'An unexpected error occurred');
          }
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.categories, router, toastSuccess, toastError]);

  const handleConfirmDelete = useCallback(async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await categoriesApi.deleteCategory(categoryToDelete.id);
      if (response.success) {
        toastSuccess('Category deleted successfully', `Category "${categoryToDelete.name}" has been deleted`);
        router.refresh();
      } else {
        toastError('Failed to delete category', response.error || 'Unknown error occurred');
      }
    } catch (err) {
      toastError('Error deleting category', 'An unexpected error occurred');
    } finally {
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, router, toastSuccess, toastError]);

  // ============================================================================
  // TRANSFORM DATA
  // ============================================================================
  
  const categoryData = useMemo(() => {
    if (!data) return undefined;
    
    return {
      categories: data.categories || [],
      total: data.total || 0,
      currentPage: data.currentPage || page,
      totalPages: data.totalPages || 1,
      limit: data.limit || limit,
      hasMore: data.hasMore || false
    };
  }, [data, page, limit]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (error) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Add category dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle="Manage your product categories">
              Categories
            </PageTitle>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            variant="success"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
        <Categories
          data={categoryData}
          filters={{ ...filters, q: localSearch }} // Use localSearch for input display
          onSearchChange={handleSearchChange}
          onCategoryAction={handleCategoryAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* View Category Dialog */}
      {selectedCategory && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Category Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="mt-1 text-gray-900 font-medium">{selectedCategory.name}</p>
              </div>
              {selectedCategory.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedCategory.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedCategory.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedCategory.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCategoryCreated={async (categoryData) => {
          try {
            const response = await categoriesApi.createCategory({
              name: categoryData.name,
              description: categoryData.description,
              merchantId: user?.merchant?.id || user?.merchantId || 0
            });
            
            if (response.success) {
              toastSuccess('Category Created', `Category "${categoryData.name}" has been created successfully`);
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to create category');
            }
          } catch (error) {
            console.error('Error creating category:', error);
            toastError('Error', error instanceof Error ? error.message : 'Failed to create category');
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError('Error', error);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete Category"
        description={`Are you sure you want to delete category "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete(null);
        }}
      />
    </PageWrapper>
  );
}
