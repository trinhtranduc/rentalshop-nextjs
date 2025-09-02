'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Products,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import type { Product, ProductFilters, ProductData } from '@rentalshop/types';

interface ProductData {
  products: Product[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export default function MerchantProductsPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
  const [productData, setProductData] = useState<ProductData>({
    products: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    limit: 20,
    offset: 0
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId.toString());
      if (filters.outletId) queryParams.append('outletId', filters.outletId.toString());
      if (filters.available !== undefined) queryParams.append('available', filters.available.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/products?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProductData({
            products: data.data.products || [],
            total: data.data.total || 0,
            currentPage: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
            totalPages: Math.ceil((data.data.total || 0) / (filters.limit || 20)),
            hasMore: (filters.offset || 0) + (filters.limit || 20) < (data.data.total || 0)
          });
        } else {
          setError(data.message || 'Failed to fetch products');
        }
      } else {
        console.error('Failed to fetch products');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };
  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ limit: 20, offset: 0 });
  };

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
  };

  const handleProductAction = (action: string, productId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/products/${productId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/products/${productId}/edit`);
        break;
      case 'add':
        router.push(`/merchants/${merchantId}/products/add`);
        break;
      default:
        console.log('Product action:', action, productId);
    }
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filters.limit || 20);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleSort = (column: string) => {
    // Handle sorting logic
    console.log('Sort by:', column);
  };

  const handleProductCreated = async (product: any) => {
    // Handle product creation - would typically make API call
    console.log('Product created:', product);
    await fetchProducts(); // Refresh the list
  };

  const handleProductUpdated = async (product: Product) => {
    // Handle product update - would typically make API call
    console.log('Product updated:', product);
    await fetchProducts(); // Refresh the list
  };

  const handleError = (error: string) => {
    setError(error);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle subtitle={`Manage products for merchant ${merchantId}`}>
            Merchant Products
          </PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Loading products...</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle subtitle={`Manage products for merchant ${merchantId}`}>
            Merchant Products
          </PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8 text-red-500">Error: {error}</div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchant
            </Button>
            <PageTitle subtitle={`Manage products for merchant ${merchantId}`}>
              Merchant Products
            </PageTitle>
          </div>
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
          merchantId={parseInt(merchantId)}
          onProductCreated={handleProductCreated}
          onProductUpdated={handleProductUpdated}
          onError={handleError}
        />
      </PageContent>
    </PageWrapper>
  );
}
