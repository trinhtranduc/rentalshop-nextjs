import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { Product, ProductWithStock, ProductCreateInput, ProductUpdateInput, ProductFilters } from '@rentalshop/types';

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  offset: number;
  hasMore: boolean;
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
    
    if (filters.search) params.append('q', filters.search); // Use 'q' parameter like orders
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.available !== undefined) params.append('available', filters.available.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    
    // Add pagination parameters
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    // Add page parameter for consistency with user/customer search
    if (filters.page) params.append('page', filters.page.toString());
    
    // Add sorting parameters
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const response = await authenticatedFetch(`${apiUrls.products.list}?${params.toString()}`);
    return await parseApiResponse<Product[]>(response);
  },

  /**
   * Search products for a specific merchant (admin context)
   */
  async searchMerchantProducts(merchantId: number, filters: ProductFilters): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.available !== undefined) params.append('available', filters.available.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    
    // Add pagination parameters
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    // Add page parameter for consistency with user/customer search
    if (filters.page) params.append('page', filters.page.toString());
    
    const response = await authenticatedFetch(`${apiUrls.merchants.products.list(merchantId)}?${params.toString()}`);
    return await parseApiResponse<Product[]>(response);
  },

  /**
   * Get product by ID
   */
  async getProduct(productId: number): Promise<ApiResponse<ProductWithStock>> {
    const response = await authenticatedFetch(apiUrls.products.update(productId));
    return await parseApiResponse<ProductWithStock>(response);
  },

  /**
   * Get product by ID (alias for getProduct for backward compatibility)
   */
  async getProductById(productId: number): Promise<ApiResponse<ProductWithStock>> {
    return this.getProduct(productId);
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
    const response = await authenticatedFetch(apiUrls.products.updateStock(productId), {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
    return await parseApiResponse<Product>(response);
  },

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates: Array<{ id: number; data: Partial<ProductUpdateInput> }>): Promise<ApiResponse<Product[]>> {
    const response = await authenticatedFetch(apiUrls.products.bulkUpdate, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    return await parseApiResponse<Product[]>(response);
  }
};




