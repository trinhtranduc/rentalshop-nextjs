import { authenticatedFetch, parseApiResponse, ApiResponse } from '../core/server';
import { apiUrls } from '../config/api';
import type { Category, CategoryFilters } from '@rentalshop/types';

export interface CategoriesResponse {
  categories: Category[];
  total: number;
}

/**
 * Categories API client for category management operations
 */
export const categoriesApi = {
  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response = await authenticatedFetch(apiUrls.categories.list);
    const result = await parseApiResponse<Category[]>(response);
    return result;
  },

  /**
   * Get categories with pagination
   */
  async getCategoriesPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<CategoriesResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.categories.list}?${params.toString()}`);
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Search categories by name with filters
   */
  async searchCategories(filters: CategoryFilters): Promise<ApiResponse<CategoriesResponse>> {
    const params = new URLSearchParams();
    
    // Search by category name (primary)
    const searchQuery = filters.q || filters.search;
    if (searchQuery) params.append('q', searchQuery);
    
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    // Add pagination parameters
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.page) params.append('page', filters.page.toString());
    
    // Add sorting parameters
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const response = await authenticatedFetch(`${apiUrls.categories.list}?${params.toString()}`);
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Create a new category
   */
  async createCategory(categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await authenticatedFetch(apiUrls.categories.create, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<Category>(response);
  },

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: number, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await authenticatedFetch(apiUrls.categories.update(categoryId), {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<Category>(response);
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.categories.delete(categoryId), {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  }
};
