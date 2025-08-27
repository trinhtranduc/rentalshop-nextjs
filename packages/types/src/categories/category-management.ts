// ============================================================================
// CATEGORY MANAGEMENT TYPES
// ============================================================================

import type { Category, CategoryFilters } from './category';

export interface CategoryData {
  categories: Category[];
  currentPage: number;
  totalPages: number;
  total: number;
}

export interface CategoryAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  onClick: () => void;
}

export interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
}

export interface CategoryFormErrors {
  name?: string;
  description?: string;
}

export interface CategoryFormProps {
  category?: Category | null;
  onSave: (category: Partial<Category>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: number) => void;
}

export interface CategoryGridProps {
  categories: Category[];
  onCategoryAction: (action: string, categoryId: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: number) => void;
}

export interface CategoryTableProps {
  categories: Category[];
  onCategoryAction: (action: string, categoryId: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export interface CategoryActionsProps {
  onAddCategory: () => void;
  onImportCategories: () => void;
  onExportCategories: () => void;
  onBulkEdit: () => void;
}

export interface CategoryPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface CategoryFiltersProps {
  filters: CategoryFilters;
  onFiltersChange: (filters: CategoryFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

// Category and CategoryFilters are imported from ./category
