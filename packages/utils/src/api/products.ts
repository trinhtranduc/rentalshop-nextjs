import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { Product, ProductCreateInput, ProductUpdateInput, ProductFilters } from '@rentalshop/types';

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Products API client for product management operations
 */
export const productsApi = {
  /**
   * Get all products
   */
  async getProducts(): Promise<ApiResponse<Product[]>> {
    const response = await authenticatedFetch(apiUrls.products.list);
    const result = await parseApiResponse<Product[]>(response);
    return result;
  },

  /**
   * Get products with pagination
   */
  async getProductsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.products.list}?${params.toString()}`);
    return await parseApiResponse<ProductsResponse>(response);
  },

  /**
   * Search products with filters
   */
  async searchProducts(filters: ProductFilters): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    
    const response = await authenticatedFetch(`${apiUrls.products.list}?${params.toString()}`);
    return await parseApiResponse<Product[]>(response);
  },

  /**
   * Get product by ID
   */
  async getProduct(productId: number): Promise<ApiResponse<Product>> {
    const response = await authenticatedFetch(apiUrls.products.update(productId));
    return await parseApiResponse<Product>(response);
  },

  /**
   * Create a new product
   */
  async createProduct(productData: ProductCreateInput): Promise<ApiResponse<Product>> {
    const response = await authenticatedFetch(apiUrls.products.create, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return await parseApiResponse<Product>(response);
  },

  /**
   * Update an existing product
   */
  async updateProduct(productId: number, productData: ProductUpdateInput): Promise<ApiResponse<Product>> {
    const response = await authenticatedFetch(apiUrls.products.update(productId), {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return await parseApiResponse<Product>(response);
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.products.delete(productId), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: number): Promise<ApiResponse<Product[]>> {
    const response = await authenticatedFetch(`${apiUrls.products.list}?categoryId=${categoryId}`);
    return await parseApiResponse<Product[]>(response);
  },

  /**
   * Get products by outlet
   */
  async getProductsByOutlet(outletId: number): Promise<ApiResponse<Product[]>> {
    const response = await authenticatedFetch(`${apiUrls.products.list}?outletId=${outletId}`);
    return await parseApiResponse<Product[]>(response);
  },

  /**
   * Update product stock
   */
  async updateProductStock(productId: number, stock: number): Promise<ApiResponse<Product>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
    return await parseApiResponse<Product>(response);
  },

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates: Array<{ id: number; data: Partial<ProductUpdateInput> }>): Promise<ApiResponse<Product[]>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/products/bulk-update`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    return await parseApiResponse<Product[]>(response);
  }
};




