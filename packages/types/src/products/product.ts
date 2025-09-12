// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: number;        // This represents the publicId from database
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number;  // Required - every product must have a category
  merchantId: number;  // Required - every product must belong to a merchant
  rentPrice: number;
  salePrice?: number;  // Optional sale price for direct purchase
  deposit: number;
  stock: number;
  renting: number;
  available: number;
  isActive: boolean;
  images?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number;  // Required - every product must have a category
  rentPrice: number;
  salePrice: number;
  deposit: number;
  totalStock: number;
  images?: string;
  outletStock: Array<{  // Required - every product must have outlet stock
    outletId: number;
    stock: number;
  }>;
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  barcode?: string;
  categoryId?: number;  // Changed from string to number
  rentPrice?: number;
  deposit?: number;
  stock?: number;
  totalStock?: number;
  salePrice?: number;
  images?: string;
  isActive?: boolean;
}

export interface ProductFilters {
  q?: string;           // Search query parameter (consistent with orders)
  merchantId?: number;  // Changed from string to number
  categoryId?: number;  // Changed from string to number
  outletId?: number;    // Added outletId for filtering by outlet
  available?: boolean;
  status?: 'all' | 'active' | 'inactive';  // Added missing status property
  search?: string;      // Keep for backward compatibility
  minPrice?: number;
  maxPrice?: number;
  limit?: number;       // Add pagination support
  offset?: number;      // Add pagination support
  page?: number;        // Add page parameter for consistency
  sortBy?: string;      // Add sorting support
  sortOrder?: 'asc' | 'desc';  // Add sorting support
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Extended product types for search and API responses
export interface ProductWithStock extends Product {
  category: {
    id: number;        // Required - every product must have a category
    publicId: number;  // Database returns publicId
    name: string;
  };
  merchant: {
    id: number;        // Required - every product must belong to a merchant
    publicId: number;  // Database returns publicId
    name: string;
  };
  outletStock: Array<{
    id: number;        // Required - every product must have outlet stock
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: number;      // Required - every outlet stock must reference an outlet
      publicId: number; // Database returns publicId
      name: string;
      address?: string; // Outlet address for display
    };
  }>;
}

// Product with full details for detailed views
export interface ProductWithDetails extends Product {
  category: {
    id: number;        // Required - every product must have a category
    publicId: number;  // Database returns publicId
    name: string;
  };
  merchant: {
    id: number;        // Required - every product must belong to a merchant
    publicId: number;  // Database returns publicId
    name: string;
  };
  outletStock: Array<{
    id: number;        // Required - every product must have outlet stock
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: number;      // Required - every outlet stock must reference an outlet
      publicId: number; // Database returns publicId
      name: string;
      address?: string; // Outlet address for display
    };
  }>;
}

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
  minPrice?: number;    // Add price range filters
  maxPrice?: number;    // Add price range filters
}

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

// Additional product types for database operations
export interface ProductInput {
  merchantId: number;   // Required - every product must belong to a merchant
  categoryId: number;   // Required - every product must have a category
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string[];
  outletStock: Array<{  // Required - every product must have outlet stock
    outletId: number;   // Required - every outlet stock must reference an outlet
    stock: number;
  }>;
}

export interface OutletStockInput {
  productId: number;    // Changed from string to number
  outletId: number;     // Changed from string to number
  stock: number;
  available?: number;
  renting?: number;
}

// Top Product interface for analytics
export interface TopProduct {
  id: number;
  name: string;
  rentPrice: number;
  category: string;
  rentalCount: number;
  totalRevenue: number;
  image?: string | null;
}
