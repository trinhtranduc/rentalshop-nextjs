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

export interface ProductAvailabilityRequest {
  startDate?: string;
  endDate?: string;
  quantity?: number;
  includeTimePrecision?: boolean;
  timeZone?: string;
  outletId?: number; // Required for MERCHANT and ADMIN roles
}

export interface ProductAvailabilityResponse {
  productId: number;
  productName: string;
  totalStock: number;
  totalAvailableStock: number;
  totalRenting: number;
  requestedQuantity: number;
  rentalPeriod?: {
    startDate: string;
    endDate: string;
    startDateLocal: string;
    endDateLocal: string;
    durationMs: number;
    durationHours: number;
    durationDays: number;
    timeZone: string;
    includeTimePrecision: boolean;
  };
  isAvailable: boolean;
  stockAvailable: boolean;
  hasNoConflicts: boolean;
  availabilityByOutlet: Array<{
    outletId: number;
    outletName: string;
    stock: number;
    available: number;
    renting: number;
    conflictingQuantity: number;
    effectivelyAvailable: number;
    canFulfillRequest: boolean;
    conflicts: Array<{
      orderNumber: string;
      customerName: string;
      pickupDate: string;
      returnDate: string;
      pickupDateLocal: string;
      returnDateLocal: string;
      quantity: number;
      conflictDuration: number;
      conflictHours: number;
      conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
    }>;
  }>;
  bestOutlet?: {
    outletId: number;
    outletName: string;
    effectivelyAvailable: number;
  };
  totalConflictsFound: number;
  message: string;
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
  /**
   * Create a new product
   * ALWAYS uses multipart form data for consistency between mobile and frontend
   * - Product data is sent as JSON string in 'data' field
   * - Files (if any) are sent in 'images' field
   * - Works even when no files are provided (empty images array)
   */
  async createProduct(productData: ProductCreateInput, files?: File[]): Promise<ApiResponse<Product>> {
    // Always use multipart form data for consistency
    const formData = new FormData();
    
    // Add product data as JSON string
    formData.append('data', JSON.stringify(productData));
    
    // Add files if provided
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('images', file);
      });
    }

    // Send multipart request
    const response = await authenticatedFetch(apiUrls.products.create, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header for FormData - browser will set it with boundary
    });
    
    return await parseApiResponse<Product>(response);
  },

  /**
   * @deprecated Use createProduct instead - it now always uses multipart form data
   * Kept for backward compatibility
   */
  async createProductWithFiles(productData: ProductCreateInput, files?: File[]): Promise<ApiResponse<Product>> {
    return this.createProduct(productData, files);
  },

  /**
   * Update an existing product
   * ALWAYS uses multipart form data for consistency with createProduct
   * - Product data is sent as JSON string in 'data' field
   * - Files (if any) are sent in 'images' field
   * - Works even when no files are provided (empty images array)
   */
  async updateProduct(productId: number, productData: ProductUpdateInput, files?: File[]): Promise<ApiResponse<Product>> {
    // Always use multipart form data for consistency
    const formData = new FormData();
    
    // Add product data as JSON string
    formData.append('data', JSON.stringify(productData));
    
    // Add files if provided
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('images', file);
      });
    }

    // Send multipart request
    const response = await authenticatedFetch(apiUrls.products.update(productId), {
      method: 'PUT',
      body: formData,
      // Don't set Content-Type header for FormData - browser will set it with boundary
    });
    
    return await parseApiResponse<Product>(response);
  },

  /**
   * Export products to Excel or CSV
   */
  async exportProducts(params: {
    period?: '1month' | '3months' | '6months' | '1year' | 'custom';
    startDate?: string;
    endDate?: string;
    format?: 'excel' | 'csv';
    productIds?: number[];
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.format) queryParams.append('format', params.format);
    
    // Add product IDs if provided
    if (params.productIds && params.productIds.length > 0) {
      params.productIds.forEach(id => {
        queryParams.append('productIds', id.toString());
      });
    }

    const url = `${apiUrls.products.export}?${queryParams.toString()}`;
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to export products');
    }
    
    return await response.blob();
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
  },

  /**
   * Check product availability with rental period and booking conflicts
   */
  async checkProductAvailability(
    productId: number, 
    request: ProductAvailabilityRequest = {}
  ): Promise<ApiResponse<ProductAvailabilityResponse>> {
    const params = new URLSearchParams();
    
    if (request.startDate) params.append('startDate', request.startDate);
    if (request.endDate) params.append('endDate', request.endDate);
    if (request.quantity !== undefined) params.append('quantity', request.quantity.toString());
    if (request.includeTimePrecision !== undefined) params.append('includeTimePrecision', request.includeTimePrecision.toString());
    if (request.timeZone) params.append('timeZone', request.timeZone);
    if (request.outletId !== undefined) params.append('outletId', request.outletId.toString());

    const url = `${apiUrls.products.availability(productId)}?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse<ProductAvailabilityResponse>(response);
  },

  /**
   * Bulk import products
   */
  async bulkImport(products: any[]): Promise<ApiResponse> {
    const response = await authenticatedFetch('/api/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ products }),
    });
    return await parseApiResponse<ApiResponse>(response);
  },

  /**
   * Import products from CSV (alias for bulkImport)
   */
  async importProducts(products: any[]): Promise<ApiResponse> {
    return this.bulkImport(products);
  },

  /**
   * Download sample file for import
   */
  async downloadSampleFile(): Promise<Blob> {
    const response = await authenticatedFetch('/api/import/sample/products');
    
    if (!response.ok) {
      throw new Error('Failed to download sample file');
    }
    
    return await response.blob();
  },

};




