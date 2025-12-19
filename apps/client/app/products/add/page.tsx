'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ProductsLoading,
  Button,
  LoadingIndicator,
  ProductAddDialog
} from '@rentalshop/ui';
import { useAuth, useProductTranslations, useCommonTranslations, useDedupedApi } from '@rentalshop/hooks';
import { 
  productsApi,
  categoriesApi,
  outletsApi
} from '@rentalshop/utils';
import type { Category, Outlet, ProductCreateInput } from '@rentalshop/types';

export default function ProductAddPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  // ============================================================================
  // RESOLVE MERCHANT ID
  // ============================================================================
  const resolvedMerchantId = user?.merchant?.id || user?.merchantId;
  const merchantId = resolvedMerchantId ? Number(resolvedMerchantId) : null;

  // ============================================================================
  // FETCH CATEGORIES - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError
  } = useDedupedApi({
    filters: {},
    fetchFn: async () => {
      const categoriesData = await categoriesApi.getCategories();
      if (!categoriesData.success) {
        throw new Error('Failed to load categories');
      }
      const categoriesList = categoriesData.data || [];
      if (categoriesList.length === 0) {
        throw new Error('No product categories found. You need to create at least one category before you can add products.');
      }
      return categoriesList;
    },
    enabled: !authLoading,
    staleTime: 300000, // 5 minutes
    cacheTime: 600000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // ============================================================================
  // FETCH OUTLETS - Using Official useDedupedApi Hook
  // ============================================================================
  const { 
    data: outletsData,
    loading: outletsLoading,
    error: outletsError
  } = useDedupedApi({
    filters: { merchantId },
    fetchFn: async () => {
      if (!merchantId || merchantId <= 0) {
        throw new Error('You must be associated with a merchant to create products. Please contact your administrator.');
      }
      
      const outletsData = await outletsApi.getOutletsByMerchant(merchantId);
      if (!outletsData.success || !outletsData.data?.outlets) {
        throw new Error('Failed to load outlets');
      }
      
      const outletsList = outletsData.data.outlets;
      if (outletsList.length === 0) {
        throw new Error('No outlets found for your merchant. You need to create at least one outlet before you can add products.');
      }
      
      return { outlets: outletsList };
    },
    enabled: !authLoading && !!merchantId,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync data to local state
  const categories = categoriesData || [];
  const outlets = outletsData?.outlets || [];
  const loading = categoriesLoading || outletsLoading;
  const error = categoriesError?.message || outletsError?.message || null;

  const handleProductCreated = async (productData: ProductCreateInput, files?: File[]) => {
    try {
      // Always use createProduct - it now always uses multipart form data (unified format)
      const response = await productsApi.createProduct(productData, files);
      
      // Redirect to the new product view page
      if (response.data?.id) {
        router.push(`/products/${response.data.id}`);
      } else {
        throw new Error('Product created but no ID returned');
      }
    } catch (err) {
      // Re-throw the error to be handled by the dialog component
      throw err;
    }
  };

  // Show loading while authentication is in progress
  if (authLoading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('createProduct')}</PageTitle>
        </PageHeader>
        <PageContent>
          <ProductsLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('createProduct')}</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Failed to Load Form</h3>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="link"
            >
              Try again
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

    // Check if both categories and outlets are available
  if (categories.length === 0 || outlets.length === 0) {
    const missingItems = [];
    if (categories.length === 0) missingItems.push('categories');
    if (outlets.length === 0) missingItems.push('outlets');
    
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('createProduct')}</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Missing Required Data</h3>
            <p className="text-muted-foreground mb-4">
              You need to set up {missingItems.join(' and ')} before you can add products. 
              {categories.length === 0 && ' Categories help organize your product catalog.'}
              {outlets.length === 0 && ' Outlets are required for inventory management.'}
            </p>
            <div className="flex justify-center space-x-4">
              {categories.length === 0 && (
                <Button 
                  onClick={() => router.push('/categories')} 
                  variant="link"
                >
                  Go to Categories
                </Button>
              )}
              {outlets.length === 0 && (
                <Button 
                  onClick={() => router.push('/outlets')} 
                  variant="link"
                >
                  Go to Outlets
                </Button>
              )}
              <Button 
                onClick={() => router.push('/products')} 
                variant="link"
              >
                {tc('buttons.back')}
              </Button>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Center Loading Indicator - Shows when waiting for API */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <LoadingIndicator 
            variant="circular" 
            size="lg"
            message={tc('labels.loading') || 'Loading form...'}
          />
        </div>
      )}
      <PageContent>
        {/* Use ProductAddDialog for consistency with other pages */}
        <ProductAddDialog
          open={true}
          onOpenChange={(open) => {
            // If dialog is closed, redirect back to products page
            if (!open) {
              router.push('/products');
            }
          }}
          categories={categories}
          outlets={outlets}
          merchantId={String(merchantId || '')}
          onProductCreated={handleProductCreated}
          onError={(error) => {
            // Error automatically handled by useGlobalErrorHandler
            console.error('❌ ProductAddDialog: Error occurred:', error);
          }}
          useMultipartUpload={true}
        />
      </PageContent>
    </PageWrapper>
  );
}
