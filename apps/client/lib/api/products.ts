import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Products API Client - Product Management Operations
 * 
 * This file handles all product operations:
 * - Fetching products with filters
 * - Product CRUD operations
 * - Product availability checks
 * - Product search and categorization
 */

export interface ProductsResponse {
  products: any[];
  total: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  outletId?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Products API client for authenticated product operations
 */
export const productsApi = {
  /**
   * Get all products with optional filters and pagination
   */
  async getProducts(filters?: ProductFilters): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔍 getProducts called with filters:', filters);
    console.log('📡 API endpoint:', `/api/products?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/products?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`);
    return handleApiResponse(response);
  },

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ barcode });
    const response = await authenticatedFetch(`/api/products?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Check product availability
   */
  async checkAvailability(productId: string): Promise<ApiResponse<{ isAvailable: boolean; stock: number; renting: number }>> {
    const response = await authenticatedFetch(`/api/products/${productId}/availability`);
    return handleApiResponse(response);
  },

  /**
   * Create a new product
   */
  async createProduct(productData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return handleApiResponse(response);
  },

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, productData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return handleApiResponse(response);
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    return handleApiResponse(response);
  },

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/products/stats');
    return handleApiResponse(response);
  }
};
