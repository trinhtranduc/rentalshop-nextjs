import { Product, ProductFilters, ProductData } from './types';

export const filterProducts = (products: Product[], filters: ProductFilters): Product[] => {
  return products.filter(product => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(searchLower) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }
    
    // Outlet filter
    if (filters.outlet && product.outletId !== filters.outlet) {
      return false;
    }
    
    // Status filter
    if (filters.status && product.status !== filters.status) {
      return false;
    }
    
    // Price range filter
    if (filters.minPrice && product.rentPrice < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice && product.rentPrice > filters.maxPrice) {
      return false;
    }
    
    // Stock filter
    if (filters.inStock && product.available <= 0) {
      return false;
    }
    
    return true;
  });
};

export const sortProducts = (products: Product[], sortBy: string, sortOrder: 'asc' | 'desc'): Product[] => {
  return [...products].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'price':
        aValue = a.rentPrice;
        bValue = b.rentPrice;
        break;
      case 'stock':
        aValue = a.available;
        bValue = b.available;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

export const paginateProducts = (products: Product[], page: number, limit: number): ProductData => {
  const total = products.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = products.slice(startIndex, endIndex);
  
  return {
    products: paginatedProducts,
    total,
    currentPage: page,
    totalPages,
    limit
  };
};

export const calculateProductStats = (products: Product[]) => {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const outOfStock = products.filter(p => p.status === 'out_of_stock').length;
  const totalValue = products.reduce((sum, p) => sum + (p.rentPrice * p.stock), 0);
  const averageRentPrice = totalProducts > 0 ? totalValue / totalProducts : 0;
  
  return {
    totalProducts,
    activeProducts,
    outOfStock,
    totalValue,
    averageRentPrice
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const getProductStatusColor = (status: string): string => {
  const colors = {
    active: 'text-green-600 dark:text-green-400',
    inactive: 'text-gray-600 dark:text-gray-400',
    out_of_stock: 'text-red-600 dark:text-red-400'
  };
  return colors[status as keyof typeof colors] || colors.inactive;
};

export const getProductStatusBadge = (status: string): string => {
  const badges = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };
  return badges[status as keyof typeof badges] || badges.inactive;
};

export const validateProductData = (product: Partial<Product>): string[] => {
  const errors: string[] = [];
  
  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (!product.category || product.category.trim().length === 0) {
    errors.push('Product category is required');
  }
  
  if (product.rentPrice === undefined || product.rentPrice < 0) {
    errors.push('Rent price must be a positive number');
  }
  
  if (product.stock === undefined || product.stock < 0) {
    errors.push('Stock must be a positive number');
  }
  
  if (product.deposit === undefined || product.deposit < 0) {
    errors.push('Deposit must be a positive number');
  }
  
  return errors;
};
