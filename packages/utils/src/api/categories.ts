import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from "../common";

/**
 * Categories API Client - Category Management Operations
 * 
 * This file handles all category operations:
 * - Fetching categories with filters
 * - Category CRUD operations
 * - Category hierarchy management
 * - Category statistics
 */

export interface CategoriesResponse {
  categories: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface CategoryFilters {
  search?: string;
  parentId?: string;
  merchantId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Categories API client for authenticated category operations
 */
export const categoriesApi = {
  /**
   * Get all categories with optional filters and pagination
   */
  async getCategories(filters?: CategoryFilters): Promise<ApiResponse<CategoriesResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔍 getCategories called with filters:', filters);
    console.log('📡 API endpoint:', `/api/categories?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/categories?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = await parseApiResponse<CategoriesResponse>(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<ApiResponse<CategoriesResponse>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}`);
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Get categories by parent ID (for hierarchical structure)
   */
  async getCategoriesByParent(parentId: string): Promise<ApiResponse<CategoriesResponse>> {
    const response = await authenticatedFetch(`/api/categories?parentId=${parentId}`);
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<ApiResponse<CategoriesResponse>> {
    const response = await authenticatedFetch('/api/categories?parentId=null');
    return await parseApiResponse<CategoriesResponse>(response);
  },

  /**
   * Create a new category
   */
  async createCategory(categoryData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: string, categoryData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get category products
   */
  async getCategoryProducts(categoryId: string, filters?: {
    search?: string;
    outletId?: string;
    available?: boolean;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/categories/${categoryId}/products?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get category statistics
   */
  async getCategoryStats(categoryId?: string): Promise<ApiResponse<any>> {
    const endpoint = categoryId ? `/api/categories/${categoryId}/stats` : '/api/categories/stats';
    const response = await authenticatedFetch(endpoint);
    return await parseApiResponse<any>(response);
  },

  /**
   * Move category to different parent
   */
  async moveCategory(categoryId: string, newParentId: string | null): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/categories/${categoryId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ parentId: newParentId }),
    });
    return await parseApiResponse<any>(response);
  }
};
