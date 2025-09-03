import React from 'react';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ShoppingCart,
  Store
} from 'lucide-react';
import type { Product, ProductWithDetails } from '@rentalshop/types';

/**
 * Get product status badge configuration and component
 * @param isActive - Product active status
 * @returns JSX element for status badge
 */
export const getProductStatusBadge = (isActive: boolean) => {
  const statusConfig = {
    true: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
    false: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Inactive' }
  };
  
  const config = statusConfig[isActive.toString() as keyof typeof statusConfig];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Get product availability badge configuration and component
 * @param available - Available stock count
 * @param totalStock - Total stock count
 * @returns JSX element for availability badge
 */
export const getProductAvailabilityBadge = (available: number, totalStock: number) => {
  const stockPercentage = totalStock > 0 ? (available / totalStock) * 100 : 0;
  
  let config;
  if (available === 0) {
    config = { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Out of Stock' };
  } else if (stockPercentage < 25) {
    config = { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, text: 'Low Stock' };
  } else if (stockPercentage < 50) {
    config = { color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown, text: 'Limited Stock' };
  } else {
    config = { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'In Stock' };
  }
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Get product type badge configuration and component
 * @param product - Product object
 * @returns JSX element for product type badge
 */
export const getProductTypeBadge = (product: Product | ProductWithDetails) => {
  const hasRentPrice = product.rentPrice && product.rentPrice > 0;
  const hasSalePrice = product.salePrice && product.salePrice > 0;
  
  let config;
  if (hasRentPrice && hasSalePrice) {
    config = { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Rent & Sale' };
  } else if (hasRentPrice) {
    config = { color: 'bg-purple-100 text-purple-800', icon: ShoppingCart, text: 'Rental Only' };
  } else if (hasSalePrice) {
    config = { color: 'bg-green-100 text-green-800', icon: DollarSign, text: 'Sale Only' };
  } else {
    config = { color: 'bg-gray-100 text-gray-800', icon: Package, text: 'No Pricing' };
  }
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Calculate product statistics from product array
 * @param products - Array of products
 * @returns Object with calculated statistics
 */
export const calculateProductStats = (products: Product[] | ProductWithDetails[]) => {
  const productsArray = products || [];
  const totalProducts = productsArray.length;
  const activeProducts = productsArray.filter(p => p.isActive).length;
  const inactiveProducts = productsArray.filter(p => !p.isActive).length;
  const inStockProducts = productsArray.filter(p => p.available > 0).length;
  const outOfStockProducts = productsArray.filter(p => p.available === 0).length;
  const lowStockProducts = productsArray.filter(p => p.available > 0 && p.available < 5).length;
  
  // Calculate total stock value
  const totalStockValue = productsArray.reduce((sum, product) => {
    const stockValue = product.available * (product.rentPrice || 0);
    return sum + stockValue;
  }, 0);
  
  // Calculate average price
  const productsWithPrice = productsArray.filter(p => p.rentPrice && p.rentPrice > 0);
  const averagePrice = productsWithPrice.length > 0 
    ? productsWithPrice.reduce((sum, p) => sum + (p.rentPrice || 0), 0) / productsWithPrice.length
    : 0;
  
  return { 
    totalProducts, 
    activeProducts, 
    inactiveProducts, 
    inStockProducts,
    outOfStockProducts,
    lowStockProducts,
    totalStockValue,
    averagePrice
  };
};

/**
 * Filter products based on search term, category, outlet, and availability
 * @param products - Array of products to filter
 * @param searchTerm - Search term for name, description, barcode
 * @param categoryFilter - Category filter ('all' or specific category ID)
 * @param outletFilter - Outlet filter ('all' or specific outlet ID)
 * @param availabilityFilter - Availability filter ('all', 'in-stock', 'out-of-stock', 'low-stock')
 * @param statusFilter - Status filter ('all', 'active', 'inactive')
 * @returns Filtered array of products
 */
export const filterProducts = (
  products: Product[] | ProductWithDetails[], 
  searchTerm: string, 
  categoryFilter: string,
  outletFilter: string,
  availabilityFilter: string,
  statusFilter: string
): (Product[] | ProductWithDetails[]) => {
  return (products || []).filter(product => {
    // Safety check to ensure product object has required properties
    if (!product || typeof product !== 'object') {
      return false;
    }
    
    const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check category - use categoryId for Product, category.id for ProductWithDetails
    const productCategoryId = 'category' in product ? (product as any).category?.id : product.categoryId;
    const matchesCategory = categoryFilter === 'all' || 
                           (productCategoryId && productCategoryId.toString() === categoryFilter);
    
    // Check outlet - only available in ProductWithDetails
    const productOutletId = 'outlet' in product ? (product as any).outlet?.id : undefined;
    const matchesOutlet = outletFilter === 'all' || 
                         (productOutletId && productOutletId.toString() === outletFilter);
    
    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'in-stock' && product.available > 0) ||
                               (availabilityFilter === 'out-of-stock' && product.available === 0) ||
                               (availabilityFilter === 'low-stock' && product.available > 0 && product.available < 5);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.isActive) ||
                         (statusFilter === 'inactive' && !product.isActive);
    
    return matchesSearch && matchesCategory && matchesOutlet && matchesAvailability && matchesStatus;
  });
};

/**
 * Format product price for display
 * @param price - Price value
 * @param currency - Currency code (default: USD)
 * @returns Formatted price string
 */
export const formatProductPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
};

/**
 * Get product's primary image URL
 * @param product - Product object
 * @returns Primary image URL or placeholder
 */
export const getProductImageUrl = (product: Product | ProductWithDetails): string => {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  return '/images/product-placeholder.png'; // Default placeholder
};

/**
 * Calculate product's stock percentage
 * @param available - Available stock
 * @param totalStock - Total stock
 * @returns Stock percentage (0-100)
 */
export const calculateStockPercentage = (available: number, totalStock: number): number => {
  if (totalStock === 0) return 0;
  return Math.round((available / totalStock) * 100);
};

/**
 * Get product's stock status text
 * @param available - Available stock
 * @param totalStock - Total stock
 * @returns Stock status text
 */
export const getProductStockStatus = (available: number, totalStock: number): string => {
  if (available === 0) return 'Out of Stock';
  if (available < 5) return 'Low Stock';
  if (available < totalStock * 0.5) return 'Limited Stock';
  return 'In Stock';
};

/**
 * Check if product can be rented
 * @param product - Product object
 * @returns Boolean indicating if product can be rented
 */
export const canRentProduct = (product: Product | ProductWithDetails): boolean => {
  return product.isActive && product.available > 0 && product.rentPrice && product.rentPrice > 0;
};

/**
 * Check if product can be sold
 * @param product - Product object
 * @returns Boolean indicating if product can be sold
 */
export const canSellProduct = (product: Product | ProductWithDetails): boolean => {
  return product.isActive && product.available > 0 && product.salePrice && product.salePrice > 0;
};

/**
 * Get product's display name with fallback
 * @param product - Product object
 * @returns Product display name
 */
export const getProductDisplayName = (product: Product | ProductWithDetails): string => {
  return product.name || 'Unnamed Product';
};

/**
 * Get product's category name with fallback
 * @param product - Product object
 * @returns Category name or 'Uncategorized'
 */
export const getProductCategoryName = (product: Product | ProductWithDetails): string => {
  return 'category' in product ? (product.category?.name || 'Uncategorized') : 'Uncategorized';
};

/**
 * Get product's outlet name with fallback
 * @param product - Product object
 * @returns Outlet name or 'No Outlet'
 */
export const getProductOutletName = (product: Product | ProductWithDetails): string => {
  return 'outlet' in product ? (product.outlet?.name || 'No Outlet') : 'No Outlet';
};

/**
 * Sort products by various criteria
 * @param products - Array of products
 * @param sortBy - Sort field ('name', 'price', 'stock', 'createdAt', 'updatedAt')
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Sorted array of products
 */
export const sortProducts = (
  products: Product[] | ProductWithDetails[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): (Product[] | ProductWithDetails[]) => {
  return [...products].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'price':
        aValue = a.rentPrice || 0;
        bValue = b.rentPrice || 0;
        break;
      case 'stock':
        aValue = a.available || 0;
        bValue = b.available || 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};
