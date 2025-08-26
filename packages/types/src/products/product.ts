// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: number;        // This represents the publicId from database
  name: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  outletId: string;
  merchantId: string;
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
  categoryId?: string;
  outletId: string;
  rentPrice: number;
  deposit: number;
  stock: number;
  images?: string[];
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  rentPrice?: number;
  deposit?: number;
  stock?: number;
  totalStock?: number;
  salePrice?: number;
  images?: string[];
  isActive?: boolean;
}

export interface ProductFilters {
  outletId?: string;
  merchantId?: string;
  categoryId?: string;
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
    id: string;
    name: string;
  };
  merchant: {
    id: string;
    name: string;
  };
  outletStock: Array<{
    id: string;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: string;
      name: string;
    };
  }>;
}

export interface ProductSearchFilter {
  merchantId?: string;
  outletId?: string;
  categoryId?: string;
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
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string[];
  outletStock?: Array<{
    outletId: string;
    stock: number;
  }>;
}



export interface OutletStockInput {
  productId: string;
  outletId: string;
  stock: number;
  available?: number;
  renting?: number;
}
