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
import { useAuth } from '@rentalshop/hooks';
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
  
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productId = parseInt(params.id as string);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Wait for authentication to complete
        if (authLoading) {
          return;
        }

        // Fetch product details
        const productResponse = await productsApi.getProductById(productId);
        if (productResponse.data) {
                  console.log('🔍 Product response:', productResponse.data);
        
        // The API now returns ProductWithStock directly, no transformation needed
        setProduct(productResponse.data);
        }

        // Debug: Log user and merchant info
        console.log('🔍 Edit Product - user:', user);
        console.log('🔍 Edit Product - user.merchant:', user?.merchant);
        console.log('🔍 Edit Product - user.merchantId:', user?.merchantId);
        console.log('🔍 Edit Product - user.role:', user?.role);
        console.log('🔍 Edit Product - product.merchant:', product?.merchant);
        
        // Check if user has proper merchant access (same logic as add product page)
        if (!user?.merchant?.id) {
          console.error('🔍 Edit Product - ERROR: User has no merchant ID!');
          console.error('🔍 Edit Product - user object:', user);
          throw new Error('You must be associated with a merchant to edit products. Please contact your administrator.');
        }
        
        // Use the same merchant ID resolution logic as add product page
        const merchantIdForOutlets = Number(user.merchant.id);
        console.log('🔍 Edit Product - merchantId for outlets:', merchantIdForOutlets);
        
        if (merchantIdForOutlets <= 0) {
          console.error('🔍 Edit Product - ERROR: Invalid merchant ID:', merchantIdForOutlets);
          throw new Error('Invalid merchant ID. Please contact your administrator.');
        }
        
        // Fetch categories and outlets for the form (same as add product page)
        const [categoriesData, outletsData] = await Promise.all([
          categoriesApi.getCategories(),
          outletsApi.getOutletsByMerchant(merchantIdForOutlets)
        ]);
        
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        }
        if (outletsData.success) {
          const outletsList = outletsData.data?.outlets || [];
          console.log('🔍 Edit Product - outlets data:', outletsData.data);
          console.log('🔍 Edit Product - outlets count:', outletsList.length);
          console.log('🔍 Edit Product - outlets array:', outletsList);
          setOutlets(outletsList);
          
          if (outletsList.length === 0) {
            setError('No outlets found for your merchant. You need to create at least one outlet before you can edit products.');
            setLoading(false);
            return;
          }
        } else {
          console.log('🔍 Edit Product - outlets fetch failed:', outletsData);
          setError('Failed to load outlets. Please try again.');
          setLoading(false);
          return;
        }

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
  }, [productId, authLoading]);

  const handleSave = async (data: ProductInput) => {
    try {
      // Transform ProductInput to ProductUpdateInput format
      const updateData = {
        ...data,
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

  if (loading) {
    return (
      <PageWrapper>
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
          merchantId={typeof user?.merchant?.id === 'number' ? user.merchant.id : 0}
          onSave={handleSave}
          onCancel={handleCancel}
          onBack={handleBack}
        />
      </PageContent>
    </PageWrapper>
  );
}
