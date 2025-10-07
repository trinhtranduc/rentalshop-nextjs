'use client';

import React, { useState, useEffect } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ProductForm,
  useToast,
  Button , useToast } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import type { ProductInput } from '@rentalshop/types';

interface ProductDetailData {
  product: any;
  categories: Array<{ id: number; name: string }>;
  outlets: Array<{ id: number; name: string; address: string }>;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  const productId = params.productId as string;
  
  const { toastSuccess, toastError, removeToast } = useToast();
  
  const [productData, setProductData] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductData();
  }, [productId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.products.get(parseInt(merchantId), parseInt(productId));
      const data = await response.json();

      if (data.success) {
        setProductData(data.data);
      } else {
        setError(data.message || 'Failed to fetch product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      setError('Failed to fetch product details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: ProductInput) => {
    try {
      setSaving(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.products.update(parseInt(merchantId), parseInt(productId), formData);
      const data = await response.json();

      if (data.success) {
        toastSuccess('Product updated', 'Changes saved successfully.');
        // Navigate back to products list
        router.push(`/merchants/${merchantId}/products`);
      } else {
        const msg = data.message || 'Failed to update product';
        setError(msg);
        toastError('Update failed', msg);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product');
      toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/merchants/${merchantId}/products`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Product</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Loading product details...</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Product</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8 text-red-500">Error: {error}</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!productData) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Product</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Product not found</div>
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
              onClick={() => router.push(`/merchants/${merchantId}/products`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            <PageTitle>Edit Product</PageTitle>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        
        <ProductForm
          initialData={productData.product}
          categories={productData.categories}
          outlets={productData.outlets}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          title="Edit Product"
          submitText={saving ? 'Saving...' : 'Save Changes'}
          mode="edit"
          merchantId={merchantId}
        />
      </PageContent>
    </PageWrapper>
  );
}
