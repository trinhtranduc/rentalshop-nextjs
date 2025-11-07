'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  Products,
  Breadcrumb,
  type BreadcrumbItem
} from '@rentalshop/ui';
import { Package } from 'lucide-react';
import { merchantsApi } from '@rentalshop/utils';
import type { ProductFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT PRODUCTS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Breadcrumb navigation
 */
export default function MerchantProductsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [products, setProducts] = useState<any[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant info
      const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
      
      if (merchantData.success && merchantData.data) {
        setMerchantName(merchantData.data.name);
      }

      // Fetch products
      const productsRes = await merchantsApi.products.list(parseInt(merchantId));
      const productsData = await productsRes.json();
      console.log('📦 Products API response:', productsData);

      if (productsData.success) {
        // API returns data as direct array OR data.products
        const productsList = Array.isArray(productsData.data) 
          ? productsData.data 
          : productsData.data?.products || [];
        setProducts(productsList);
        console.log('📦 Products set, count:', productsList.length);
      } else {
        setError(productsData.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CLIENT-SIDE FILTERING & PAGINATION
  // ============================================================================
  
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (search) {
      filtered = filtered.filter((p: any) => 
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const order = sortOrder === 'desc' ? -1 : 1;
      return (aVal > bVal ? 1 : -1) * order;
    });
    
    return filtered;
  }, [products, search, sortBy, sortOrder]);

  const productData = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    
    return {
      products: paginatedProducts,
      total,
      page,
      currentPage: page,
      totalPages,
      limit,
      hasMore: endIndex < total
    };
  }, [filteredProducts, page, limit]);

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleProductAction = useCallback((action: string, productId: number) => {
    switch (action) {
      case 'view-orders':
        router.push(`/merchants/${merchantId}/products/${productId}/orders`);
        break;
      case 'view':
        router.push(`/merchants/${merchantId}/products/${productId}`);
        break;
      default:
        console.log('Product action:', action, productId);
    }
  }, [router, merchantId]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Products', icon: <Package className="w-4 h-4" /> }
  ], [merchantId, merchantName]);

  if (error) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Products</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const filters = { search, page, limit, sortBy, sortOrder };

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Products
          data={productData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onProductAction={handleProductAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
          title="Merchant Products"
          subtitle={`Manage products for ${merchantName}`}
          showExportButton={false} // Export feature - temporarily hidden, will be enabled in the future
          showAddButton={true}
          addButtonText="Add Product"
          exportButtonText="Export Products"
          showStats={true}
        />
      </div>
    </PageWrapper>
  );
}
