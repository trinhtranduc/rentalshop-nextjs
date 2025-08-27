// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: number;        // This represents the publicId from database
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number;  // Changed from string to number
  outletId: number;    // Changed from string to number
  merchantId: number;  // Changed from string to number
  rentPrice: number;
  deposit: number;
  stock: number;
  renting: number;
  available: number;
  isActive: boolean;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  barcode?: string;
  categoryId: number;  // Changed from string to number
  outletId: number;    // Changed from string to number
  rentPrice: number;
  deposit: number;
  stock: number;
  images?: string[];
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
  images?: string[];
  isActive?: boolean;
}

export interface ProductFilters {
  outletId?: number;    // Changed from string to number
  merchantId?: number;  // Changed from string to number
  categoryId?: number;  // Changed from string to number
  available?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
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
    id: number;        // Changed from string to number
    name: string;
  };
  merchant: {
    id: number;        // Changed from string to number
    name: string;
  };
  outletStock: Array<{
    id: number;        // Changed from string to number
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: number;      // Changed from string to number
      name: string;
    };
  }>;
}

export interface ProductSearchFilter {
  merchantId?: number;  // Changed from string to number
  outletId?: number;    // Changed from string to number
  categoryId?: number;  // Changed from string to number
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface ProductSearchResponse {
  success: boolean;
  data: {
    products: ProductWithStock[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Additional product types for database operations
export interface ProductInput {
  merchantId: number;   // Changed from string to number
  categoryId: number;   // Changed from string to number
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string[];
  outletStock?: Array<{
    outletId: number;   // Changed from string to number
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
