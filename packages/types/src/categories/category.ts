// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface Category {
  id: number;        // This represents the publicId from database
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CategorySearchResult {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategorySearchFilter {
  merchantId?: number;
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface CategorySearchResponse {
  success: boolean;
  data: CategorySearchResult;
  message?: string;
}
