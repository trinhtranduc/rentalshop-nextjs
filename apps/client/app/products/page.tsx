'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Button,
  Input,
  Products,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Pagination
} from '@rentalshop/ui';
import { Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Import types from the Products feature
import { ProductData, ProductFilters as ProductFiltersType } from '../../../../packages/ui/src/components/features/Products/types';

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
    name: string;
  };
  merchant: {
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
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
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

  useEffect(() => {
    fetchProducts();
  }, [currentPage, filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
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
            name: product.category?.name || '',
          },
          merchant: {
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
    }
  };

  const handleFiltersChange = (newFilters: ProductFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
  };

  const handleProductAction = async (action: string, productId: string) => {
    switch (action) {
      case 'edit':
        // Handle edit - you can implement this based on your needs
        console.log('Edit product:', productId);
        break;
      case 'delete':
        // Handle delete
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
        // Handle view - you can implement this based on your needs
        console.log('View product:', productId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
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
  };

  // Transform data for the Products component
  const productData: ProductData = {
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
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Products</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
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
              onClick={() => console.log('Add product')}
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
          onViewModeChange={handleViewModeChange}
          onProductAction={handleProductAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>
    </PageWrapper>
  );
} 