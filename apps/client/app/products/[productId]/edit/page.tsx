'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Card, 
  Button,
  ProductsLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';

import { ProductEdit } from '@rentalshop/ui';

import { ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  getProductById, 
  updateProduct,
  getCategories, 
  getOutlets 
} from '../../../../lib/api/products';
import type { ProductWithDetails, Category, Outlet } from '@rentalshop/ui';
import type { ProductInput } from '@rentalshop/database';

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productId = params.productId as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product details
        const productResponse = await getProductById(productId);
        setProduct(productResponse.data);

        // Fetch categories and outlets for the form
        const [categoriesData, outletsData] = await Promise.all([
          getCategories(),
          getOutlets()
        ]);
        
        setCategories(categoriesData);
        setOutlets(outletsData);

      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  const handleSave = async (data: ProductInput) => {
    try {
      // Call the update API
      await updateProduct(productId, data);
      
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

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Product</PageTitle>
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
        <PageHeader>
          <PageTitle>Edit Product</PageTitle>
        </PageHeader>
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
      <PageHeader>
        <PageTitle>Edit Product</PageTitle>
      </PageHeader>
      <PageContent>
        <ProductEdit
          product={product}
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
