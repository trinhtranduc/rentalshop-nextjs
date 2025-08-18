export interface Product {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  category: string;
  rentPrice: number;
  deposit: number;
  stock: number;
  renting: number;
  available: number;
  outletId: string;
  outletName: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  images?: string[]; // JSON array of image URLs from database
  createdAt: string;
  updatedAt: string;
}

// New interfaces for enhanced product management
export interface ProductWithDetails {
  id: string | number; // Now contains the public ID (numeric) from API
  name: string;
  description?: string;
  barcode?: string;
  categoryId: string;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  totalStock: number;
  images: string;
  isActive: boolean;
  outletStock: Array<{
    outletId: string;
    stock: number;
    available: number;
    renting: number;
  }>;
  category: { id: string; name: string };
  merchant: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

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

export interface ProductFilters {
  search: string;
  category: string;
  outlet: string;
  status: string;
  inStock: boolean;
  sortBy: 'name' | 'createdAt' | 'price' | 'stock';
  sortOrder: 'asc' | 'desc';
}

export interface ProductData {
  products: Product[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  count: number;
}

export interface ProductOutlet {
  id: string;
  name: string;
  count: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  totalValue: number;
  averageRentPrice: number;
}

export interface ProductAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'destructive';
  onClick: (productId: string) => void;
}

export interface ProductViewMode {
  value: 'grid' | 'table';
  label: string;
  icon: string;
}
