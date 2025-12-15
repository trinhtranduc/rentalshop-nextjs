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
import { useAuth, useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productId = params.id as string;

  useEffect(() => {
    if (!productId) return;

    // Cancel previous request if still pending
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product details
        const productResponse = await productsApi.getProductById(parseInt(productId));
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        if (productResponse.success && productResponse.data) {
          setProduct(productResponse.data);
        }

      } catch (err: any) {
        // Ignore abort errors
        if (err?.name === 'AbortError') {
          return;
        }
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup: abort request on unmount or when productId changes
    return () => {
      abortController.abort();
    };
  }, [productId]);

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
