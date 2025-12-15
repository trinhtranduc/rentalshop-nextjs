'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Categories,
  CategoriesLoading,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmationDialog,
  AddCategoryDialog,
  CategoryFormContent,
  Button,
  LoadingIndicator
} from '@rentalshop/ui';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useCategoriesWithFilters, useCategoriesTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
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
  const { toastSuccess } = useToast();
  const t = useCommonTranslations();
  const tc = useCategoriesTranslations();
  // ✅ Use permissions hook to check if user can manage products (categories are part of products)
  const { canManageProducts } = usePermissions();
  
  // Dialog states
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  const merchantId = user?.merchant?.id || user?.merchantId;
  
  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // ✅ SIMPLE: Memoize filters - useDedupedApi handles deduplication
  const filters: CategoryFilters = useMemo(() => ({
    q: search || undefined,
    merchantId: merchantId ? Number(merchantId) : undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, merchantId, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useCategoriesWithFilters({ filters });

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

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleCategoryAction = useCallback(async (action: string, categoryId: number) => {
    const category = data?.categories.find((c: Category) => c.id === categoryId);
    
    switch (action) {
      case 'view':
        if (category) {
          setSelectedCategory(category);
          setShowDetailDialog(true);
        }
        break;
        
      case 'edit':
        if (category) {
          setCategoryToEdit(category);
          setShowEditDialog(true);
        }
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
                tc(`messages.${action === 'activate' ? 'updateSuccess' : 'updateSuccess'}`), 
                tc(`messages.${action === 'activate' ? 'updateSuccess' : 'updateSuccess'}`)
              );
              refetch();
            }
            // Error automatically handled by useGlobalErrorHandler
          } catch (err) {
            // Error automatically handled by useGlobalErrorHandler
          }
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.categories, router, toastSuccess, refetch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await categoriesApi.deleteCategory(categoryToDelete.id);
      if (response.success) {
        toastSuccess(tc('messages.deleteSuccess'), tc('messages.deleteSuccess'));
        refetch();
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, toastSuccess, refetch, tc]);

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
  // RENDER - Page renders immediately, show loading indicator
  // ============================================================================

  return (
    <PageWrapper spacing="none" maxWidth="full" className="h-screen flex flex-col px-4 pt-4 pb-0 overflow-hidden">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle={tc('title')}>
              {tc('title')}
            </PageTitle>
          </div>
          {/* ✅ Only show Add Category button if user can manage products */}
          {canManageProducts && (
            <Button 
              onClick={() => setShowAddDialog(true)}
              variant="default"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('buttons.add')} {t('labels.category')}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Center Loading Indicator - Shows when waiting for API */}
        {loading && !data ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={tc('labels.loading') || 'Loading categories...'}
            />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : (
          /* Categories Content - Only render when data is loaded */
          <Categories
            data={categoryData}
            filters={filters}
            onSearchChange={handleSearchChange}
            onCategoryAction={handleCategoryAction}
            onPageChange={handlePageChange}
            onSort={handleSort}
          />
        )}
      </div>

      {/* View Category Dialog */}
      {selectedCategory && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{tc('dialog.viewDetails')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{tc('fields.name')}</p>
                <p className="mt-1 text-gray-900 font-medium">{selectedCategory.name}</p>
              </div>
              {selectedCategory.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">{tc('fields.description')}</p>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedCategory.description}</p>
                </div>
              )}
              {/* Status field hidden as requested */}
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
              toastSuccess(tc('messages.createSuccess'), tc('messages.createSuccess'));
              refetch();
            }
            // Error automatically handled by useGlobalErrorHandler
          } catch (error: any) {
            // Error automatically handled by useGlobalErrorHandler
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          // ✅ onCategoryCreated already shows toast, so onError is only for logging
          console.error('❌ AddCategoryDialog: Error occurred:', error);
        }}
      />

      {/* Edit Category Dialog */}
      {categoryToEdit && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{tc('dialog.edit')}</DialogTitle>
            </DialogHeader>
            
            <div>
              {/* Use CategoryFormContent */}
              <CategoryFormContent
                category={categoryToEdit}
                mode="edit"
                onSave={async (categoryData) => {
                  try {
                    const response = await categoriesApi.updateCategory(categoryToEdit.id, {
                      name: categoryData.name,
                      description: categoryData.description
                    });
                    
                    if (response.success) {
                      toastSuccess(tc('messages.updateSuccess'), tc('messages.updateSuccess'));
                      setShowEditDialog(false);
                      setCategoryToEdit(null);
                      refetch();
                    }
                    // Error automatically handled by useGlobalErrorHandler
                  } catch (error) {
                    // Error automatically handled by useGlobalErrorHandler
                    throw error;
                  }
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setCategoryToEdit(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title={tc('actions.deleteCategory')}
        description={tc('messages.confirmDelete')}
        confirmText={tc('actions.deleteCategory')}
        cancelText={t('buttons.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete(null);
        }}
      />
    </PageWrapper>
  );
}
