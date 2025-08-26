/**
 * Edit Order Page - Uses CreateOrderForm in edit mode
 * 
 * This page demonstrates the DRY principle by reusing CreateOrderForm
 * instead of maintaining a separate EditOrderForm component.
 * 
 * The CreateOrderForm automatically handles:
 * - Pre-populating form fields with existing order data
 * - Switching to edit mode UI and behavior
 * - Different button text and validation
 * - All form functionality for editing orders
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreateOrderForm, FormSkeleton, PageWrapper, PageContent } from '@rentalshop/ui';
import { 
  ordersApi, 
  customersApi, 
  productsApi, 
  outletsApi, 
  categoriesApi 
} from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import type { OrderDetailData } from '@rentalshop/types';

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Additional state for form data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [merchantId, setMerchantId] = useState<string>('');

  const orderNumber = params.orderNumber as string;
  
  // Extract numeric part from order number (e.g., "2110" from "ORD-2110")
  const numericOrderNumber = orderNumber.replace(/^ORD-/, '');

  useEffect(() => {
    if (!orderNumber) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await ordersApi.getOrderByNumber(`ORD-${numericOrderNumber}`);

        if (result.success) {
          console.log('Order data received:', result.data);
          setOrder(result.data);
          
          // Extract merchant ID from order
          let foundMerchantId = null;
          if (result.data.merchantId) {
            foundMerchantId = result.data.merchantId;
            console.log('Found merchantId in order:', foundMerchantId);
          } else if (result.data.outlet?.merchantId) {
            foundMerchantId = result.data.outlet.merchantId;
            console.log('Found merchantId in order.outlet:', foundMerchantId);
          } else if (result.data.outlet?.merchant?.id) {
            foundMerchantId = result.data.outlet.merchant.id;
            console.log('Found merchantId in order.outlet.merchant:', foundMerchantId);
          }
          
          if (foundMerchantId) {
            setMerchantId(foundMerchantId);
          } else {
            console.error('No merchantId found in order data');
            console.log('Order structure:', JSON.stringify(result.data, null, 2));
            
            // Fallback to user's merchant ID
            if (user?.merchant?.id) {
              console.log('Using fallback merchant ID from user context:', user.merchant.id);
              setMerchantId(user.merchant.id);
            } else {
              console.error('No merchant ID available from user context either');
            }
          }
        } else {
          setError(result.error || 'Failed to fetch order details');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('An error occurred while fetching order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderNumber, numericOrderNumber]);

  // Fetch additional data needed for the form
  useEffect(() => {
    if (!merchantId) {
      console.log('No merchantId available, skipping form data fetch');
      return;
    }

    console.log('Fetching form data for merchantId:', merchantId);

    const fetchFormData = async () => {
      try {
        console.log('Starting to fetch form data...');
        
        // Fetch customers
        const customersResult = await customersApi.getCustomers({ 
          merchantId, 
          limit: 100 
        });
        console.log('Customers result:', customersResult);
        if (customersResult.success && customersResult.data?.customers) {
          setCustomers(customersResult.data.customers);
          console.log('Set customers:', customersResult.data.customers.length);
        } else {
          console.error('Failed to fetch customers:', customersResult.error);
          // Set empty array as fallback
          setCustomers([]);
        }

        // Fetch products
        const productsResult = await productsApi.getProducts({ 
          merchantId, 
          limit: 100 
        });
        console.log('Products result:', productsResult);
        if (productsResult.success && productsResult.data?.products) {
          setProducts(productsResult.data.products);
          console.log('Set products:', productsResult.data.products.length);
        } else {
          console.error('Failed to fetch products:', productsResult.error);
        }

        // Fetch outlets
        const outletsResult = await outletsApi.getOutlets({ 
          merchantId 
        });
        console.log('Outlets result:', outletsResult);
        if (outletsResult.success && outletsResult.data?.outlets) {
          const mappedOutlets = outletsResult.data.outlets.map((outlet: any) => ({
            id: outlet.id,
            name: outlet.name
          }));
          setOutlets(mappedOutlets);
          console.log('Set outlets:', mappedOutlets.length);
        } else {
          console.error('Failed to fetch outlets:', outletsResult.error);
        }

        // Fetch categories
        const categoriesResult = await categoriesApi.getCategories({ 
          merchantId 
        });
        console.log('Categories result:', categoriesResult);
        if (categoriesResult.success && categoriesResult.data?.categories) {
          const mappedCategories = categoriesResult.data.categories.map((category: any) => ({
            id: category.id,
            name: category.name
          }));
          setCategories(mappedCategories);
          console.log('Set categories:', mappedCategories.length);
        } else {
          console.error('Failed to fetch categories:', categoriesResult.error);
        }
        
        console.log('Form data fetch completed');
      } catch (err) {
        console.error('Error fetching form data:', err);
        // Don't show error for form data, just log it
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Form data fetch timeout - forcing completion');
      // Set empty arrays to prevent infinite loading
      if (customers.length === 0) setCustomers([]);
      if (products.length === 0) setProducts([]);
      if (outlets.length === 0) setOutlets([]);
      if (categories.length === 0) setCategories([]);
    }, 10000); // 10 second timeout

    fetchFormData();

    return () => clearTimeout(timeoutId);
  }, [merchantId, customers.length, products.length, outlets.length, categories.length]);

  const handleSubmit = async (orderData: any) => {
    if (!order) return;

    try {
      setActionLoading(true);

      // Ensure we have the order ID for the update
      const orderId = order.id;
      if (!orderId) {
        throw new Error('Order ID not found');
      }

      // Add the order ID to the update data
      const updateData = {
        ...orderData,
        id: orderId
      };

      const result = await ordersApi.updateOrder(orderId, updateData);

      if (result.success) {
        // Redirect to order details page after successful update
        router.push(`/orders/${numericOrderNumber}`);
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/orders/${numericOrderNumber}`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <FormSkeleton />
        </PageContent>
      </PageWrapper>
    );
  }

  // Show loading state while fetching form data
  if (!merchantId) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <FormSkeleton />
        </PageContent>
      </PageWrapper>
    );
  }

  // Show loading state while fetching form data, but be more lenient
  const hasMinimalData = customers.length > 0 && products.length > 0 && outlets.length > 0;
  
  if (!hasMinimalData) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4 mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <FormSkeleton />
          <div className="mt-6 text-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Retry Loading
            </button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Order</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={() => router.back()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => router.push('/orders')} 
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View All Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for could not be found.</p>
            <div className="space-y-3">
              <button 
                onClick={() => router.back()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => router.push('/orders')} 
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View All Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <PageContent>
        <CreateOrderForm
          isEditMode={true}
          initialOrder={order}
          orderNumber={order.orderNumber}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={actionLoading}
          customers={customers}
          products={products}
          outlets={outlets}
          categories={categories}
          merchantId={merchantId}
        />
      </PageContent>
    </PageWrapper>
  );
}
