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

export interface ProductFilters {
  search: string;
  category: string;
  outlet: string;
  status: string;
  inStock: boolean;
  sortBy: 'name' | 'price' | 'stock' | 'createdAt';
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
