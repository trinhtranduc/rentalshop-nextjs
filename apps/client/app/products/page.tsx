'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Button,
  Input,
  Products,
  ProductsLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Pagination
} from '@rentalshop/ui';
import { Plus, Edit, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';


// Import types from the shared packages
import { 
  Product,
  ProductWithStock,
  ProductFilters,
  Category
} from '@rentalshop/types';

// Extend the Product type for this page
interface ExtendedProduct {
  id: number; // Now contains the public ID from API
  name: string;
  description?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  category: {
    id: number;
    name: string;
  };
  merchant: {
    id: number;
    name: string;
  };
  outletStock: Array<{
    id: number;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: number;
      name: string;
    };
  }>;
}

// Local interface for page-specific filters
interface ProductPageFilters {
  search: string;
  category: string;
  inStock: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Local interface for page-specific data structure
interface ProductPageData {
  products: Array<{
    id: string;
    name: string;
    description: string;
    barcode?: string;
    category: string;
    rentPrice: number;
    deposit: number;
    stock: number;
    renting: number;
    available: number;
    outletId: string;
    outletName: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMerchantLevel = user && ((user.role === 'ADMIN' && !user.outlet?.id) || user.role === 'MERCHANT');
  
  // State for products and UI
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Initialize filters
  const [filters, setFilters] = useState<ProductPageFilters>({
    search: '',
    category: 'all',
    inStock: false,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Separate search state to prevent unnecessary re-renders
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasInitializedRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    try {
      // Show appropriate loading state
      if (searchQuery !== undefined && hasInitializedRef.current) {
        setIsSearching(true); // Table-only loading for search operations
      } else if (!isInitialLoad) {
        setLoading(true); // Full page loading for other operations
      }
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(filters.category && { category: filters.category }),

        ...(filters.inStock && { inStock: 'true' }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await authenticatedFetch(`/api/products?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      
      if (data.success) {
        // Handle the new data structure with outletStock
        const transformedProducts: ExtendedProduct[] = data.data.products.map((product: any) => ({
          id: product.id, // This is now the public ID from the API
          name: product.name,
          description: product.description || '',
          totalStock: product.totalStock,
          rentPrice: product.rentPrice,
          salePrice: product.salePrice || undefined,
          deposit: product.deposit,
          images: product.images || '',
          category: {
            id: product.category?.id || '',
            name: product.category?.name || '',
          },
          merchant: {
            id: product.merchant?.id || '',
            name: product.merchant?.name || '',
          },
          outletStock: product.outletStock || []
        }));
        
        setProducts(transformedProducts);
        setTotalProducts(data.data.totalProducts || transformedProducts.length);
        setTotalPages(Math.ceil((data.data.totalProducts || transformedProducts.length) / 10));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setIsSearching(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, searchQuery, filters.category, filters.inStock, filters.sortBy, filters.sortOrder, setProducts, setTotalProducts, setTotalPages, setLoading, setIsSearching, isInitialLoad, hasInitializedRef]);



  // Effect for initial products load - only runs once
  useEffect(() => {
    fetchProducts();
    // Mark as initialized after first load
    hasInitializedRef.current = true;
  }, []); // Remove fetchProducts dependency

  // Effect for all data changes - intelligently handles search vs. other operations
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchProducts();
    }
  }, [searchQuery, currentPage, filters.category, filters.inStock, filters.sortBy, filters.sortOrder]); // Remove fetchProducts dependency

  // Separate handler for search changes - only updates search state
  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchQuery(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for other filter changes - only reloads table data
  const handleFiltersChange = useCallback((newFilters: ProductPageFilters) => {
    // Check if the filters actually changed to prevent unnecessary updates
    const hasChanged = Object.keys(newFilters).some(key => 
      newFilters[key as keyof ProductPageFilters] !== filters[key as keyof ProductPageFilters]
    );
    
    if (hasChanged) {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filters]);

  // Handler for clearing all filters - only reloads table data
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'all',
      status: 'all',
      inStock: false,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchQuery(''); // This will trigger the search effect to reload table
    setCurrentPage(1);
    // Don't call fetchProducts directly - let the search effect handle it
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    setViewMode(mode);
  }, []);



  const handleProductAction = useCallback(async (action: string, productId: number) => {
    switch (action) {
      case 'edit':
        // Navigate to edit page using public ID
        router.push(`/products/${productId}/edit`);
        break;
      case 'delete':
        // Handle delete using public ID
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            const { authenticatedFetch } = await import('@rentalshop/utils');
            const response = await authenticatedFetch(`/api/products/${productId}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // Refresh the product list
              fetchProducts();
            } else {
              console.error('Failed to delete product');
            }
          } catch (error) {
            console.error('Error deleting product:', error);
          }
        }
        break;
      case 'view':
        // Navigate to view page using public ID
        router.push(`/products/${productId}`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [router, fetchProducts]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    // Map column names to sort values
    const columnMapping: Record<string, 'name' | 'price' | 'stock' | 'createdAt'> = {
      'name': 'name',
      'category': 'name', // Sort by name for category column
      'rentPrice': 'price', // Sort by price for rentPrice column
      'available': 'stock', // Sort by stock for available column
      'status': 'name', // Sort by name for status column
      'outletName': 'name', // Sort by name for outlet column
      'price': 'price',
      'stock': 'stock',
      'createdAt': 'createdAt'
    };
    
    const newSortBy = columnMapping[column] || 'name';
    const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    
    setFilters(prev => ({
      ...prev,
      sortBy: newSortBy,
      sortOrder: newSortOrder
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [filters.sortBy, filters.sortOrder, setFilters, setCurrentPage]);



  // Transform data for the Products component - memoized to prevent unnecessary re-renders
  const productData: ProductWithStock[] = useMemo(() => ({
    products: products.map(product => ({
      id: product.id.toString(), // Use the ID from the API (now public ID)
      name: product.name,
      description: product.description || '',
      barcode: undefined,
      category: product.category.name,
      rentPrice: product.rentPrice,
      deposit: product.deposit,
      stock: product.totalStock,
      renting: product.outletStock.reduce((sum, os) => sum + os.renting, 0),
      available: product.outletStock.reduce((sum, os) => sum + os.available, 0),
      outletId: product.outletStock[0]?.outlet.id || '',
      outletName: product.outletStock[0]?.outlet.name || '',
      status: product.outletStock.reduce((sum, os) => sum + os.available, 0) > 0 ? 'active' : 'out_of_stock',
      createdAt: new Date().toISOString(), // Not available in current data
      updatedAt: new Date().toISOString()  // Not available in current data
    })),
    total: totalProducts,
    currentPage,
    totalPages,
    limit: 10
  }), [products, totalProducts, currentPage, totalPages]);

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Products</PageTitle>
        </PageHeader>
        <PageContent>
          <ProductsLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Products</PageTitle>
            <p className="text-gray-600">Manage your product catalog with outlet stock allocation</p>
          </div>
          {isMerchantLevel && (
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  // TODO: Implement export functionality
                  alert('Export functionality coming soon!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
              <Button 
                onClick={() => router.push('/products/add')}
                className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
        <Products
          data={productData}
          filters={filters}
          viewMode={viewMode}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onViewModeChange={handleViewModeChange}
          onProductAction={handleProductAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>


    </PageWrapper>
  );
} 