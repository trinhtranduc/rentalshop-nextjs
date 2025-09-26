import { authenticatedFetch, parseApiResponse, ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { Category } from '@rentalshop/types';

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
