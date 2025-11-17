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
  Button
} from '@rentalshop/ui';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useCategoriesWithFilters, useCategoriesTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  const t = useCommonTranslations();
  const tc = useCategoriesTranslations();
  
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
      if (value && value !== '' && value !== 'all') {
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
      } else {
              toastError(tc('messages.updateFailed'), response.error || tc('messages.updateFailed'));
            }
          } catch (err) {
            toastError(tc('messages.updateFailed'), tc('messages.updateFailed'));
          }
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.categories, router, toastSuccess, toastError, refetch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await categoriesApi.deleteCategory(categoryToDelete.id);
      if (response.success) {
        toastSuccess(tc('messages.deleteSuccess'), tc('messages.deleteSuccess'));
        refetch();
      } else {
        toastError(tc('messages.deleteFailed'), response.error || tc('messages.deleteFailed'));
      }
    } catch (err) {
      toastError(tc('messages.deleteFailed'), tc('messages.deleteFailed'));
    } finally {
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, router, toastSuccess, toastError, refetch]);

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
  // RENDER - Show skeleton when loading initial data
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <PageTitle>{t('navigation.categories')}</PageTitle>
          <p className="text-sm text-gray-600">{t('navigation.categories')}</p>
        </PageHeader>
        <CategoriesLoading />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle={tc('title')}>
              {tc('title')}
            </PageTitle>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            variant="default"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('buttons.add')} {t('labels.category')}
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : (
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
            } else {
              throw new Error(response.error || tc('messages.createFailed'));
            }
          } catch (error) {
            console.error('Error creating category:', error);
            toastError(tc('messages.createFailed'), error instanceof Error ? error.message : tc('messages.createFailed'));
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError(tc('messages.createFailed'), error);
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
                    } else {
                      throw new Error(response.error || tc('messages.updateFailed'));
                    }
                  } catch (error) {
                    console.error('Error updating category:', error);
                    toastError(tc('messages.updateFailed'), error instanceof Error ? error.message : tc('messages.updateFailed'));
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
