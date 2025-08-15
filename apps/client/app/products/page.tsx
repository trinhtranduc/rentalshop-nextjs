'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { ProductFormDialog } from '../../../../packages/ui/src/components/features/Products/components/ProductFormDialog';

// Import types from the Products feature
import { 
  ProductData, 
  ProductFilters as ProductFiltersType,
  ProductWithDetails,
  Category,
  Outlet
} from '../../../../packages/ui/src/components/features/Products/types';

// Extend the Product type for this page
interface ExtendedProduct {
  id: string;
  name: string;
  description?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
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

export default function ProductsPage() {
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
  
  // State for enhanced functionality
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<ProductWithDetails | null>(null);
  
  // Initialize filters
  const [filters, setFilters] = useState<ProductFiltersType>({
    search: '',
    category: 'all',
    outlet: 'all',
    status: 'all',
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
        ...(filters.outlet && { outlet: filters.outlet }),
        ...(filters.status && { status: filters.status }),
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
          id: product.id,
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
  }, [currentPage, searchQuery, filters.category, filters.outlet, filters.status, filters.inStock, filters.sortBy, filters.sortOrder, setProducts, setTotalProducts, setTotalPages, setLoading, setIsSearching, isInitialLoad, hasInitializedRef]);

  const fetchCategories = useCallback(async () => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch('/api/categories');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCategories(data.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            isActive: cat.isActive
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [setCategories]);

  const fetchOutlets = useCallback(async () => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch('/api/outlets');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.outlets) {
          setOutlets(data.data.outlets.map((outlet: any) => ({
            id: outlet.id,
            name: outlet.name
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  }, [setOutlets]);

  // Effect for initial load and categories/outlets - only runs once
  useEffect(() => {
    if (isMerchantLevel) {
      fetchCategories();
      fetchOutlets();
    }
  }, [isMerchantLevel]); // Remove fetchCategories and fetchOutlets dependencies

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
  }, [searchQuery, currentPage, filters.category, filters.outlet, filters.status, filters.inStock, filters.sortBy, filters.sortOrder]); // Remove fetchProducts dependency

  // Separate handler for search changes - only updates search state
  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchQuery(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for other filter changes - only reloads table data
  const handleFiltersChange = useCallback((newFilters: ProductFiltersType) => {
    // Check if the filters actually changed to prevent unnecessary updates
    const hasChanged = Object.keys(newFilters).some(key => 
      newFilters[key as keyof ProductFiltersType] !== filters[key as keyof ProductFiltersType]
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
      outlet: 'all',
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

  // Transform ExtendedProduct to ProductWithDetails - memoized to prevent recreation
  const transformToProductWithDetails = useCallback((product: ExtendedProduct): ProductWithDetails => ({
    id: product.id,
    name: product.name,
    description: product.description || '',
    barcode: '',
    categoryId: product.category.id,
    rentPrice: product.rentPrice,
    salePrice: product.salePrice,
    deposit: product.deposit,
    totalStock: product.totalStock,
    images: product.images || '',
    isActive: true,
    outletStock: product.outletStock.map(os => ({
      outletId: os.outlet.id,
      stock: os.stock,
      available: os.available,
      renting: os.renting
    })),
    category: { id: product.category.id, name: product.category.name },
    merchant: { id: product.merchant.id, name: product.merchant.name },
    createdAt: new Date(),
    updatedAt: new Date()
  }), []);

  const handleProductAction = useCallback(async (action: string, productId: string) => {
    switch (action) {
      case 'edit':
        // Find the product and open edit dialog
        const productToEdit = products.find(p => p.id === productId);
        if (productToEdit) {
          setEditingProduct(transformToProductWithDetails(productToEdit));
          setIsEditDialogOpen(true);
        }
        break;
      case 'delete':
        // Handle delete
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            const { authenticatedFetch } = await import('@rentalshop/utils');
            const response = await authenticatedFetch(`/api/products?productId=${productId}`, {
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
        // Find the product and open view dialog
        const productToView = products.find(p => p.id === productId);
        if (productToView) {
          setViewingProduct(transformToProductWithDetails(productToView));
          setIsViewDialogOpen(true);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [products, transformToProductWithDetails, fetchProducts, setIsEditDialogOpen, setIsViewDialogOpen]);

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

  // Handle product creation success
  const handleProductCreated = useCallback((product: ProductWithDetails) => {
    console.log('Product created:', product);
    setIsAddDialogOpen(false);
    fetchProducts(); // Refresh the list
  }, [fetchProducts]);

  // Handle product update success
  const handleProductUpdated = useCallback((product: ProductWithDetails) => {
    console.log('Product updated:', product);
    setIsEditDialogOpen(false);
    fetchProducts(); // Refresh the list
  }, [fetchProducts]);

  // Handle errors
  const handleError = useCallback((error: string) => {
    console.error('Product operation error:', error);
    // You could show a toast notification here
  }, []);

  // Transform data for the Products component - memoized to prevent unnecessary re-renders
  const productData: ProductData = useMemo(() => ({
    products: products.map(product => ({
      id: product.id,
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
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
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
                    // Enhanced props for product management
          categories={categories}
          outlets={outlets}
          merchantId={user?.merchant?.id || ''}
          onProductCreated={handleProductCreated}
          onProductUpdated={handleProductUpdated}
          onError={handleError}
        />
      </PageContent>

      {/* Add Product Dialog */}
      {isMerchantLevel && (
        <ProductFormDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          product={null}
          categories={categories}
          outlets={outlets}
          merchantId={user?.merchant?.id || ''}
          onSuccess={handleProductCreated}
          onError={handleError}
        />
      )}

      {/* Edit Product Dialog */}
      {isMerchantLevel && editingProduct && (
        <ProductFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          product={editingProduct}
          categories={categories}
          outlets={outlets}
          merchantId={user?.merchant?.id || ''}
          onSuccess={handleProductUpdated}
          onError={handleError}
        />
      )}

      {/* View Product Dialog - You can create a custom view dialog or use the form dialog in read-only mode */}
      {viewingProduct && (
        <ProductFormDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          product={viewingProduct}
          categories={categories}
          outlets={outlets}
          merchantId={user?.merchant?.id || ''}
          onSuccess={() => setIsViewDialogOpen(false)}
          onError={handleError}
        />
      )}
    </PageWrapper>
  );
} 