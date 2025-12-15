'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ProductsLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Breadcrumb,
  Button,
  LoadingIndicator
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ProductOrdersView } from '@rentalshop/ui';
import { 
  Skeleton,
  StatsSkeleton,
  SearchSkeleton,
  TableSkeleton,
  PaginationSkeleton
} from '@rentalshop/ui';

import { ArrowLeft, Package } from 'lucide-react';
import { useAuth, useOrderTranslations, useCommonTranslations, useDedupedApi } from '@rentalshop/hooks';
import { 
  productsApi,
  categoriesApi,
  outletsApi
} from "@rentalshop/utils";
import type { ProductWithStock } from '@rentalshop/types';

export default function ProductOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  
  const productId = params.id as string;

  // ============================================================================
  // FETCH PRODUCT DETAILS - Using Official useDedupedApi Hook
  // ============================================================================
  // ✅ OFFICIAL PATTERN: useDedupedApi hook (inspired by TanStack Query & SWR)
  // This provides:
  // - Request deduplication (same request = single call)
  // - Global cache with stale-while-revalidate
  // - Race condition protection
  // - Automatic cleanup
  // - Prevents duplicate API calls from React 18 double mounting
  
  const { 
    data: productData, 
    loading, 
    error: productError 
  } = useDedupedApi({
    filters: { productId }, // Use productId as filter key for cache
    fetchFn: async () => {
      const productResponse = await productsApi.getProductById(parseInt(productId));
      
      if (!productResponse.success || !productResponse.data) {
        throw new Error('Failed to fetch product');
      }
      
      return productResponse.data;
    },
    enabled: !!productId, // Only fetch if productId exists
    staleTime: 60000, // 60 seconds cache
    cacheTime: 300000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if cache is fresh
    refetchOnWindowFocus: false
  });

  const product = productData || null;
  const error = productError ? productError.message : null;

  const handleBack = () => {
    router.push('/products');
  };

  // Show loading state while fetching product
  if (loading) {
    return (
      <PageWrapper>
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <LoadingIndicator 
            variant="circular" 
            size="lg"
            message={tc('labels.loading') || 'Loading product...'}
          />
        </div>
      </PageWrapper>
    );
  }

  // Only show error/not found AFTER loading is complete
  if (error || !product) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The product you are looking for could not be found.'}
            </p>
            <Button 
              onClick={handleBack}
              variant="default"
              size="sm"
            >
              {tc('buttons.back')}
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  const totalAvailable = product.outletStock.reduce((sum, os) => sum + os.available, 0);
  const totalRenting = product.outletStock.reduce((sum, os) => sum + os.renting, 0);
  const totalStock = product.outletStock.reduce((sum, os) => sum + os.stock, 0);

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Products', href: '/products' },
    { label: product.name, href: `/products/${productId}` },
    { label: 'Orders' }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} className="mb-6" />
      <PageContent>
        <ProductOrdersView
          productId={product.id.toString()}
          productName={product.name}
          onClose={handleBack}
          showHeader={false}
          inventoryData={{
            totalStock,
            totalRenting,
            totalAvailable
          }}
        />
      </PageContent>
    </PageWrapper>
  );
}
