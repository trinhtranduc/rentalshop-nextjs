'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ProductsLoading,
  Button
} from '@rentalshop/ui';
import { useAuth, useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { 
  productsApi,
  categoriesApi,
  outletsApi
} from '@rentalshop/utils';
import type { Category, Outlet, ProductCreateInput } from '@rentalshop/types';
import { ProductAddForm } from '@rentalshop/ui';

export default function ProductAddPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<number | null>(null);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Wait for authentication to complete
        if (authLoading) {
          return;
        }

        // Check if user has merchant ID (try both merchant.id and merchantId)
        const resolvedMerchantId = user?.merchant?.id || user?.merchantId;
        if (!resolvedMerchantId) {
          setError('You must be associated with a merchant to create products. Please contact your administrator.');
          setLoading(false);
          return;
        }

        setMerchantId(Number(resolvedMerchantId));

        console.log('🔍 Product Add - User merchant info:', {
          'user.merchant': user?.merchant,
          'user.merchantId': user?.merchantId,
          'resolved merchantId': resolvedMerchantId
        });

        // Fetch categories and outlets for the form
        const [categoriesData, outletsData] = await Promise.all([
          categoriesApi.getCategories(),
          outletsApi.getOutletsByMerchant(Number(resolvedMerchantId))
        ]);
        
        if (categoriesData.success) {
          const categoriesList = categoriesData.data || [];
          setCategories(categoriesList);
          
          if (categoriesList.length === 0) {
            setError('No product categories found. You need to create at least one category before you can add products.');
            setLoading(false);
            return;
          }
        } else {
          setError('Failed to load categories. Please try again.');
          setLoading(false);
          return;
        }
        
        if (outletsData.success) {
          const outletsList = outletsData.data?.outlets || [];
          setOutlets(outletsList);
          
          if (outletsList.length === 0) {
            setError('No outlets found for your merchant. You need to create at least one outlet before you can add products.');
            setLoading(false);
            return;
          }
        } else {
          setError('Failed to load outlets. Please try again.');
          setLoading(false);
          return;
        }

      } catch (err) {
        console.error('Error fetching form data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading]);

  const handleSave = async (data: ProductCreateInput) => {
    try {
      // Call the create API
      const response = await productsApi.createProduct(data);
      
      // Redirect to the new product view page
      if (response.data?.id) {
        router.push(`/products/${response.data.id}`);
      } else {
        throw new Error('Product created but no ID returned');
      }
    } catch (err) {
      // Re-throw the error to be handled by the form component
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  const handleBack = () => {
    router.push('/products');
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

  if (loading) {
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
      <PageContent>
        <ProductAddForm
          categories={categories}
          outlets={outlets}
          merchantId={String(merchantId)}
          onSave={handleSave}
          onCancel={handleCancel}
          onBack={handleBack}
        />
      </PageContent>
    </PageWrapper>
  );
}
