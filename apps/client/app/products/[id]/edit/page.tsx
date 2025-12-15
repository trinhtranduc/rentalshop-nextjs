'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Card, 
  Button,
  ProductsLoading,
  PageWrapper,
  PageHeader,
  PageContent
} from '@rentalshop/ui';

import { ProductEdit } from '@rentalshop/ui';

import { ArrowLeft, Package } from 'lucide-react';
import { useAuth, useDedupedApi } from '@rentalshop/hooks';
import { 
  productsApi,
  categoriesApi, 
  outletsApi
} from "@rentalshop/utils";
import type { ProductWithStock, Category, Outlet } from '@rentalshop/types';
import type { ProductInput } from '@rentalshop/types';

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [merchantIdForOutlets, setMerchantIdForOutlets] = useState<number | null>(null);

  const productId = parseInt(params.id as string);

  // ============================================================================
  // FETCH PRODUCT DETAILS - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: productData, 
    loading: productLoading, 
    error: productError 
  } = useDedupedApi({
    filters: { productId, authLoading },
    fetchFn: async () => {
      // Wait for authentication to complete
      if (authLoading) {
        throw new Error('Waiting for authentication');
      }

      const productResponse = await productsApi.getProductById(productId);
      if (!productResponse.success || !productResponse.data) {
        throw new Error('Failed to fetch product');
      }
      return productResponse.data;
    },
    enabled: !!productId && !authLoading,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // ============================================================================
  // FETCH CATEGORIES - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: categoriesData 
  } = useDedupedApi({
    filters: {},
    fetchFn: async () => {
      const categoriesData = await categoriesApi.getCategories();
      if (!categoriesData.success) {
        throw new Error('Failed to fetch categories');
      }
      return categoriesData.data || [];
    },
    enabled: true,
    staleTime: 300000, // 5 minutes
    cacheTime: 600000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // ============================================================================
  // FETCH OUTLETS - Using Official useDedupedApi Hook
  // ============================================================================
  const resolvedMerchantId = user?.merchant?.id || user?.merchantId;
  const { 
    data: outletsData, 
    loading: outletsLoading,
    error: outletsError
  } = useDedupedApi({
    filters: { merchantId: resolvedMerchantId },
    fetchFn: async () => {
      if (!resolvedMerchantId || Number(resolvedMerchantId) <= 0) {
        throw new Error('Invalid merchant ID');
      }
      
      const outletsData = await outletsApi.getOutletsByMerchant(Number(resolvedMerchantId));
      if (!outletsData.success || !outletsData.data?.outlets) {
        throw new Error('Failed to load outlets');
      }
      
      const outletsList = outletsData.data.outlets;
      if (outletsList.length === 0) {
        throw new Error('No outlets found for your merchant. You need to create at least one outlet before you can edit products.');
      }
      
      return { outlets: outletsList };
    },
    enabled: !!resolvedMerchantId && !authLoading,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync data to local state
  const product = productData || null;
  const categories = categoriesData || [];
  const outlets = outletsData?.outlets || [];
  const loading = productLoading || outletsLoading;
  const error = productError ? productError.message : (outletsError ? outletsError.message : null);

  // Set merchantIdForOutlets when product is loaded
  useEffect(() => {
    if (product && resolvedMerchantId) {
      setMerchantIdForOutlets(Number(resolvedMerchantId));
    }
  }, [product, resolvedMerchantId]);

  const handleSave = async (data: ProductInput) => {
    try {
      // Transform ProductInput to ProductUpdateInput format
      const updateData = {
        ...data,
        id: productId,
        // Convert images array to string for API
        images: Array.isArray(data.images) ? data.images.join(',') : data.images || '',
        // Map totalStock to stock for API
        stock: data.totalStock,
      };
      
      console.log('🔍 Updating product with data:', updateData);
      
      // Call the update API
      await productsApi.updateProduct(productId, updateData);
      
      // Redirect to the product view page
      router.push(`/products/${productId}`);
    } catch (err) {
      // Re-throw the error to be handled by the form component
      throw err;
    }
  };

  const handleCancel = () => {
    router.push(`/products/${productId}`);
  };

  const handleBack = () => {
    router.push(`/products/${productId}`);
  };

  // Show loading while authentication is in progress
  if (authLoading) {
  return (
    <PageWrapper>
      {/* Page Loading Indicator - Floating, non-blocking */}
      <PageLoadingIndicator loading={loading} />
      <PageHeader>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">Edit Product</h1>
          </div>
        </PageHeader>
        <PageContent>
          <ProductsLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error || !product) {
    return (
      <PageWrapper>
        <PageContent>
          <Card>
            <div className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
              <p className="text-muted-foreground mb-4">
                {error || 'The product you are trying to edit could not be found.'}
              </p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Products
                </Button>
              </div>
            </div>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Page Loading Indicator - Floating, non-blocking */}
      <PageLoadingIndicator loading={loading} />
      <PageHeader>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Product
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <ProductEdit
          product={product}
          categories={categories}
          outlets={outlets}
          merchantId={merchantIdForOutlets || 0}
          onSave={handleSave}
          onCancel={handleCancel}
          onBack={handleBack}
        />
      </PageContent>
    </PageWrapper>
  );
}
