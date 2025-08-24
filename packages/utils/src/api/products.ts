import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from '../common';

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
  merchantId?: string;
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
    
    const result = await parseApiResponse<ProductsResponse>(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get product by ID (supports both public ID and internal ID)
   */
  async getProductById(productId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get product by public ID (numeric ID like 1, 2, 3)
   */
  async getProductByPublicId(publicId: number): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${publicId}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ barcode });
    const response = await authenticatedFetch(`/api/products?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Check product availability
   */
  async checkAvailability(productId: string): Promise<ApiResponse<{ isAvailable: boolean; stock: number; renting: number }>> {
    const response = await authenticatedFetch(`/api/products/${productId}/availability`);
    return await parseApiResponse<{ isAvailable: boolean; stock: number; renting: number }>(response);
  },

  /**
   * Create a new product
   */
  async createProduct(productData: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, productData: Partial<any>): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/products/stats');
    return await parseApiResponse<any>(response);
  }
};

// Additional functions needed for the new pages
export const getCategories = async (): Promise<Category[]> => {
  const response = await authenticatedFetch('/api/categories');
  const result = await parseApiResponse<Category[]>(response);
  return result.data || [];
};

export const getOutlets = async (merchantId?: string): Promise<Outlet[]> => {
  const params = new URLSearchParams();
  if (merchantId) {
    params.append('merchantId', merchantId);
  }
  
  const response = await authenticatedFetch(`/api/outlets?${params.toString()}`);
  const result = await parseApiResponse<Outlet[]>(response);
  return result.data || [];
};

// Type definitions for the additional functions
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Outlet {
  id: string;
  name: string;
}
