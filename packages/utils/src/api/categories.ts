import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from '../common';

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

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
    const response = await authenticatedFetch('/api/categories');
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
    
    const response = await authenticatedFetch(`/api/categories?${params.toString()}`);
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Create a new category
   */
  async createCategory(categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await authenticatedFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<Category>(response);
  },

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: number, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<Category>(response);
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  }
};
