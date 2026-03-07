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

export interface BatchProductAvailabilityRequest {
  // New format: array of { productId, quantity } - each product can have different quantity
  products?: Array<{
    productId: number;
    quantity: number;
  }>;
  // Legacy format: array of product IDs with single quantity for all
  productIds?: number[];
  quantity?: number; // Only used with legacy productIds format
  orderType?: 'RENT' | 'SALE'; // Default: 'RENT'
  startDate?: string; // Required for RENT orders
  endDate?: string; // Required for RENT orders
  date?: string; // YYYY-MM-DD format for backward compatibility (RENT only)
  includeTimePrecision?: boolean;
  timeZone?: string;
  outletId?: number; // Required for MERCHANT and ADMIN roles
}

export interface BatchProductAvailabilityResult extends ProductAvailabilityResponse {
  error?: string;
}

export interface BatchProductAvailabilityResponse {
  results: BatchProductAvailabilityResult[];
  summary: {
    totalProducts: number;
    availableProducts: number;
    unavailableProducts: number;
    errorProducts: number;
  };
  rentalPeriod: {
    startDate: string;
    endDate: string;
    durationMs: number;
    durationHours: number;
    durationDays: number;
  };
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
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString()); // Filter by merchant
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
   * Batch delete multiple products
   */
  async batchDeleteProducts(productIds: number[]): Promise<ApiResponse<{
    deleted: number;
    failed: number;
    total: number;
    deletedProducts?: Array<{ id: number; name: string }>;
    errors?: Array<{ id: number; name: string; error: string }>;
  }>> {
    const response = await authenticatedFetch(apiUrls.products.batchDelete, {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    });
    return await parseApiResponse<{
      deleted: number;
      failed: number;
      total: number;
      deletedProducts?: Array<{ id: number; name: string }>;
      errors?: Array<{ id: number; name: string; error: string }>;
    }>(response);
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
   * Check availability for multiple products at once (batch check)
   * Use case: Cart with multiple products, user changes pickup/return dates,
   * need to check availability for all products simultaneously
   */
  async checkBatchProductAvailability(
    request: BatchProductAvailabilityRequest
  ): Promise<ApiResponse<BatchProductAvailabilityResponse>> {
    const response = await authenticatedFetch(apiUrls.products.batchAvailability, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return await parseApiResponse<BatchProductAvailabilityResponse>(response);
  },

  /**
   * Bulk import products
   */
  async bulkImport(products: any[]): Promise<ApiResponse> {
    const response = await authenticatedFetch(apiUrls.products.bulkImport, {
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

  /**
   * Search products by image
   * 
   * @param formData - FormData containing:
   *   - image: File - Image file to search
   *   - limit?: number - Number of results (default: 20)
   *   - minSimilarity?: number - Minimum similarity threshold (default: 0.7)
   *   - categoryId?: number - Filter by category
   * 
   * @returns Products with similarity scores
   */
  async searchByImage(formData: FormData): Promise<ApiResponse<{
    products: Array<Product & { similarity: number; _debug?: any }>;
    total: number;
    queryImage: string;
  }>> {
    const response = await authenticatedFetch('/api/products/searchByImage', {
      method: 'POST',
      body: formData,
    });
    return await parseApiResponse<{
      products: Array<Product & { similarity: number; _debug?: any }>;
      total: number;
      queryImage: string;
    }>(response);
  },

};

/**
 * Search products by image (standalone function)
 * 
 * @param imageFile - Image file to search
 * @param options - Search options
 * @returns Products with similarity scores
 */
export async function searchProductsByImage(
  imageFile: File,
  options: {
    limit?: number;
    minSimilarity?: number;
    categoryId?: number;
    onProgress?: (progress: { stage: string; percentage: number }) => void;
  } = {}
): Promise<ApiResponse<{
  products: Array<Product & { similarity: number; _debug?: any }>;
  total: number;
  queryImage: string;
}>> {
  const perfStart = performance.now();
  const { onProgress } = options;
  
  console.log('\n🚀 ========================================');
  console.log('📊 IMAGE SEARCH PERFORMANCE ANALYSIS');
  console.log('========================================');
  console.log(`📂 Original file:`);
  console.log(`   - Name: ${imageFile.name}`);
  console.log(`   - Type: ${imageFile.type}`);
  console.log(`   - Size: ${(imageFile.size/1024).toFixed(1)}KB (${(imageFile.size/1024/1024).toFixed(2)}MB)`);
  
  // Stage 1: Compression (0-30%)
  console.log('\n🗜️  STAGE 1: Image Compression');
  console.log('─────────────────────────────');
  if (onProgress) {
    onProgress({ stage: 'compressing', percentage: 0 });
  }
  
  const compStart = performance.now();
  
  // Import compressImage dynamically to avoid issues
  let compressedFile = imageFile;
  try {
    const { compressImage } = await import('../api/upload');
    compressedFile = await compressImage(imageFile, {
      maxSizeMB: 0.1,          // 100KB max (enough for CLIP model)
      maxWidthOrHeight: 512,   // CLIP uses 224x224, so 512 is safe
      useWebWorker: true,      // Don't block UI
      quality: 0.8,           // Good quality
      onProgress: (p) => {
        if (onProgress) {
          onProgress({ stage: 'compressing', percentage: Math.round(p * 0.3) });
        }
        console.log(`   ⏳ Compressing... ${Math.round(p)}%`);
      }
    });
    
    const compDuration = performance.now() - compStart;
    const reductionPercent = Math.round((1 - compressedFile.size / imageFile.size) * 100);
    const savedKB = (imageFile.size - compressedFile.size) / 1024;
    
    console.log(`   ✅ Compression completed!`);
    console.log(`   ⏱️  Duration: ${compDuration.toFixed(0)}ms`);
    console.log(`   📦 Compressed size: ${(compressedFile.size/1024).toFixed(1)}KB`);
    console.log(`   💾 Saved: ${savedKB.toFixed(1)}KB (${reductionPercent}% reduction)`);
    console.log(`   🎯 Compression ratio: ${(imageFile.size / compressedFile.size).toFixed(2)}x`);
  } catch (error) {
    const compDuration = performance.now() - compStart;
    console.log(`   ❌ Compression failed after ${compDuration.toFixed(0)}ms`);
    console.warn('   ⚠️  Error:', error);
    console.log(`   📤 Using original file (${(imageFile.size/1024).toFixed(1)}KB)`);
    compressedFile = imageFile;
  }
  
  // Stage 2: API Call (30-90%)
  console.log('\n🌐 STAGE 2: API Upload & Processing');
  console.log('─────────────────────────────────────');
  if (onProgress) {
    onProgress({ stage: 'searching', percentage: 30 });
  }
  
  const formData = new FormData();
  formData.append('image', compressedFile);
  
  if (options.limit) {
    formData.append('limit', options.limit.toString());
  }
  
  if (options.minSimilarity) {
    formData.append('minSimilarity', options.minSimilarity.toString());
  }
  
  if (options.categoryId) {
    formData.append('categoryId', options.categoryId.toString());
  }

  console.log(`   📤 Uploading ${(compressedFile.size/1024).toFixed(1)}KB to Python API...`);
  console.log(`   🔍 Search params: limit=${options.limit || 20}, minSimilarity=${options.minSimilarity || 0.5}`);
  
  const apiStart = performance.now();
  const response = await productsApi.searchByImage(formData);
  const apiDuration = performance.now() - apiStart;
  
  console.log(`   ✅ API response received!`);
  console.log(`   ⏱️  API duration: ${apiDuration.toFixed(0)}ms`);
  
  // Parse response details if available
  if (response.success && response.data) {
    console.log(`   📊 Results: ${response.data.total || 0} products found`);
    
    // Log Python API performance if available
    const debugData = (response.data as any);
    if (debugData.embeddingDuration) {
      console.log(`   └─ Embedding generation: ${debugData.embeddingDuration}ms`);
    }
    if (debugData.searchDuration) {
      console.log(`   └─ Vector search: ${debugData.searchDuration}ms`);
    }
    if (debugData.fetchDuration) {
      console.log(`   └─ Database fetch: ${debugData.fetchDuration}ms`);
    }
    if (debugData.totalDuration) {
      console.log(`   └─ Python API total: ${debugData.totalDuration}ms`);
    }
  }
  
  // Stage 3: Results Processing (90-100%)
  console.log('\n📦 STAGE 3: Results Processing');
  console.log('─────────────────────────────────');
  if (onProgress) {
    onProgress({ stage: 'loading', percentage: 90 });
  }
  
  const processingStart = performance.now();
  
  // Results are already processed in response
  const processingDuration = performance.now() - processingStart;
  console.log(`   ⏱️  Processing: ${processingDuration.toFixed(0)}ms`);
  
  if (onProgress) {
    onProgress({ stage: 'loading', percentage: 100 });
  }
  
  // Final Summary
  const totalDuration = performance.now() - perfStart;
  const compDuration = compStart ? performance.now() - compStart : 0;
  
  console.log('\n⚡ PERFORMANCE SUMMARY');
  console.log('═════════════════════════════════════');
  console.log(`   1️⃣  Compression:     ${compDuration.toFixed(0)}ms (${((compDuration/totalDuration)*100).toFixed(1)}%)`);
  console.log(`   2️⃣  API Call:        ${apiDuration.toFixed(0)}ms (${((apiDuration/totalDuration)*100).toFixed(1)}%)`);
  console.log(`   3️⃣  Processing:      ${processingDuration.toFixed(0)}ms (${((processingDuration/totalDuration)*100).toFixed(1)}%)`);
  console.log(`   ⏱️  TOTAL:           ${totalDuration.toFixed(0)}ms`);
  console.log('═════════════════════════════════════\n');
  
  // Performance rating
  if (totalDuration < 2000) {
    console.log('   ⚡ Excellent performance!');
  } else if (totalDuration < 4000) {
    console.log('   ✅ Good performance');
  } else if (totalDuration < 6000) {
    console.log('   ⚠️  Slow performance - consider optimization');
  } else {
    console.log('   ❌ Very slow - needs optimization!');
  }
  
  return response;
}




