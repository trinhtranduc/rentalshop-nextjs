// ============================================================================
// PRODUCT ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  BaseEntityWithMerchant,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus,
  MerchantReference,
  OutletReference
} from '../common/base';

// ============================================================================
// CORE PRODUCT INTERFACES
// ============================================================================

/**
 * Main Product interface - consolidated from multiple sources
 * Combines products/product.ts and product-view.ts definitions
 */
export interface Product extends BaseEntityWithMerchant {
  // Core product fields
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number; // Required - every product must have a category
  rentPrice: number;
  salePrice?: number; // Optional sale price for direct purchase
  deposit: number;
  stock: number;
  renting: number;
  available: number; // Computed field: stock - renting
  isActive: boolean;
  images?: string;
  
  // Related entities (populated when needed)
  category?: CategoryReference;
  merchant?: MerchantReference;
  outletStock?: OutletStock[];
}

// ProductFrontend is no longer needed since Product now uses id: number

// ============================================================================
// PRODUCT REFERENCE TYPES
// ============================================================================

/**
 * Category reference interface
 * Used when only basic category info is needed
 */
export interface CategoryReference {
  id: number;
  name: string;
  description?: string;
}

/**
 * Outlet stock interface
 * Used for product stock management across outlets
 */
export interface OutletStock {
  id: number;
  outletId: number;
  stock: number;
  available: number;
  renting: number;
  outlet?: OutletReference;
}

// ============================================================================
// PRODUCT FORM INPUTS
// ============================================================================

/**
 * Product creation input
 * Used for creating new products
 */
export interface ProductCreateInput extends BaseFormInput {
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number; // Required - every product must have a category
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  totalStock: number;
  images?: string;
  outletStock: Array<{ // Required - every product must have outlet stock
    outletId: number;
    stock: number;
  }>;
}

/**
 * Product update input
 * Used for updating existing products
 */
export interface ProductUpdateInput extends BaseUpdateInput {
  name?: string;
  description?: string;
  barcode?: string;
  categoryId?: number;
  rentPrice?: number;
  deposit?: number;
  stock?: number;
  totalStock?: number;
  salePrice?: number;
  images?: string;
  isActive?: boolean;
}

// ============================================================================
// PRODUCT SEARCH AND FILTERS
// ============================================================================

/**
 * Product search parameters
 * Extends base search with product-specific filters
 */
export interface ProductSearchParams extends BaseSearchParams {
  merchantId?: number;
  categoryId?: number;
  outletId?: number; // Added outletId for filtering by outlet
  available?: boolean;
  status?: 'all' | 'active' | 'inactive';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
}

/**
 * Product search result
 * Extends base search result with product-specific data
 */
export interface ProductSearchResult extends BaseSearchResult<Product> {
  products: Product[]; // Alias for items for backward compatibility
}

/**
 * Product search response
 * Used for API responses with pagination
 */
export interface ProductSearchResponse {
  success: boolean;
  data: {
    products: ProductWithStock[];
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// ============================================================================
// PRODUCT WITH RELATIONS
// ============================================================================

/**
 * Product with stock information
 * Used for product listings with outlet stock details
 */
export interface ProductWithStock extends Product {
  category: CategoryReference;
  merchant: MerchantReference;
  outletStock: Array<{
    id: number;
    outletId: number;
    stock: number;
    available: number;
    renting: number;
    outlet: OutletReference;
  }>;
}

/**
 * Product with full details
 * Used for detailed product views
 */
export interface ProductWithDetails extends Product {
  category: CategoryReference;
  merchant: MerchantReference;
  outletStock: Array<{
    id: number;
    outletId: number;
    stock: number;
    available: number;
    renting: number;
    outlet: OutletReference;
  }>;
  // Additional detailed fields can be added here
  specifications?: Record<string, any>;
  features?: string[];
  tags?: string[];
}

// ============================================================================
// PRODUCT MANAGEMENT TYPES
// ============================================================================

/**
 * Product input interface
 * Used for database operations
 */
export interface ProductInput {
  merchantId: number; // Required - every product must belong to a merchant
  categoryId: number; // Required - every product must have a category
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string[];
  outletStock: Array<{ // Required - every product must have outlet stock
    outletId: number; // Required - every outlet stock must reference an outlet
    stock: number;
  }>;
}

/**
 * Outlet stock input interface
 * Used for outlet stock management
 */
export interface OutletStockInput {
  productId: number;
  outletId: number;
  stock: number;
  available?: number;
  renting?: number;
}

/**
 * Product action type
 * Used for product management actions
 */
export type ProductAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'manageStock';

// ============================================================================
// PRODUCT ANALYTICS TYPES
// ============================================================================

/**
 * Top product interface
 * Used for product analytics and reporting
 */
export interface TopProduct {
  id: number;
  name: string;
  rentPrice: number;
  category: string;
  rentalCount: number;
  totalRevenue: number;
  image?: string | null;
}

/**
 * Product performance metrics
 * Used for product performance analysis
 */
export interface ProductPerformance {
  productId: number;
  productName: string;
  category: string;
  totalRentals: number;
  totalRevenue: number;
  averageRentalDuration: number;
  utilizationRate: number;
  profitMargin: number;
}

/**
 * Product inventory summary
 * Used for inventory management
 */
export interface ProductInventorySummary {
  totalProducts: number;
  totalStock: number;
  availableStock: number;
  rentedStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  highPerformingProducts: number;
  lowPerformingProducts: number;
}

// ============================================================================
// PRODUCT SEARCH FILTERS - FOR API COMPATIBILITY
// ============================================================================

/**
 * Product search filter
 * Used for product search operations in API
 */
export interface ProductSearchFilter {
  q?: string;           // Search query parameter (consistent with orders)
  merchantId?: number;  // Changed from string to number
  categoryId?: number;  // Changed from string to number
  outletId?: number;    // Added outletId for filtering by outlet
  search?: string;      // Keep for backward compatibility
  page?: number;
  limit?: number;
  offset?: number;      // Add offset for pagination consistency
  isActive?: boolean;
  sortBy?: string;      // Add sorting support
  sortOrder?: 'asc' | 'desc';  // Add sorting support
  available?: boolean;  // Add availability filter
  status?: string;      // Add status filter
  minPrice?: number;    // Add price range filters
  maxPrice?: number;    // Add price range filters
}

// Alias for backward compatibility
export type ProductFilters = ProductSearchFilter;
