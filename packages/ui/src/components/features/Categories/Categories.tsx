'use client'

import React, { useState, useCallback } from 'react';
import { CategoryHeader } from './components/CategoryHeader';
import { CategoryFilters as CategoryFiltersComponent } from './components/CategoryFilters';
import { CategoryActions } from './components/CategoryActions';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryTable } from './components/CategoryTable';
import { CategoryForm } from './components/CategoryForm';
import { CategoryView } from './components/CategoryView';
import type { 
  Category, 
  CategoryFiltersProps 
} from '@rentalshop/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Pagination } from '@rentalshop/ui';
import { Trash2 } from 'lucide-react';

interface CategoriesProps {
  categories: Category[];
  loading?: boolean;
  onCategoryAction: (action: string, categoryId: number) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Partial<Category>) => void;
  onCategoryDeleted: (categoryId: number) => void;
  onError: (error: string) => void;
  filters: CategoryFiltersProps;
  currentPage: number;
  totalPages: number;
  totalCategories: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Categories: React.FC<CategoriesProps> = ({
  categories,
  loading = false,
  onCategoryAction,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  onError,
  filters,
  currentPage,
  totalPages,
  totalCategories,
  limit,
  onPageChange
}) => {
  // Safety check for categories
  const safeCategories = categories || [];
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleAddCategory = useCallback(() => {
    setShowAddForm(true);
    setEditingCategory(null);
  }, []);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowAddForm(true);
  }, []);

  const handleViewCategory = useCallback((category: Category) => {
    setViewingCategory(category);
  }, []);

  const handleDeleteCategory = useCallback((category: Category) => {
    setDeletingCategory(category);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingCategory) return;
    
    try {
      await onCategoryDeleted(deletingCategory.id);
      setDeletingCategory(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete category');
    }
  }, [deletingCategory, onCategoryDeleted, onError]);

  const handleCancelDelete = useCallback(() => {
    setDeletingCategory(null);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    // You can implement sorting logic here or pass it up to parent
  }, []);

  const handleFormClose = useCallback(() => {
    setShowAddForm(false);
    setEditingCategory(null);
  }, []);

  const handleViewClose = useCallback(() => {
    setViewingCategory(null);
  }, []);

  const handleFormSubmit = useCallback(async (categoryData: Partial<Category>) => {
    try {
      if (editingCategory) {
        // Include the ID when updating a category
        const updateData = {
          ...categoryData,
          id: editingCategory.id
        };
        await onCategoryUpdated(updateData);
      } else {
        await onCategoryCreated(categoryData as Category);
      }
      handleFormClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  }, [editingCategory, onCategoryUpdated, onCategoryCreated, handleFormClose, onError]);

  // Sort categories based on current sort state
  const sortedCategories = React.useMemo(() => {
    if (!safeCategories || !safeCategories.length) return safeCategories || [];
    
    return [...safeCategories].sort((a, b) => {
      let aValue: any = a[sortField as keyof Category];
      let bValue: any = b[sortField as keyof Category];
      
      // Handle date fields
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }
      
      // Handle string fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [safeCategories, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      
      {/* Category Header */}
      <CategoryHeader
        onAddCategory={handleAddCategory}
      />

      {/* Category Filters */}
      <CategoryFiltersComponent
        filters={filters.filters}
        onFiltersChange={filters.onFiltersChange}
        onSearchChange={filters.onSearchChange}
        onClearFilters={filters.onClearFilters || (() => {})}
        onSortChange={handleSortChange}
        currentSort={{ field: sortField, order: sortOrder }}
      />

      {/* Category Actions - Hidden for now */}
      {/* <CategoryActions 
        onAddCategory={handleAddCategory}
        onImportCategories={() => onCategoryAction('import-categories', 0)}
        onExportCategories={() => onCategoryAction('export-categories', 0)}
        onBulkEdit={() => onCategoryAction('bulk-edit', 0)}
      /> */}

      {/* Category Display - Always Table Mode */}
      {(() => {
        return null;
      })()}
      
      {loading ? (
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
      ) : (
        <CategoryTable
          categories={sortedCategories}
          onViewCategory={handleViewCategory}
          onEditCategory={handleEditCategory}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      )}

      {/* Category Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={totalCategories}
        limit={limit}
        onPageChange={onPageChange}
        itemName="categories"
      />

      {/* Category Form Modal */}
      {showAddForm && (
        <CategoryForm
          mode={editingCategory ? 'edit' : 'create'}
          category={editingCategory}
          onSave={handleFormSubmit}
          onCancel={handleFormClose}
        />
      )}

      {/* Category View Dialog */}
      {viewingCategory && (
        <CategoryView
          category={viewingCategory}
          onClose={handleViewClose}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <CardTitle className="text-xl text-red-600">
                  Delete Category
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-text-primary">
                Are you sure you want to delete the category <strong>"{deletingCategory.name}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All products in this category will be affected.
              </p>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="flex-1"
                >
                  Delete Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
