/**
 * Create Order Page for Admin - Uses CreateOrderForm for creating new orders
 * 
 * This page allows admin users to create new orders for a specific merchant.
 * It fetches merchant-specific data (customers, products, outlets) and 
 * provides them to the CreateOrderForm component.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { CreateOrderForm, 
  FormSkeleton, 
  PageWrapper, 
  PageHeader,
  PageTitle,
  PageContent, 
  useToast,
  Button } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { customersApi, productsApi, outletsApi, ordersApi, categoriesApi } from '@rentalshop/utils';
import type { CustomerSearchResult, ProductWithStock, Category } from '@rentalshop/types';
import type { OrderInput } from '@rentalshop/types';

export default function MerchantCreateOrderPage() {
  const params = useParams();
  const router = useRouter();
  
  const merchantId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Toast notifications
  const { toastSuccess, toastError, removeToast } = useToast();

  // Fetch form data needed for order creation
  useEffect(() => {
    if (!merchantId) {
      return;
    }

    let isMounted = true;

    const fetchFormData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAuthToken();
        if (!token) {
          setError('Authentication required');
          return;
        }

        // Fetch data using existing API modules
        const [customersRes, productsRes, outletsRes, categoriesRes] = await Promise.all([
          customersApi.getCustomers({ merchantId: Number(merchantId), isActive: true, limit: 50 }),
          productsApi.getProducts({ merchantId: Number(merchantId), isActive: true, limit: 100 }),
          outletsApi.getOutlets({ merchantId: Number(merchantId), isActive: true, limit: 50 }),
          categoriesApi.getCategories()
        ]);

        if (customersRes.success && customersRes.data) {
          if (isMounted) {
            setCustomers(customersRes.data);
          }
        } else {
          console.error('Failed to fetch customers:', customersRes.error);
        }

        if (productsRes.success && productsRes.data) {
          if (isMounted) {
            setProducts(productsRes.data);
          }
        } else {
          console.error('Failed to fetch products:', productsRes.error);
        }

        if (outletsRes.success && outletsRes.data?.outlets) {
          const mappedOutlets = outletsRes.data.outlets.map((outlet: { id: number; name: string }) => ({
            id: outlet.id,
            name: outlet.name
          }));
          if (isMounted) {
            setOutlets(mappedOutlets);
          }
        } else {
          console.error('Failed to fetch outlets:', outletsRes.error);
        }

        if (categoriesRes.success && categoriesRes.data) {
          if (isMounted) {
            setCategories(categoriesRes.data);
          }
        } else {
          console.error('Failed to fetch categories:', categoriesRes.error);
        }
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  const handleSubmit = async (orderData: OrderInput) => {
    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        toastError('Authentication required');
        return;
      }

      // Create order via API
      const result = await ordersApi.createOrder(orderData);

      if (result.success) {
        // Show success message
        toastSuccess('Order created successfully!');
        // Navigate back to merchant orders after successful creation
        router.push(`/merchants/${merchantId}/orders`);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      toastError('Failed to create order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/merchants/${merchantId}/orders`);
  };

  const handleBackToOrders = () => {
    router.push(`/merchants/${merchantId}/orders`);
  };

  const handleFormReady = (_resetFormFn: () => void) => {
    // Form is ready, but we don't need to store the reset function for now
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Create New Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse" />
          </div>
          <FormSkeleton />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Create New Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Form Data</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <div className="space-x-4">
              <Button
                onClick={handleBackToOrders}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Retry Loading
              </Button>
            </div>
          </div>
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
              onClick={handleBackToOrders}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <PageTitle>Create New Order</PageTitle>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        
        <CreateOrderForm
          isEditMode={false}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={actionLoading}
          customers={customers}
          products={products}
          outlets={outlets}
          categories={categories}
          merchantId={Number(merchantId)}
          onFormReady={handleFormReady}
        />
      </PageContent>
    </PageWrapper>
  );
}
