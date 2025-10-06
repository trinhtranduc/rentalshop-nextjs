"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagination } from './usePagination';
import { useThrottledSearch } from './useThrottledSearch';
import { useSimpleErrorHandler } from './useToast';
import { productsApi, isErrorResponse } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { Product, ProductWithDetails, ProductWithStock, ProductFilters, ProductCreateInput, ProductUpdateInput } from '@rentalshop/types';

export interface UseProductManagementOptions {
  initialLimit?: number;
  useSearchProducts?: boolean; // true for admin (searchProducts), false for client (getProductsPaginated)
  enableStats?: boolean; // true for admin, false for client
  merchantId?: number; // For merchant-specific product management
  outletId?: number; // For outlet-specific product management
}

export interface UseProductManagementReturn {
  // State
  products: Product[];
  loading: boolean;
  searchTerm: string;
  categoryFilter: string;
  outletFilter: string;
  availabilityFilter: string;
  statusFilter: string;
  selectedProduct: Product | ProductWithStock | null;
  showProductDetail: boolean;
  showCreateForm: boolean;
  showEditDialog: boolean;
  showOrdersDialog: boolean;
  pagination: any;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (category: string) => void;
  setOutletFilter: (outlet: string) => void;
  setAvailabilityFilter: (availability: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  setShowProductDetail: (show: boolean) => void;
  setShowCreateForm: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
  setShowOrdersDialog: (show: boolean) => void;
  
  // Handlers
  fetchProducts: (page?: number) => Promise<void>;
  handleViewProduct: (product: Product) => void;
  handleEditProduct: (product: Product) => void;
  handleToggleStatus: (product: Product) => void;
  handleProductUpdated: (updatedProduct: Product) => void;
  handleProductError: (error: string) => void;
  handleProductRowAction: (action: string, productId: number) => void;
  handleAddProduct: () => void;
  handleExportProducts: () => void;
  handleFiltersChange: (newFilters: ProductFilters) => void;
  handleSearchChange: (searchValue: string) => void;
  handleClearFilters: () => void;
  handlePageChangeWithFetch: (page: number) => void;
  handleProductCreated: (productData: ProductCreateInput) => Promise<void>;
  handleProductUpdatedAsync: (productData: ProductUpdateInput) => Promise<void>;
  
  // Computed values
  filteredProducts: Product[];
  filters: ProductFilters;
  stats?: any;
}

export const useProductManagement = (options: UseProductManagementOptions = {}): UseProductManagementReturn => {
  const {
    initialLimit = PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchProducts = false,
    enableStats = false,
    merchantId,
    outletId
  } = options;

  // Add error handling
  const { handleError } = useSimpleErrorHandler();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | ProductWithStock | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  
  // Pagination state using shared hook
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });

  // Throttled search for better performance
  const { query: searchTerm, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 300,
    minLength: 0,
    onSearch: (query: string) => {
      // Trigger search when throttled search completes
      fetchProducts(1, query, categoryFilter, outletFilter, availabilityFilter, statusFilter);
    }
  });

  // Fetch products function - stable reference to prevent multiple calls
  const fetchProducts = useCallback(async (page: number = pagination.currentPage, searchQuery: string = '', category: string = 'all', outlet: string = 'all', availability: string = 'all', status: string = 'all') => {
    try {
      setLoading(true);
      
      let response;
      
      if (useSearchProducts) {
        // Admin page uses searchMerchantProducts with filters
        const filters: ProductFilters = {
          search: searchQuery || undefined,
          categoryId: category !== 'all' ? parseInt(category) : undefined,
          outletId: outlet !== 'all' ? parseInt(outlet) : undefined,
          available: availability === 'in-stock' ? true : 
                    availability === 'out-of-stock' ? false : undefined,
          status: status !== 'all' ? (status as 'active' | 'inactive') : undefined,
          // Add pagination parameters
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          page: page
        };
        
        // Use merchant-specific API for admin context
        if (merchantId) {
          response = await productsApi.searchMerchantProducts(merchantId, filters);
        } else {
          // Fallback to regular searchProducts for client context
          response = await productsApi.searchProducts(filters);
        }
      } else {
        // Client page uses getProductsPaginated
        response = await productsApi.getProductsPaginated(page, pagination.limit);
      }
      
      if (response.success && response.data) {
        // Handle different response structures
        let productsData: Product[];
        let total: number;
        let totalPagesCount: number;
        
        if (Array.isArray(response.data)) {
          // Direct array response
          productsData = response.data;
          total = response.data.length;
          totalPagesCount = 1;
        } else if (response.data.products) {
          // Nested response structure
          productsData = response.data.products;
          total = response.data.total || 0;
          totalPagesCount = response.data.totalPages || 1;
        } else {
          // Fallback
          productsData = [];
          total = 0;
          totalPagesCount = 1;
        }
        
        setProducts(productsData);
        
        // Update pagination state using the hook
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      } else if (isErrorResponse(response)) {
        console.error('API Error:', response.message);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      handleError(error); // Show error toast
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, useSearchProducts, updatePaginationFromResponse, merchantId]);

  // Initial fetch and refetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handlePageChange(1);
      fetchProducts(1, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [categoryFilter, outletFilter, availabilityFilter, statusFilter, handlePageChange]);

  // Filter products based on current filters
  const filteredProducts = useMemo(() => {
    if (useSearchProducts) {
      // Admin page: API handles filtering, return all products
      return products;
    } else {
      // Client page: Apply local filtering
      return (products || []).filter(product => {
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
    }
  }, [products, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter, useSearchProducts]);

  // Calculate stats if enabled
  const stats = useMemo(() => {
    if (!enableStats) return undefined;
    
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
  }, [products, enableStats]);

  // Create filters object for components
  const filters: ProductFilters = useMemo(() => ({
    search: searchTerm,
    categoryId: categoryFilter === 'all' ? undefined : parseInt(categoryFilter),
    available: availabilityFilter === 'in-stock' ? true : 
               availabilityFilter === 'out-of-stock' ? false : undefined,
    status: statusFilter === 'all' ? undefined : statusFilter as any
  }), [searchTerm, categoryFilter, availabilityFilter, statusFilter]);

  // Event handlers
  const handleViewProduct = useCallback(async (product: Product) => {
    try {
      setLoading(true);
      // Fetch full product details with outlet stock information
      const response = await productsApi.getProduct(product.id);
      if (response.success && response.data) {
        setSelectedProduct(response.data);
        setShowProductDetail(true);
      } else if (isErrorResponse(response)) {
        console.error('Failed to fetch product details:', response.message);
        // Fallback to basic product info
        setSelectedProduct(product);
        setShowProductDetail(true);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      handleError(error); // Show error toast
      // Fallback to basic product info
      setSelectedProduct(product);
      setShowProductDetail(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  }, []);

  const handleToggleStatus = useCallback(async (product: Product) => {
    try {
      const updateData: ProductUpdateInput = {
        id: product.id,
        isActive: !product.isActive
      };
      
      const response = await productsApi.updateProduct(product.id, updateData);
      
      if (response.success) {
        fetchProducts(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update product status');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      handleError(error); // Show error toast
    }
  }, [fetchProducts]);

  const handleProductUpdated = useCallback((updatedProduct: Product) => {
    setShowEditDialog(false);
    setShowProductDetail(false);
    fetchProducts(); // Refresh the list to get the latest data
  }, [fetchProducts]);

  const handleProductError = useCallback((error: string) => {
    console.error('Product operation error:', error);
  }, []);

  const handleProductRowAction = useCallback((action: string, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    switch (action) {
      case 'view':
        handleViewProduct(product);
        break;
      case 'view-orders':
        // Navigate to product orders page instead of opening dialog
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          
          // Check if we're in admin/merchant context
          const merchantMatch = currentPath.match(/\/merchants\/(\d+)/);
          if (merchantMatch) {
            // Admin/merchant context - navigate to merchant route
            const merchantId = merchantMatch[1];
            window.location.href = `/merchants/${merchantId}/products/${productId}/orders`;
          } else {
            // Client context - navigate to client route
            window.location.href = `/products/${productId}/orders`;
          }
        }
        break;
      case 'edit':
        handleEditProduct(product);
        break;
      case 'activate':
      case 'deactivate':
        handleToggleStatus(product);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [products, handleViewProduct, handleEditProduct, handleToggleStatus]);

  const handleAddProduct = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleExportProducts = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality coming soon!');
  }, []);

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    setCategoryFilter(newFilters.categoryId?.toString() || 'all');
    setOutletFilter(newFilters.outletId?.toString() || 'all');
    setAvailabilityFilter(
      newFilters.available === true ? 'in-stock' :
      newFilters.available === false ? 'out-of-stock' : 'all'
    );
    setStatusFilter(newFilters.status || 'all');
    handlePageChange(1);
  }, [handlePageChange]);

  const handleSearchChange = useCallback((searchValue: string) => {
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);

  const handleClearFilters = useCallback(() => {
    throttledSearchChange('');
    setCategoryFilter('all');
    setOutletFilter('all');
    setAvailabilityFilter('all');
    setStatusFilter('all');
    handlePageChange(1);
  }, [throttledSearchChange, handlePageChange]);

  const handlePageChangeWithFetch = useCallback((page: number) => {
    handlePageChange(page);
    fetchProducts(page, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter);
  }, [handlePageChange, fetchProducts, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter]);

  const handleProductCreated = useCallback(async (productData: ProductCreateInput) => {
    try {
      const response = await productsApi.createProduct(productData);
      if (response.success) {
        setShowCreateForm(false);
        fetchProducts(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      handleError(error); // Show error toast
      throw error; // Re-throw to let the form handle the error
    }
  }, [fetchProducts]);

  const handleProductUpdatedAsync = useCallback(async (productData: ProductUpdateInput) => {
    if (!selectedProduct) return;
    
    try {
      const response = await productsApi.updateProduct(selectedProduct.id, productData);
      if (response.success) {
        setShowEditDialog(false);
        fetchProducts(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [selectedProduct, fetchProducts]);

  return {
    // State
    products,
    loading,
    searchTerm,
    categoryFilter,
    outletFilter,
    availabilityFilter,
    statusFilter,
    selectedProduct,
    showProductDetail,
    showCreateForm,
    showEditDialog,
    showOrdersDialog,
    pagination,
    
    // Actions
    setSearchTerm: throttledSearchChange, // Use throttled search for better performance
    setCategoryFilter,
    setOutletFilter,
    setAvailabilityFilter,
    setStatusFilter,
    setSelectedProduct,
    setShowProductDetail,
    setShowCreateForm,
    setShowEditDialog,
    setShowOrdersDialog,
    
    // Handlers
    fetchProducts,
    handleViewProduct,
    handleEditProduct,
    handleToggleStatus,
    handleProductUpdated,
    handleProductError,
    handleProductRowAction,
    handleAddProduct,
    handleExportProducts,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleProductCreated,
    handleProductUpdatedAsync,
    
    // Computed values
    filteredProducts,
    filters,
    stats
  };
};
