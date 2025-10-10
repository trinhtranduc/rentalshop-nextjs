// ============================================================================
// CATEGORY ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  BaseEntityWithMerchant,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus
} from '../common/base';

// ============================================================================
// CORE CATEGORY INTERFACES
// ============================================================================

/**
 * Main Category interface - consolidated from multiple sources
 * Combines categories/category.ts and category-management.ts definitions
 */
export interface Category extends BaseEntityWithMerchant {
  // Core category fields
  name: string;
  description?: string;
  isActive: boolean;
  
  // Related entities (populated when needed)
  merchant?: {
    id: number;
    name: string;
  };
}

// ============================================================================
// CATEGORY FORM INPUTS
// ============================================================================

/**
 * Category creation input
 * Used for creating new categories
 */
export interface CategoryCreateInput extends BaseFormInput {
  name: string;
  description?: string;
  isActive?: boolean;
  merchantId: number;
}

/**
 * Category update input
 * Used for updating existing categories
 */
export interface CategoryUpdateInput extends BaseUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// CATEGORY SEARCH AND FILTERS
// ============================================================================

/**
 * Category search parameters
 * Extends base search with category-specific filters
 */
export interface CategorySearchParams extends BaseSearchParams {
  merchantId?: number;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Category search result
 * Extends base search result with category-specific data
 */
export interface CategorySearchResult extends BaseSearchResult<Category> {
  categories: Category[]; // Alias for items for backward compatibility
}

/**
 * Category search response
 * Used for API responses with pagination
 */
export interface CategorySearchResponse {
  success: boolean;
  data: CategorySearchResult;
  message?: string;
}

// ============================================================================
// CATEGORY MANAGEMENT TYPES
// ============================================================================

/**
 * Category data interface for management views
 * Used in category management components
 */
export interface CategoryData {
  categories: Category[];
  currentPage: number;
  totalPages: number;
  total: number;
}

/**
 * Category action type
 * Used for category management actions
 */
export type CategoryAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';

/**
 * Category action interface
 * Used for category action buttons
 */
export interface CategoryActionItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  onClick: () => void;
}

// ============================================================================
// CATEGORY FORM TYPES
// ============================================================================

/**
 * Category form data interface
 * Used for category forms
 */
export interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
}

/**
 * Category form errors interface
 * Used for form validation
 */
export interface CategoryFormErrors {
  name?: string;
  description?: string;
}

/**
 * Category form props interface
 * Used for category form components
 */
export interface CategoryFormProps {
  category?: Category | null;
  onSave: (category: Partial<Category>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

// ============================================================================
// CATEGORY COMPONENT TYPES
// ============================================================================

/**
 * Category card props interface
 * Used for category card components
 */
export interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: number) => void;
}

/**
 * Category grid props interface
 * Used for category grid components
 */
export interface CategoryGridProps {
  categories: Category[];
  onCategoryAction: (action: string, categoryId: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: number) => void;
}

/**
 * Category table props interface
 * Used for category table components
 */
export interface CategoryTableProps {
  categories: Category[];
  onCategoryAction: (action: string, categoryId: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

/**
 * Category actions props interface
 * Used for category action components
 */
export interface CategoryActionsProps {
  onAddCategory: () => void;
  onImportCategories: () => void;
  onExportCategories: () => void;
  onBulkEdit: () => void;
}

/**
 * Category pagination props interface
 * Used for category pagination components
 */
export interface CategoryPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Category filters props interface
 * Used for category filter components
 */
export interface CategoryFiltersProps {
  filters: CategorySearchParams;
  onFiltersChange: (filters: CategorySearchParams) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

// ============================================================================
// CATEGORY ANALYTICS TYPES
// ============================================================================

/**
 * Category statistics interface
 * Used for category analytics and reporting
 */
export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  categoriesWithProducts: number;
  topCategories: TopCategory[];
}

/**
 * Top category interface
 * Used for category analytics and reporting
 */
export interface TopCategory {
  id: number;
  name: string;
  productCount: number;
  totalRevenue: number;
  averageProductValue: number;
}

/**
 * Category performance metrics
 * Used for category performance analysis
 */
export interface CategoryPerformance {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalRevenue: number;
  averageProductValue: number;
  growthRate: number;
  utilizationRate: number;
}
