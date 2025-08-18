'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useAuth } from '../../../hooks/useAuth';
import { 
  createProduct,
  getCategories, 
  getOutlets 
} from '../../../lib/api/products';
import type { Category, Outlet } from '@rentalshop/ui';
import type { ProductInput } from '@rentalshop/database';
import { ProductAddForm } from '../../../../../packages/ui/src/components/features/Products/components';

export default function ProductAddPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories and outlets for the form
        const [categoriesData, outletsData] = await Promise.all([
          getCategories(),
          getOutlets(user?.merchant?.id)
        ]);
        
        console.log('📊 Fetched categories:', categoriesData);
        console.log('🏪 Fetched outlets:', outletsData);
        
        setCategories(categoriesData);
        setOutlets(outletsData);

      } catch (err) {
        console.error('Error fetching form data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async (data: ProductInput) => {
    try {
      // Call the create API
      const response = await createProduct(data);
      
      // Redirect to the new product view page
      router.push(`/products/${response.data.id}`);
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

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Add New Product</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading form data...</p>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Add New Product</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Failed to Load Form</h3>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Add New Product</PageTitle>
      </PageHeader>
      <PageContent>
        <ProductAddForm
          categories={categories}
          outlets={outlets}
          merchantId={user?.merchant?.id || ''}
          onSave={handleSave}
          onCancel={handleCancel}
          onBack={handleBack}
        />
      </PageContent>
    </PageWrapper>
  );
}
