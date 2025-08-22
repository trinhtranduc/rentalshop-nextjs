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
import { ProductDetail } from '@rentalshop/ui';

import { Edit, ArrowLeft, Package, BarChart3 } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import { 
  getProductById, 
  getCategories, 
  getOutlets 
} from '@rentalshop/utils';
import type { ProductWithDetails, Category, Outlet } from '@rentalshop/ui';

export default function ProductViewPage() {
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

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`);
  };

  const handleViewOrders = () => {
    // Navigate to product orders page
    router.push(`/products/${productId}/vieworders`);
  };

  const handleBack = () => {
    router.push('/products');
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Product Details</PageTitle>
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
          <PageTitle>Product Details</PageTitle>
        </PageHeader>
        <PageContent>
          <Card>
            <div className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
              <p className="text-muted-foreground mb-4">
                {error || 'The product you are looking for could not be found.'}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <PageTitle>{product.name}</PageTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleViewOrders}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Product Statistics
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <ProductDetail
          product={product}
          onEdit={handleEdit}
          showActions={false} // Actions are in the header
          isMerchantAccount={true} // Show merchant features
          className="max-w-7xl mx-auto"
        />
      </PageContent>
    </PageWrapper>
  );
}
